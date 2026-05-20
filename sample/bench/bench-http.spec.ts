import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BenchModule } from './bench.module';

describe('Response interceptor HTTP benchmark', () => {
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

    it('benchmarks GET /bench/group-boards (5 groups x 5 cols x 40 tasks = 1000 tasks)', async () => {
        const WARMUP = 3;
        const MEASURE = 10;
        const query = { groups: '5', cols: '5', tasks: '40' };

        const server = app.getHttpServer();
        const call = (): Promise<unknown> =>
            request(server).get('/bench/group-boards').query(query).expect(200);

        for (let i = 0; i < WARMUP; i++) {
            await call();
        }

        const samples: number[] = [];
        for (let i = 0; i < MEASURE; i++) {
            const start = process.hrtime.bigint();
            await call();
            const end = process.hrtime.bigint();
            samples.push(Number(end - start) / 1_000_000);
        }
        samples.sort((a, b) => a - b);

        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const p50 = samples[Math.floor(samples.length * 0.5)];
        const p95 = samples[Math.floor(samples.length * 0.95)];

        process.stdout.write(
            `\nHTTP bench /bench/group-boards  (1000 tasks, 2000 attachments)\n` +
                `  samples=${MEASURE}  mean=${mean.toFixed(1)}ms  p50=${p50.toFixed(1)}ms  p95=${p95.toFixed(1)}ms\n\n`
        );
    }, 600000);
});
