import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ResponseModel, UseResponseInterceptor } from 'lib';
import { GroupBoardColumnResponse } from './responses/board.responses';
import { makeGroupBoardColumns } from './responses/board.fixtures';

@Controller('bench')
@UseResponseInterceptor()
export class BenchController {
    private cache: Map<string, unknown[]> = new Map();

    @Get('group-boards')
    @ResponseModel(GroupBoardColumnResponse, true)
    @HttpCode(HttpStatus.OK)
    getGroupBoards(
        @Query('groups') groupsRaw: string,
        @Query('cols') colsRaw: string,
        @Query('tasks') tasksRaw: string
    ): unknown[] {
        const groups = Number(groupsRaw) || 5;
        const cols = Number(colsRaw) || 5;
        const tasks = Number(tasksRaw) || 10;
        const key = `${groups}-${cols}-${tasks}`;

        let payload = this.cache.get(key);
        if (!payload) {
            payload = makeGroupBoardColumns(groups, cols, tasks);
            this.cache.set(key, payload);
        }
        return payload;
    }
}
