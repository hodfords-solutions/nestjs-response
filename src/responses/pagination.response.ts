import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export abstract class PaginationResponse {
    abstract items: any[];

    @ApiProperty()
    @IsNumber()
    total: number;

    @ApiProperty()
    @IsNumber()
    lastPage: number;

    @ApiProperty()
    @IsNumber()
    perPage: number;

    @ApiProperty()
    @IsNumber()
    currentPage: number;
}
