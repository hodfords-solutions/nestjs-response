import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BenchModule } from './bench.module';
import { BENCH_SCENARIOS } from './bench.controller';
import { countNodes, makeAttachments, makeBoardColumns, makeGroupBoardColumns } from './responses/board.fixtures';

type Stats = { mean: number; p50: number; p95: number };

type Scenario = {
    label: string;
    path: string;
    items: number;
    nodes: number;
    warmup: number;
    measure: number;
};

async function timeRequest(server: unknown, path: string): Promise<number> {
    const start = process.hrtime.bigint();
    await request(server as never)
        .get(path)
        .expect(200);
    const end = process.hrtime.bigint();
    return Number(end - start) / 1_000_000;
}

async function measure(server: unknown, path: string, warmup: number, samples: number): Promise<Stats> {
    for (let i = 0; i < warmup; i++) {
        await timeRequest(server, path);
    }
    const data: number[] = [];
    for (let i = 0; i < samples; i++) {
        data.push(await timeRequest(server, path));
    }
    data.sort((a, b) => a - b);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return {
        mean,
        p50: data[Math.floor(data.length * 0.5)],
        p95: data[Math.floor(data.length * 0.95)]
    };
}

// eslint-disable-next-line max-lines-per-function
function buildScenarios(): Scenario[] {
    const largeFlatPayload = makeAttachments(BENCH_SCENARIOS.largeFlat.attachments);
    const mediumNestedPayload = makeBoardColumns(
        BENCH_SCENARIOS.mediumNested.cols,
        BENCH_SCENARIOS.mediumNested.tasks,
        BENCH_SCENARIOS.mediumNested.attachments
    );
    const largeNestedPayload = makeGroupBoardColumns(
        BENCH_SCENARIOS.largeNested.groups,
        BENCH_SCENARIOS.largeNested.cols,
        BENCH_SCENARIOS.largeNested.tasks,
        BENCH_SCENARIOS.largeNested.attachments
    );
    const hugeNestedPayload = makeGroupBoardColumns(
        BENCH_SCENARIOS.hugeNested.groups,
        BENCH_SCENARIOS.hugeNested.cols,
        BENCH_SCENARIOS.hugeNested.tasks,
        BENCH_SCENARIOS.hugeNested.attachments
    );

    return [
        {
            label: 'Large flat',
            path: 'large-flat',
            items: BENCH_SCENARIOS.largeFlat.attachments,
            nodes: countNodes(largeFlatPayload),
            warmup: 3,
            measure: 10
        },
        {
            label: 'Medium nested',
            path: 'medium-nested',
            items: BENCH_SCENARIOS.mediumNested.cols * BENCH_SCENARIOS.mediumNested.tasks,
            nodes: countNodes(mediumNestedPayload),
            warmup: 3,
            measure: 10
        },
        {
            label: 'Large nested',
            path: 'large-nested',
            items:
                BENCH_SCENARIOS.largeNested.groups *
                BENCH_SCENARIOS.largeNested.cols *
                BENCH_SCENARIOS.largeNested.tasks,
            nodes: countNodes(largeNestedPayload),
            warmup: 2,
            measure: 8
        },
        {
            label: 'Huge nested',
            path: 'huge-nested',
            items:
                BENCH_SCENARIOS.hugeNested.groups * BENCH_SCENARIOS.hugeNested.cols * BENCH_SCENARIOS.hugeNested.tasks,
            nodes: countNodes(hugeNestedPayload),
            warmup: 2,
            measure: 5
        }
    ];
}

function formatStats(stats: Stats): string {
    const opsPerSec = 1000 / stats.mean;
    return (
        `mean=${stats.mean.toFixed(1).padStart(6)}ms  ` +
        `p50=${stats.p50.toFixed(1).padStart(6)}ms  ` +
        `p95=${stats.p95.toFixed(1).padStart(6)}ms  ` +
        `ops/s=${opsPerSec.toFixed(1).padStart(7)}`
    );
}

// eslint-disable-next-line max-lines-per-function
describe('Response interceptor HTTP benchmark — with vs without @ResponseModel', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BenchModule]
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    // eslint-disable-next-line max-lines-per-function
    it('runs compare table across large array and large nested payloads', async () => {
        const server = app.getHttpServer();
        const scenarios = buildScenarios();

        const rows: Array<{
            scenario: Scenario;
            without: Stats;
            with: Stats;
            overhead: number;
        }> = [];

        for (const scenario of scenarios) {
            const without = await measure(
                server,
                `/bench/without-model/${scenario.path}`,
                scenario.warmup,
                scenario.measure
            );
            const withModel = await measure(
                server,
                `/bench/with-model/${scenario.path}`,
                scenario.warmup,
                scenario.measure
            );
            rows.push({
                scenario,
                without,
                with: withModel,
                overhead: withModel.mean / without.mean
            });
        }

        const lines: string[] = [];
        lines.push('');
        lines.push('=== ResponseModel HTTP benchmark — compare table ===');
        lines.push('');
        lines.push(
            'Scenario        Items  Nodes   without-model                                              with-model                                                 overhead'
        );
        lines.push(
            '--------------- ------ ------- ---------------------------------------------------------- ---------------------------------------------------------- --------'
        );
        for (const row of rows) {
            lines.push(
                [
                    row.scenario.label.padEnd(15),
                    String(row.scenario.items).padStart(6),
                    String(row.scenario.nodes).padStart(7),
                    formatStats(row.without).padEnd(58),
                    formatStats(row.with).padEnd(58),
                    `${row.overhead.toFixed(2)}x`.padStart(7)
                ].join(' ')
            );
        }
        lines.push('');
        lines.push('Notes:');
        lines.push(
            '  without-model: controller returns data; interceptor short-circuits (no plainToInstance / validateSync / excludedKeys walk).'
        );
        lines.push(
            '  with-model:    controller has @ResponseModel; interceptor runs plainToInstance + validateSync (recursive via @ValidateNested) + excludedKeys walk.'
        );
        lines.push(
            '  overhead = with-model.mean / without-model.mean — multiplier of latency added by @ResponseModel on top of raw JSON response.'
        );
        lines.push('');

        process.stdout.write(lines.join('\n'));

        for (const row of rows) {
            expect(row.with.mean).toBeGreaterThan(0);
            expect(row.without.mean).toBeGreaterThan(0);
        }
    }, 600000);
});
