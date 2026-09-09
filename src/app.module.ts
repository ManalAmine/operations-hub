import { Module } from '@nestjs/common';
import { RequestsModule } from './modules/requests/requests.module';

@Module({
  imports: [RequestsModule],
})
export class AppModule {}
