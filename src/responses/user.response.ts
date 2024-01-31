import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponse {
    @ApiProperty()
    @IsString()
    name: string;
}
