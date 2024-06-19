import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ResponseModule } from '../libs/modules/response.module';

const nestjsResponseConfig = ResponseModule.forRoot({
    excludeKeys: ['secret']
});

@Module({
    imports: [nestjsResponseConfig],
    providers: [],
    controllers: [AppController]
})
export class AppModule {}
