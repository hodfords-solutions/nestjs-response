import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ResponseModel, UseResponseInterceptor } from 'lib';
import { AttachmentResponse, BoardColumnResponse, GroupBoardColumnResponse } from './responses/board.responses';
import { makeAttachments, makeBoardColumns, makeGroupBoardColumns } from './responses/board.fixtures';

export const BENCH_SCENARIOS = {
    largeFlat: { attachments: 5000 },
    mediumNested: { cols: 5, tasks: 50, attachments: 2 },
    largeNested: { groups: 5, cols: 5, tasks: 20, attachments: 2 },
    hugeNested: { groups: 10, cols: 10, tasks: 20, attachments: 2 }
} as const;

@Controller('bench')
@UseResponseInterceptor()
export class BenchController {
    private cache = new Map<string, unknown>();

    private payload<T>(key: string, build: () => T): T {
        let value = this.cache.get(key);
        if (!value) {
            value = build();
            this.cache.set(key, value);
        }
        return value as T;
    }

    @Get('with-model/large-flat')
    @ResponseModel(AttachmentResponse, true)
    @HttpCode(HttpStatus.OK)
    largeFlatWithModel(): unknown[] {
        return this.payload('large-flat', () => makeAttachments(BENCH_SCENARIOS.largeFlat.attachments));
    }

    @Get('without-model/large-flat')
    @HttpCode(HttpStatus.OK)
    largeFlatWithoutModel(): unknown[] {
        return this.payload('large-flat', () => makeAttachments(BENCH_SCENARIOS.largeFlat.attachments));
    }

    @Get('with-model/medium-nested')
    @ResponseModel(BoardColumnResponse, true)
    @HttpCode(HttpStatus.OK)
    mediumNestedWithModel(): unknown[] {
        const cfg = BENCH_SCENARIOS.mediumNested;
        return this.payload('medium-nested', () => makeBoardColumns(cfg.cols, cfg.tasks, cfg.attachments));
    }

    @Get('without-model/medium-nested')
    @HttpCode(HttpStatus.OK)
    mediumNestedWithoutModel(): unknown[] {
        const cfg = BENCH_SCENARIOS.mediumNested;
        return this.payload('medium-nested', () => makeBoardColumns(cfg.cols, cfg.tasks, cfg.attachments));
    }

    @Get('with-model/large-nested')
    @ResponseModel(GroupBoardColumnResponse, true)
    @HttpCode(HttpStatus.OK)
    largeNestedWithModel(): unknown[] {
        const cfg = BENCH_SCENARIOS.largeNested;
        return this.payload('large-nested', () =>
            makeGroupBoardColumns(cfg.groups, cfg.cols, cfg.tasks, cfg.attachments)
        );
    }

    @Get('without-model/large-nested')
    @HttpCode(HttpStatus.OK)
    largeNestedWithoutModel(): unknown[] {
        const cfg = BENCH_SCENARIOS.largeNested;
        return this.payload('large-nested', () =>
            makeGroupBoardColumns(cfg.groups, cfg.cols, cfg.tasks, cfg.attachments)
        );
    }

    @Get('with-model/huge-nested')
    @ResponseModel(GroupBoardColumnResponse, true)
    @HttpCode(HttpStatus.OK)
    hugeNestedWithModel(): unknown[] {
        const cfg = BENCH_SCENARIOS.hugeNested;
        return this.payload('huge-nested', () =>
            makeGroupBoardColumns(cfg.groups, cfg.cols, cfg.tasks, cfg.attachments)
        );
    }

    @Get('without-model/huge-nested')
    @HttpCode(HttpStatus.OK)
    hugeNestedWithoutModel(): unknown[] {
        const cfg = BENCH_SCENARIOS.hugeNested;
        return this.payload('huge-nested', () =>
            makeGroupBoardColumns(cfg.groups, cfg.cols, cfg.tasks, cfg.attachments)
        );
    }
}
