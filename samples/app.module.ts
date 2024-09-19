import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ResponseModule } from '../lib/modules/response.module';

const nestjsResponseConfig = ResponseModule.forRoot({
    excludedKeys: ['secret']
});

@Module({
    imports: [nestjsResponseConfig],
    providers: [],
    controllers: [AppController]
})
export class AppModule {}
