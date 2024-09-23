import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { UseResponseInterceptor, ResponseModel } from 'lib';
import { UserResponse } from './responses/user.response';
import { UserPaginationResponse } from './responses/user-pagination.response';
import { ResponseModels } from '../lib/decorators/response-models.decorator';
import { PaginationResponse } from './responses/pagination.response';

@Controller()
@UseResponseInterceptor()
export class AppController {
    @Get()
    @ResponseModel(UserResponse)
    @HttpCode(HttpStatus.OK)
    getSingle(): { name: string } {
        return { name: 'test' };
    }

    @Get('exclude')
    @ResponseModel(UserResponse, false, true)
    @HttpCode(HttpStatus.OK)
    getExclude(): UserResponse {
        return { name: 'test', secretKey: 'secret' };
    }

    @Get('undefined')
    @ResponseModel(UserResponse, false, true)
    @HttpCode(HttpStatus.OK)
    getUndefined(): undefined {
        return undefined;
    }

    @Get('multiple')
    @ResponseModel(UserResponse, true)
    @HttpCode(HttpStatus.OK)
    getMultiple(): UserResponse[] {
        return [{ name: 'test' }, { name: 'test2' }];
    }

    @Get('pagination')
    @ResponseModel(UserPaginationResponse, false)
    @HttpCode(HttpStatus.OK)
    getPagination(): PaginationResponse {
        return {
            items: [{ name: 'test' }, { name: 'test2' }],
            total: 10,
            lastPage: 1,
            perPage: 1,
            currentPage: 1
        };
    }

    @Get('boolean')
    @ResponseModel(Boolean, false)
    getBoolean(): boolean {
        return false;
    }

    @Get('list-boolean')
    @ResponseModel(Boolean, true)
    getListBooleans(): boolean[] {
        return [false, true, false, true, true];
    }

    @Get('string')
    @ResponseModel(String, false)
    getString(): string {
        return 'foo';
    }

    @Get('list-string')
    @ResponseModel(String, true)
    getListString(): string[] {
        return ['foo', 'bar'];
    }

    @Get('number')
    @ResponseModel(Number, false)
    getNumber(): number {
        return 123;
    }

    @Get('list-number')
    @ResponseModel(Number, true)
    getListNumber(): number[] {
        return [123, 456];
    }

    @Get('list-models/:type')
    @ResponseModels(Number, [Number], UserPaginationResponse, [UserResponse], undefined, null)
    getModels(
        @Param('type') type: string
    ): number | number[] | UserPaginationResponse | UserResponse[] | undefined | null {
        if (type == 'undefined') {
            return undefined;
        }
        if (type == 'pagination') {
            return {
                items: [{ name: 'test' }, { name: 'test 2' }],
                total: 10,
                lastPage: 1,
                perPage: 1,
                currentPage: 1
            };
        }
        if (type == 'multiple') {
            return [{ name: 'test' }, { name: 'test2' }];
        }
        if (type == 'list-number') {
            return [123, 456];
        }
        if (type == 'number') {
            return 456;
        }
        return null;
    }
}
