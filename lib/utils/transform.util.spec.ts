import { describe, expect, it } from 'vitest';
import 'reflect-metadata';
import { Expose, Transform, Type } from 'class-transformer';
import { applyTransforms } from './transform.util.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
const ToUnix = (): PropertyDecorator =>
    Transform(({ value }) => (value instanceof Date ? Math.floor(value.getTime() / 1000) : value));

class BaseResponse {
    @ToUnix()
    @Expose()
    createdAt?: Date | number;
}

class MessageResponse extends BaseResponse {
    @Expose()
    type: string;

    @Type(() => MessageResponse)
    @Expose()
    referencedMessage?: MessageResponse;
}

class NodeA {
    @ToUnix()
    @Expose()
    createdAt?: Date | number;

    /** typed loosely so emitDecoratorMetadata doesn't emit a forward class reference (TDZ) */
    @Type(() => NodeB)
    @Expose()
    child?: unknown;
}

class NodeB {
    @ToUnix()
    @Expose()
    createdAt?: Date | number;

    @Type(() => NodeA)
    @Expose()
    parent?: unknown;
}

describe('applyTransforms', () => {
    const date = new Date('2026-06-05T23:55:46.417Z');
    const unix = Math.floor(date.getTime() / 1000);

    it('applies transforms to a self-referential nested property', () => {
        const data = {
            type: 'NORMAL',
            createdAt: new Date(date),
            referencedMessage: { type: 'NORMAL', createdAt: new Date(date) }
        };

        applyTransforms(data, MessageResponse);

        expect(data.createdAt).toBe(unix);
        expect(data.referencedMessage.createdAt).toBe(unix);
    });

    it('applies transforms through an indirect reference cycle (A -> B -> A)', () => {
        const data = {
            createdAt: new Date(date),
            child: { createdAt: new Date(date), parent: { createdAt: new Date(date) } }
        };

        applyTransforms(data, NodeA);

        expect(data.createdAt).toBe(unix);
        expect(data.child.createdAt).toBe(unix);
        expect(data.child.parent.createdAt).toBe(unix);
    });
});
