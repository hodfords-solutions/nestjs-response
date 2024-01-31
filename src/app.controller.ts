import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { UseResponseInterceptor, ResponseModel } from '@hodfords/nestjs-response';
import { UserResponse } from './responses/user.response';
import { UserPaginationResponse } from './responses/user-pagination.response';
import { ResponseModels } from '../libs/decorators/response-models.decorator';

@Controller()
@UseResponseInterceptor()
export class AppController {
    @Get()
    @ResponseModel(UserResponse)
    @HttpCode(HttpStatus.OK)
    getSingle() {
        return { name: 'test' };
    }

    @Get('undefined')
    @ResponseModel(UserResponse, false, true)
    @HttpCode(HttpStatus.OK)
    getUndefined() {
        return undefined;
    }

    @Get('multiple')
    @ResponseModel(UserResponse, true)
    @HttpCode(HttpStatus.OK)
    getMultiple() {
        return [{ name: 'test' }, { name: 'test2' }];
    }

    @Get('pagination')
    @ResponseModel(UserPaginationResponse, false)
    @HttpCode(HttpStatus.OK)
    getPagination() {
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
    getBoolean() {
        return false;
    }

    @Get('list-boolean')
    @ResponseModel(Boolean, true)
    getListBooleans() {
        return [false, true, false, true, true];
    }

    @Get('string')
    @ResponseModel(String, false)
    getString() {
        return 'foo';
    }

    @Get('list-string')
    @ResponseModel(String, true)
    getListString() {
        return ['foo', 'bar'];
    }

    @Get('number')
    @ResponseModel(Number, false)
    getNumber() {
        return 123;
    }

    @Get('list-number')
    @ResponseModel(Number, true)
    getListNumber() {
        return [123, 456];
    }

    @Get('list-models/:type')
    @ResponseModels(Number, [Number], UserPaginationResponse, [UserResponse], undefined, null)
    getModels(@Param('type') type: string) {
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
