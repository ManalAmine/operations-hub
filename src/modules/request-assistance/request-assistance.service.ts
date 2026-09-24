import { Inject, Injectable } from '@nestjs/common';
import { TrustedDepartment } from './request-assistance.contract';
import {
  REQUEST_INTERPRETER,
  RequestInterpretationError,
  RequestInterpreter,
} from './request-interpreter';
import { TrustedRequestContextService } from './trusted-request-context.service';

export const REQUEST_ASSISTANCE_PROMPT_VERSION = 'request-interpreter-v8';

@Injectable()
export class RequestAssistanceService {
  constructor(
    @Inject(REQUEST_INTERPRETER) private readonly interpreter: RequestInterpreter,
    private readonly trustedContext: TrustedRequestContextService,
  ) {}

  isEnabled(): boolean {
    return process.env.AI_REQUESTS_ENABLED?.toLowerCase() === 'true';
  }

  pendingMetadata() {
    return {
      provider: 'openai',
      model: process.env.OPENAI_REQUEST_MODEL?.trim() || 'gpt-5.6-terra',
      promptVersion: REQUEST_ASSISTANCE_PROMPT_VERSION,
    };
  }

  async interpret(input: {
    title: string;
    description: string;
    selectedDepartmentId: string;
    departments: TrustedDepartment[];
  }) {
    const trustedContext = this.trustedContext.build(
      input.departments,
      input.selectedDepartmentId,
    );
    return this.interpreter.interpret({
      request: {
        title: input.title,
        description: input.description,
        selectedDepartmentId: input.selectedDepartmentId,
      },
      trustedContext,
    });
  }

  failureCode(error: unknown): string {
    return error instanceof RequestInterpretationError
      ? error.code
      : 'PROVIDER_UNAVAILABLE';
  }
}
