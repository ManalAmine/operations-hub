import { AiRequestAnalysis, InterpretRequestInput } from './request-assistance.contract';

export const REQUEST_INTERPRETER = Symbol('REQUEST_INTERPRETER');

export type RequestInterpretationFailureCode =
  | 'CONFIGURATION'
  | 'TIMEOUT'
  | 'REFUSAL'
  | 'INVALID_OUTPUT'
  | 'PROVIDER_UNAVAILABLE';

export class RequestInterpretationError extends Error {
  constructor(
    public readonly code: RequestInterpretationFailureCode,
    message: string,
  ) {
    super(message);
  }
}

export interface RequestInterpreterResult {
  analysis: AiRequestAnalysis;
  provider: string;
  model: string;
}

export interface RequestInterpreter {
  interpret(input: InterpretRequestInput): Promise<RequestInterpreterResult>;
}
