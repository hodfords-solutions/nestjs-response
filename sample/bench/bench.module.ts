import { Module } from '@nestjs/common';
import { ResponseModule } from '../../lib/modules/response.module.js';
import { BenchController } from './bench.controller.js';

@Module({
    imports: [
        ResponseModule.forRoot({
            excludedKeys: ['password', 'otpSecretKey', 'accessKeySecret']
        })
    ],
    controllers: [BenchController]
})
export class BenchModule {}
