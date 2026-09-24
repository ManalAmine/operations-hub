import { Module } from '@nestjs/common';
import { OpenAiRequestInterpreter } from './openai-request-interpreter.service';
import { RequestAssistanceService } from './request-assistance.service';
import { REQUEST_INTERPRETER } from './request-interpreter';
import { TrustedRequestContextService } from './trusted-request-context.service';

@Module({
  providers: [
    TrustedRequestContextService,
    OpenAiRequestInterpreter,
    {
      provide: REQUEST_INTERPRETER,
      useExisting: OpenAiRequestInterpreter,
    },
    RequestAssistanceService,
  ],
  exports: [RequestAssistanceService],
})
export class RequestAssistanceModule {}
