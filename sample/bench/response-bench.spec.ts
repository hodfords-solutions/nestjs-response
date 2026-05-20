import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BoardColumnResponse, GroupBoardColumnResponse } from './responses/board.responses';
import { makeBoardColumns, makeGroupBoardColumns } from './responses/board.fixtures';

const EXCLUDE_KEYS = ['password', 'otpSecretKey', 'accessKeySecret'];

function excludeByKeys(data: unknown, keys: string[]): unknown {
    if (data === null || typeof data !== 'object') {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map((item) => excludeByKeys(item, keys));
    }
    const record = data as Record<string, unknown>;
    for (const prop in record) {
        if (keys.includes(prop)) {
            delete record[prop];
        } else if (record[prop] && typeof record[prop] === 'object') {
            record[prop] = excludeByKeys(record[prop], keys);
        }
    }
    return record;
}

function bench(label: string, fn: () => void, iterations: number, warmup: number): void {
    for (let i = 0; i < warmup; i++) {
        fn();
    }

    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        fn();
        const end = process.hrtime.bigint();
        samples.push(Number(end - start) / 1_000_000);
    }
    samples.sort((a, b) => a - b);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const p50 = samples[Math.floor(samples.length * 0.5)];
    const p95 = samples[Math.floor(samples.length * 0.95)];

    process.stdout.write(
        `${label.padEnd(50)} mean=${mean.toFixed(2)}ms  p50=${p50.toFixed(2)}ms  p95=${p95.toFixed(2)}ms  ops/s=${(1000 / mean).toFixed(1)}\n`
    );
}

function stockPath<T>(cls: new () => T, data: unknown[]): T[] {
    const results: T[] = [];
    for (const item of data) {
        const instance = plainToInstance(cls, item) as T;
        const errors = validateSync(instance as object, {
            whitelist: true,
            stopAtFirstError: true
        });
        if (errors.length > 0) {
            throw new Error(`validateSync failed: ${JSON.stringify(errors[0])}`);
        }
        results.push(instance);
    }
    excludeByKeys(results, EXCLUDE_KEYS);
    return results;
}

function fastPath<T>(cls: new () => T, data: unknown[]): T[] {
    return data.map((item) => plainToInstance(cls, item) as T);
}

describe('Response interceptor benchmark', () => {
    it('runs benchmark', () => {
        const smallBoards = makeBoardColumns(5, 10);
        const mediumBoards = makeBoardColumns(5, 50);

        const smallGroup = makeGroupBoardColumns(5, 5, 5);
        const mediumGroup = makeGroupBoardColumns(5, 5, 10);

        try {
            stockPath(BoardColumnResponse, smallBoards);
            stockPath(GroupBoardColumnResponse, smallGroup);
        } catch (err) {
            process.stdout.write(`Fixture validation failed: ${err}\n`);
            throw err;
        }

        process.stdout.write('\n=== BoardColumnResponse[] ===\n\n');
        process.stdout.write('Small: 5 cols x 10 tasks (50 tasks, 100 attachments)\n');
        bench('  stock', () => stockPath(BoardColumnResponse, smallBoards), 30, 5);
        bench('  fast ', () => fastPath(BoardColumnResponse, smallBoards), 30, 5);

        process.stdout.write('\nMedium: 5 cols x 50 tasks (250 tasks, 500 attachments)\n');
        bench('  stock', () => stockPath(BoardColumnResponse, mediumBoards), 15, 3);
        bench('  fast ', () => fastPath(BoardColumnResponse, mediumBoards), 15, 3);

        process.stdout.write('\n=== GroupBoardColumnResponse[] ===\n\n');
        process.stdout.write('Small: 5 groups x 5 cols x 5 tasks (125 tasks, 250 attachments)\n');
        bench('  stock', () => stockPath(GroupBoardColumnResponse, smallGroup), 30, 5);
        bench('  fast ', () => fastPath(GroupBoardColumnResponse, smallGroup), 30, 5);

        process.stdout.write('\nMedium: 5 groups x 5 cols x 10 tasks (250 tasks, 500 attachments)\n');
        bench('  stock', () => stockPath(GroupBoardColumnResponse, mediumGroup), 15, 3);
        bench('  fast ', () => fastPath(GroupBoardColumnResponse, mediumGroup), 15, 3);

        process.stdout.write('\n');
    }, 600000);

    it('breakdown: which part of stock costs what?', () => {
        const data = makeGroupBoardColumns(5, 5, 10);

        const countNodes = (obj: unknown): number => {
            if (obj === null || typeof obj !== 'object') {
                return 0;
            }
            if (Array.isArray(obj)) {
                return obj.reduce<number>((sum, item) => sum + countNodes(item), 0);
            }
            let n = 1;
            for (const key in obj as Record<string, unknown>) {
                n += countNodes((obj as Record<string, unknown>)[key]);
            }
            return n;
        };

        const totalNodes = countNodes(data);
        process.stdout.write(
            `\n=== Breakdown (payload: 5 groups x 5 cols x 10 tasks, ~${totalNodes} nodes) ===\n\n`
        );

        const instances = data.map((d) => plainToInstance(GroupBoardColumnResponse, d));

        const flatData = data.map((d) => ({ ...(d as object), boards: [] }));
        const flatInstances = flatData.map((d) => plainToInstance(GroupBoardColumnResponse, d));

        bench('  [1] plainToInstance only                            ', () => data.map((d) => plainToInstance(GroupBoardColumnResponse, d)), 30, 5);
        bench('  [2] validateSync({}) recursive via @ValidateNested  ', () => instances.forEach((i) => validateSync(i)), 30, 5);
        bench('  [3] validateSync({whitelist:true}) recursive        ', () => instances.forEach((i) => validateSync(i, { whitelist: true })), 30, 5);
        bench('  [4] validateSync({whitelist,stopAtFirstError}) STOCK', () => instances.forEach((i) => validateSync(i, { whitelist: true, stopAtFirstError: true })), 30, 5);
        bench('  [5] validateSync({whitelist:true}) NO nested        ', () => flatInstances.forEach((i) => validateSync(i, { whitelist: true })), 30, 5);
        bench('  [6] excludeByKeys (recursive prop strip)            ', () => excludeByKeys(JSON.parse(JSON.stringify(data)), EXCLUDE_KEYS), 30, 5);

        process.stdout.write('\nInterpretation:\n');
        process.stdout.write('  [1] is the work shared by both decorators (plainToInstance)\n');
        process.stdout.write('  [4] - [1] = total stock interceptor overhead per payload\n');
        process.stdout.write('  [5] = validateSync overhead WITHOUT @ValidateNested recursion (root only)\n');
        process.stdout.write('  [4] - [5] = cost of @ValidateNested recursing into all nested instances\n');
        process.stdout.write('  [3] - [2] = whitelist-stripping overhead alone\n');
        process.stdout.write('  [6] = excludeByKeys walk cost\n\n');
    }, 600000);
});
