import { Module } from '@nestjs/common';
import { ResponseModule } from '../../lib/modules/response.module';
import { BenchController } from './bench.controller';

@Module({
    imports: [
        ResponseModule.forRoot({
            excludedKeys: ['password', 'otpSecretKey', 'accessKeySecret']
        })
    ],
    controllers: [BenchController]
})
export class BenchModule {}
