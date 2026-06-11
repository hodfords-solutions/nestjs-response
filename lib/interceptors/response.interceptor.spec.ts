import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Metadata } from '@grpc/grpc-js';
import { Allow, IsOptional, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ResponseInterceptor } from './response.interceptor';
import { RESPONSE_METADATA_KEY } from '../constants/metadata.constant';
import { ResponseModel } from '../decorators/response-model.decorator';

/**
 * Minimal stand-in for `@AnyType()` from `@hodfords/nestjs-grpc-helper`: serializes
 * arbitrary JS values into a JSON string on the gRPC outgoing path (`__sendData`),
 * and parses them back on the gRPC incoming path (`__getData`).
 */
function AnyTypeStub(): PropertyDecorator {
    return Transform(({ value, options }) => {
        if (options.groups?.includes('__sendData')) {
            return JSON.stringify(value);
        }
        if (options.groups?.includes('__getData')) {
            if (typeof value !== 'string') return value;
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    });
}

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

function buildContext(rpcContext: unknown): ExecutionContext {
    const handler = function findHistories() {};
    Reflect.defineMetadata(
        RESPONSE_METADATA_KEY,
        { responseClass: HistoryResponse, isArray: false, isAllowEmpty: false },
        handler
    );
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

describe('ResponseInterceptor — gRPC outgoing transform group', () => {
    it('JSON.stringifies an array `@AnyType` value when the context is gRPC, so proto `string` fields receive valid JSON (not "[object Object],[object Object]")', () => {
        const interceptor = buildInterceptor();
        const data = buildPayload();

        const result = interceptor.handleResponse(buildContext(new Metadata()), data) as any;

        expect(typeof result.metadata.before.value).toBe('string');
        expect(JSON.parse(result.metadata.before.value)).toEqual([{ a: 1 }, { a: 2 }]);
        expect(typeof result.metadata.after.value).toBe('string');
        expect(JSON.parse(result.metadata.after.value)).toEqual([{ b: 1 }, { b: 2 }]);
    });

    it('leaves the `@AnyType` value as-is on the HTTP path so the JSON response carries arrays/objects (not stringified blobs)', () => {
        const interceptor = buildInterceptor();
        const data = buildPayload();

        const result = interceptor.handleResponse(buildContext({}), data) as any;

        expect(Array.isArray(result.metadata.before.value)).toBe(true);
        expect(result.metadata.before.value).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('validates the *original* payload (so nullable nested fields like `details: null` keep skipping `@ValidateNested` via `@IsOptional`)', () => {
        const interceptor = buildInterceptor();
        const data = buildPayload();

        expect(() => interceptor.handleResponse(buildContext(new Metadata()), data)).not.toThrow();
        // After the call, `details` is still expected to be JSON-stringified for the wire:
        expect((data as any).metadata.before.details).toBe('null');
    });
});
