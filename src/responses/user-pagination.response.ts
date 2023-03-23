import {IsArray, ValidateNested} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";
import {PaginationResponse} from "./pagination.response";
import {UserResponse} from "./user.response";
import {Type} from "class-transformer";

export class UserPaginationResponse extends PaginationResponse{
    @ApiProperty()
    @IsArray()
    @ValidateNested()
    @Type(() => UserResponse)
    items: UserResponse[]
}