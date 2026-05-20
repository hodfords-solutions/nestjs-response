# ResponseInterceptor Benchmarks

Benchmarks for measuring the runtime cost of the response interceptor on deeply nested payloads. Useful for evaluating whether `validateSync` + `@ValidateNested` recursion is a bottleneck for your endpoints and for guiding per-endpoint validation decisions.

## Layout

```
sample/bench/
├── responses/
│   ├── board.responses.ts   # deeply nested response classes (groups → columns → items → task → attachments)
│   └── board.fixtures.ts    # data generators
├── response-bench.spec.ts   # synthetic plainToInstance + validateSync timing + breakdown
├── bench.controller.ts      # HTTP endpoint returning fixture data
├── bench.module.ts          # Nest module wiring the bench controller + ResponseModule
└── bench-http.spec.ts       # end-to-end HTTP timing via supertest
```

## Running

Install deps once:

```bash
npm install
```

### Synthetic benchmark (no HTTP overhead)

Runs `plainToInstance` + `validateSync` directly and reports mean / p50 / p95 across iterations.

```bash
npx jest sample/bench/response-bench.spec.ts
```

Contains two tests:

- **`runs benchmark`** — compares the full stock path (`plainToInstance` + `validateSync({whitelist, stopAtFirstError})` + `excludeByKeys`) against a fast path (`plainToInstance` only) across small (50 tasks) and medium (250 tasks) payloads.
- **`breakdown`** — isolates the cost of each individual step so you can see exactly where time goes.

### HTTP benchmark

Bootstraps a real Nest app via `@nestjs/testing`, hits `GET /bench/group-boards` through `supertest`, and reports latency end-to-end.

```bash
npx jest sample/bench/bench-http.spec.ts
```

Default payload is 5 groups × 5 columns × 40 tasks = 1000 tasks. Adjust in `bench-http.spec.ts`:

```ts
const query = { groups: '5', cols: '5', tasks: '40' };
```

## Interpreting the breakdown

Sample output on a ~1085-node payload (5 groups × 5 columns × 10 tasks):

```
[1] plainToInstance only                             mean=41.24ms
[2] validateSync({}) recursive via @ValidateNested   mean=12.19ms
[3] validateSync({whitelist:true}) recursive         mean=15.08ms
[4] validateSync({whitelist,stopAtFirstError}) STOCK mean=12.99ms
[5] validateSync({whitelist:true}) NO nested         mean= 0.03ms
[6] excludeByKeys (recursive prop strip)             mean= 1.31ms
```

| Line | What it measures |
|------|------------------|
| `[1]` | Shared cost of building class instances from raw data — both the stock and fast paths pay this. |
| `[4]` | Total `validateSync` cost as the stock interceptor calls it. |
| `[4] - [1]` | Total overhead the stock interceptor adds beyond a fast path. |
| `[5]` | `validateSync` cost when `@ValidateNested` is **not** present — root-level fields only. |
| `[4] - [5]` | Cost of `@ValidateNested` recursing into every nested instance. Usually the dominant cost on deeply nested payloads. |
| `[3] - [2]` | Cost of whitelist stripping in isolation. |
| `[6]` | Cost of the `excludedKeys` recursive prop strip. |

The big lever in `[5]` is removing `@ValidateNested` from response classes — this collapses validation cost by orders of magnitude on deeply nested payloads, at the price of giving up nested type-level validation in production.

## Tweaking payload size

In `response-bench.spec.ts`:

```ts
const smallBoards  = makeBoardColumns(5, 10);   // 5 cols × 10 tasks
const mediumBoards = makeBoardColumns(5, 50);   // 5 cols × 50 tasks
const smallGroup   = makeGroupBoardColumns(5, 5, 5);
const mediumGroup  = makeGroupBoardColumns(5, 5, 10);
```

`makeBoardColumns(columnCount, taskPerColumn)` and `makeGroupBoardColumns(groupCount, columnPerGroup, taskPerColumn)` accept any sizes — scale them up to match your real-world worst case.

Iteration counts and warmups are arguments to `bench(label, fn, iterations, warmup)`. Increase both for tighter measurements on small payloads; lower them for very large payloads to keep total runtime sane.
