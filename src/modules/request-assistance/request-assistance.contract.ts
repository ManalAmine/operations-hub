export const REQUEST_TYPES = [
  'IT_HARDWARE',
  'IT_NETWORK',
  'IT_SOFTWARE',
  'IT_ACCESS',
  'HR_POLICY',
  'HR_EMPLOYEE_SUPPORT',
  'FINANCE_EXPENSE',
  'FINANCE_PAYROLL',
  'FINANCE_PAYMENT_DELAY',
  'OTHER',
] as const;

export const AI_URGENCIES = ['LOW', 'NORMAL', 'HIGH'] as const;

export type AiRequestType = (typeof REQUEST_TYPES)[number];
export type AiUrgency = (typeof AI_URGENCIES)[number];

export interface TrustedDepartment {
  id: string;
  name: string;
}

export interface TrustedPlaybook {
  key: string;
  text: string;
}

export interface TrustedRequestContext {
  departments: TrustedDepartment[];
  selectedDepartmentId: string;
  requestTypes: readonly AiRequestType[];
  playbooks: TrustedPlaybook[];
}

export interface InterpretRequestInput {
  request: {
    title: string;
    description: string;
    selectedDepartmentId: string;
  };
  trustedContext: TrustedRequestContext;
}

export interface AiRequestAnalysis {
  requestType: AiRequestType;
  summary: string;
  suggestedDepartmentId: string | null;
  urgency: AiUrgency;
  needsClarification: boolean;
  clarificationQuestion: string | null;
  suggestedNextSteps: string[];
  trustedContextKeys: string[];
}

export const REQUEST_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    requestType: { type: 'string', enum: REQUEST_TYPES },
    summary: { type: 'string', minLength: 1, maxLength: 160 },
    suggestedDepartmentId: {
      type: ['string', 'null'],
      description: 'One supplied active department ID, or null when unclear.',
    },
    urgency: { type: 'string', enum: AI_URGENCIES },
    needsClarification: { type: 'boolean' },
    clarificationQuestion: { type: ['string', 'null'], maxLength: 200 },
    suggestedNextSteps: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string', minLength: 12, maxLength: 160 },
    },
    trustedContextKeys: {
      type: 'array',
      maxItems: 0,
      items: { type: 'string', minLength: 1 },
    },
  },
  required: [
    'requestType',
    'summary',
    'suggestedDepartmentId',
    'urgency',
    'needsClarification',
    'clarificationQuestion',
    'suggestedNextSteps',
    'trustedContextKeys',
  ],
} as const;

const EXPECTED_KEYS = new Set(Object.keys(REQUEST_ANALYSIS_JSON_SCHEMA.properties));
const UNSUPPORTED_REFERENCE = /https?:\/\/|www\.|\bSLA\b|\bguarantee(?:d)?\b|\+?\d[\d\s().-]{6,}\d/i;

function readText(value: unknown, field: string, maximum: number): string {
  if (typeof value !== 'string') {
    throw new RequestAnalysisValidationError(`${field} must be a string`);
  }
  const text = value.trim();
  if (!text || text.length > maximum) {
    throw new RequestAnalysisValidationError(`${field} has an invalid length`);
  }
  return text;
}

function readTextArray(
  value: unknown,
  field: string,
  maximumItems: number,
  maximumLength: number,
  minimumWords = 1,
): string[] {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new RequestAnalysisValidationError(`${field} must be a bounded array`);
  }
  const items = value.map((item) => readText(item, field, maximumLength));
  if (items.some((item) => item.split(/\s+/).length < minimumWords)) {
    throw new RequestAnalysisValidationError(`${field} contains an incomplete item`);
  }
  if (new Set(items.map((item) => item.toLowerCase())).size !== items.length) {
    throw new RequestAnalysisValidationError(`${field} contains duplicate values`);
  }
  return items;
}

export class RequestAnalysisValidationError extends Error {}

export function parseRequestAnalysis(
  raw: unknown,
  context: TrustedRequestContext,
): AiRequestAnalysis {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new RequestAnalysisValidationError('analysis must be an object');
  }
  const candidate = raw as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !EXPECTED_KEYS.has(key))) {
    throw new RequestAnalysisValidationError('analysis contains an unexpected property');
  }
  if (Object.keys(candidate).length !== EXPECTED_KEYS.size) {
    throw new RequestAnalysisValidationError('analysis is missing a required property');
  }

  const requestType = candidate.requestType;
  if (typeof requestType !== 'string' || !REQUEST_TYPES.includes(requestType as AiRequestType)) {
    throw new RequestAnalysisValidationError('requestType is not allowed');
  }
  const urgency = candidate.urgency;
  if (typeof urgency !== 'string' || !AI_URGENCIES.includes(urgency as AiUrgency)) {
    throw new RequestAnalysisValidationError('urgency is not allowed');
  }
  const suggestedDepartmentId = candidate.suggestedDepartmentId;
  if (
    suggestedDepartmentId !== null &&
    (typeof suggestedDepartmentId !== 'string' ||
      !context.departments.some((department) => department.id === suggestedDepartmentId))
  ) {
    throw new RequestAnalysisValidationError('suggestedDepartmentId is not active');
  }
  const expectedDepartmentId = requestType.startsWith('IT_')
    ? 'department-it'
    : requestType.startsWith('HR_')
      ? 'department-hr'
      : requestType.startsWith('FINANCE_')
        ? 'department-finance'
        : null;
  if (
    expectedDepartmentId
    && context.departments.some((department) => department.id === expectedDepartmentId)
    && suggestedDepartmentId !== expectedDepartmentId
  ) {
    throw new RequestAnalysisValidationError(
      'suggestedDepartmentId is inconsistent with requestType',
    );
  }
  if (typeof candidate.needsClarification !== 'boolean') {
    throw new RequestAnalysisValidationError('needsClarification must be a boolean');
  }
  const clarificationQuestion =
    candidate.clarificationQuestion === null
      ? null
      : readText(candidate.clarificationQuestion, 'clarificationQuestion', 200);
  if (candidate.needsClarification !== (clarificationQuestion !== null)) {
    throw new RequestAnalysisValidationError('clarification state is inconsistent');
  }

  const summary = readText(candidate.summary, 'summary', 160);
  const suggestedNextSteps = readTextArray(
    candidate.suggestedNextSteps,
    'suggestedNextSteps',
    3,
    160,
    4,
  );
  const generatedText = [summary, clarificationQuestion ?? '', ...suggestedNextSteps];
  if (generatedText.some((text) => UNSUPPORTED_REFERENCE.test(text))) {
    throw new RequestAnalysisValidationError('analysis contains an untrusted external reference');
  }
  const trustedContextKeys = readTextArray(
    candidate.trustedContextKeys,
    'trustedContextKeys',
    0,
    100,
  );
  const suppliedKeys = new Set(context.playbooks.map((playbook) => playbook.key));
  if (trustedContextKeys.some((key) => !suppliedKeys.has(key))) {
    throw new RequestAnalysisValidationError('analysis cites context that was not supplied');
  }

  return {
    requestType: requestType as AiRequestType,
    summary,
    suggestedDepartmentId,
    urgency: urgency as AiUrgency,
    needsClarification: candidate.needsClarification,
    clarificationQuestion,
    suggestedNextSteps,
    trustedContextKeys,
  };
}
