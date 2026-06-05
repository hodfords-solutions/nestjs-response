import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UserResponse {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    secretKey?: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Transform((object) => {
        return object.value?.toUpperCase();
    })
    extra?: string;
}

export class AdminResponse {
    @ApiProperty()
    @IsBoolean()
    isAdmin: boolean;
}
