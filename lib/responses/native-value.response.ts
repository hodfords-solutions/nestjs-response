import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class NativeValueResponse {
    @IsOptional()
    @IsString()
    string: string;

    @IsOptional()
    @IsNumber()
    number: number;

    @IsOptional()
    @IsBoolean()
    boolean: boolean;
}
