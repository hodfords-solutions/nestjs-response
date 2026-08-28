import { describe, expect, it } from 'vitest';
import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Metadata } from '@grpc/grpc-js';
import { Allow, IsOptional, ValidateNested } from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { ResponseInterceptor } from './response.interceptor.js';
import { RESPONSE_METADATA_KEY } from '../constants/metadata.constant.js';

/**
 * Minimal stand-in for `@AnyType()` from `@hodfords/nestjs-grpc-helper@>=11.3.7`:
 * runs both `__getData` (JSON.parse string → object) and `__sendData`
 * (JSON.stringify non-nullish → string) in a single transform call. The null
 * guard is what makes the single-pass `transform-then-validate` flow safe —
 * without it, `JSON.stringify(null)` would turn into the string `"null"`
 * before validation and break `@ValidateNested` + `@IsOptional`.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const AnyTypeStub = (): PropertyDecorator =>
    Transform(({ value, options }) => {
        const groups = options.groups ?? [];
        let next = value;
        if (groups.includes('__getData') && typeof next === 'string') {
            try {
                next = JSON.parse(next);
            } catch {
                /* keep raw */
            }
        }
        if (groups.includes('__sendData') && next !== null && next !== undefined) {
            next = JSON.stringify(next);
        }
        return next;
    });

class NestedDetailResponse {
    @Allow()
    name?: string;
}

class HistoryValueResponse {
    @AnyTypeStub()
    @Allow()
    value?: unknown;

    @AnyTypeStub()
    @IsOptional()
    @Type(() => NestedDetailResponse)
    @ValidateNested({ each: true })
    details?: NestedDetailResponse[] | null;
}

class HistoryMetadataResponse {
    @Type(() => HistoryValueResponse)
    @ValidateNested()
    before!: HistoryValueResponse;

    @Type(() => HistoryValueResponse)
    @ValidateNested()
    after!: HistoryValueResponse;
}

class HistoryResponse {
    @Allow()
    id!: string;

    @Type(() => HistoryMetadataResponse)
    @ValidateNested()
    metadata!: HistoryMetadataResponse;
}

function buildContextFor(responseClass: any, rpcContext: unknown): ExecutionContext {
    const handler = function findHistories() {};
    Reflect.defineMetadata(RESPONSE_METADATA_KEY, { responseClass, isArray: false, isAllowEmpty: false }, handler);
    return {
        getHandler: () => handler,
        switchToRpc: () => ({ getContext: () => rpcContext }),
        switchToHttp: () => undefined as any,
        switchToWs: () => undefined as any
    } as unknown as ExecutionContext;
}

function buildInterceptor(): ResponseInterceptor {
    const moduleRef = { get: () => undefined } as unknown as ModuleRef;
    return new ResponseInterceptor(moduleRef);
}

function buildPayload(): Record<string, any> {
    return {
        id: 'h-1',
        metadata: {
            before: { value: [{ a: 1 }, { a: 2 }], details: null },
            after: { value: [{ b: 1 }, { b: 2 }], details: null }
        }
    };
}

describe('ResponseInterceptor — HTTP path (`__getData` group)', () => {
    it('leaves `@AnyType` values untouched when they are already objects/arrays (the common case) so HTTP responses carry raw JSON', () => {
        const interceptor = buildInterceptor();
        const data = buildPayload();

        const result = interceptor.handleResponse(buildContextFor(HistoryResponse, {}), data) as any;

        expect(Array.isArray(result.metadata.before.value)).toBe(true);
        expect(result.metadata.before.value).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('runs `@AnyType` `__getData` JSON.parse so string-stored values (e.g. a JSONB column read as a string) are materialized before `@ValidateNested` iterates them', () => {
        const interceptor = buildInterceptor();
        const data = {
            id: 'h-1',
            metadata: {
                before: { value: 1, details: '[{"name":"alice"}]' },
                after: { value: 1, details: '[{"name":"bob"}]' }
            }
        };

        expect(() => interceptor.handleResponse(buildContextFor(HistoryResponse, {}), data)).not.toThrow();
        expect(Array.isArray((data as any).metadata.before.details)).toBe(true);
        expect((data as any).metadata.before.details).toEqual([{ name: 'alice' }]);
    });
});

describe('ResponseInterceptor — gRPC path (`__getData` + `__sendData` + `__grpc`)', () => {
    it('JSON.stringifies array `@AnyType` values so proto `string` fields receive valid JSON (not "[object Object],[object Object]")', () => {
        const interceptor = buildInterceptor();
        const data = buildPayload();

        const result = interceptor.handleResponse(buildContextFor(HistoryResponse, new Metadata()), data) as any;

        expect(typeof result.metadata.before.value).toBe('string');
        expect(JSON.parse(result.metadata.before.value)).toEqual([{ a: 1 }, { a: 2 }]);
        expect(typeof result.metadata.after.value).toBe('string');
        expect(JSON.parse(result.metadata.after.value)).toEqual([{ b: 1 }, { b: 2 }]);
    });

    it('leaves nullable nested fields as `null` so `@IsOptional` keeps skipping them — relies on the null/undefined-safe `__sendData` branch in `@AnyType` (nestjs-grpc-helper >= 11.3.7)', () => {
        const interceptor = buildInterceptor();
        const data = buildPayload();

        expect(() => interceptor.handleResponse(buildContextFor(HistoryResponse, new Metadata()), data)).not.toThrow();
        // null stays null after the single-pass transform. With pre-11.3.7 `@AnyType`
        // (no null guard) the value would have been the string `"null"` here and
        // `@ValidateNested` would have failed downstream.
        expect((data as any).metadata.before.details).toBeNull();
    });
});

/**
 * Polymorphic discriminator pattern: each block subtype is materialized via
 * `@Transform({ toClassOnly: true })` based on a runtime `type` field. The base
 * field is deliberately *not* pinned with `@Type(() => baseClass)` — pinning to a
 * base would strip subtype-specific properties under `whitelist`, so
 * `@ValidateNested` is expected to resolve each array element's class via the
 * runtime constructor of the materialized instance.
 *
 * This mirrors `@hplix/block-helper`'s `@BlockDiscriminator` and is the canonical
 * shape that broke between 11.1.3 and 11.1.4.
 */
class RichTextBlockDto {
    @Allow() type!: 'richText';
    @Allow() text!: string;
}

class DividerBlockDto {
    @Allow() type!: 'divider';
}

const blockDiscriminatorMap = new Map<string, new () => any>([
    ['richText', RichTextBlockDto],
    ['divider', DividerBlockDto]
]);

// eslint-disable-next-line @typescript-eslint/naming-convention
const BlockDiscriminatorStub = (): PropertyDecorator =>
    Transform(
        ({ value }) => {
            if (!Array.isArray(value)) return value;
            return value.map((item: any) => {
                const ctor = item?.type ? blockDiscriminatorMap.get(item.type) : undefined;
                return ctor ? plainToInstance(ctor, item) : item;
            });
        },
        { toClassOnly: true }
    );

class DocumentTemplateResponse {
    @Allow() id!: string;

    @BlockDiscriminatorStub()
    @IsOptional()
    @ValidateNested({ each: true })
    blocks?: any[];
}

describe('ResponseInterceptor — polymorphic discriminator runs before validation', () => {
    it('materializes discriminator-based polymorphic items via the `__getData` pre-pass so `@ValidateNested` can resolve nested constructors at runtime', () => {
        const interceptor = buildInterceptor();
        const data: Record<string, any> = {
            id: 'doc-1',
            blocks: [{ type: 'richText', text: 'hello' }, { type: 'divider' }]
        };

        // Without the `__getData` pre-pass, class-validator hits `blocks[0]` as a
        // plain object with no constructor and throws
        // `"an unknown value was passed to the validate function"`.
        expect(() => interceptor.handleResponse(buildContextFor(DocumentTemplateResponse, {}), data)).not.toThrow();
        expect(data.blocks[0]).toBeInstanceOf(RichTextBlockDto);
        expect(data.blocks[1]).toBeInstanceOf(DividerBlockDto);
    });
});
