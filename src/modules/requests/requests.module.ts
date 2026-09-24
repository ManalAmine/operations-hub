import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { RequestAssistanceModule } from '../request-assistance/request-assistance.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [AuthModule, RequestAssistanceModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
