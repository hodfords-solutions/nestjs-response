import { IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationResponse } from './pagination.response.js';
import { UserResponse } from './user.response.js';
import { Type } from 'class-transformer';

export class UserPaginationResponse extends PaginationResponse {
    @ApiProperty()
    @IsArray()
    @ValidateNested()
    @Type(() => UserResponse)
    items: UserResponse[];
}
