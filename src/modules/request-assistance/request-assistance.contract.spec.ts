import { describe, expect, it } from '@jest/globals';
import {
  parseRequestAnalysis,
  RequestAnalysisValidationError,
  TrustedRequestContext,
} from './request-assistance.contract';

const context: TrustedRequestContext = {
  departments: [
    { id: 'department-it', name: 'IT' },
    { id: 'department-hr', name: 'HR' },
    { id: 'department-finance', name: 'Finance' },
  ],
  selectedDepartmentId: 'department-it',
  requestTypes: [
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
  ],
  playbooks: [],
};

const valid = {
  requestType: 'IT_HARDWARE',
  summary: 'Employee laptop does not power on.',
  suggestedDepartmentId: 'department-it',
  urgency: 'NORMAL',
  needsClarification: false,
  clarificationQuestion: null,
  suggestedNextSteps: ['Connect the approved charger and check the power indicator.'],
  trustedContextKeys: [],
};

describe('AI request analysis contract', () => {
  it('accepts complete model-generated guidance and rebuilds the product object', () => {
    expect(parseRequestAnalysis(valid, context)).toEqual(valid);
  });

  it('supports unclear input through an explicit clarification question', () => {
    const result = parseRequestAnalysis(
      {
        ...valid,
        requestType: 'OTHER',
        suggestedDepartmentId: null,
        needsClarification: true,
        clarificationQuestion: 'Which department or service do you need help from?',
        suggestedNextSteps: [],
        trustedContextKeys: [],
      },
      context,
    );
    expect(result.needsClarification).toBe(true);
  });

  it('rejects an invented request type', () => {
    expect(() => parseRequestAnalysis({ ...valid, requestType: 'VIP_SUPPORT' }, context)).toThrow(
      RequestAnalysisValidationError,
    );
  });

  it('rejects an inactive or invented department', () => {
    expect(() =>
      parseRequestAnalysis({ ...valid, suggestedDepartmentId: 'department-legal' }, context),
    ).toThrow(RequestAnalysisValidationError);
  });

  it('accepts model-generated guidance when routing differs from the selected department', () => {
    const result = parseRequestAnalysis(
      {
        ...valid,
        requestType: 'HR_EMPLOYEE_SUPPORT',
        summary: 'Employee expects to be late for a work meeting.',
        suggestedDepartmentId: 'department-hr',
        suggestedNextSteps: ['Notify the meeting organizer that you may be late.'],
        trustedContextKeys: [],
      },
      context,
    );
    expect(result.suggestedDepartmentId).toBe('department-hr');
  });

  it('rejects routing that conflicts with the classified request type', () => {
    expect(() => parseRequestAnalysis(
      {
        ...valid,
        requestType: 'HR_EMPLOYEE_SUPPORT',
        suggestedDepartmentId: 'department-it',
      },
      context,
    )).toThrow('suggestedDepartmentId is inconsistent with requestType');
  });

  it('rejects inconsistent clarification behavior', () => {
    expect(() =>
      parseRequestAnalysis({ ...valid, needsClarification: true }, context),
    ).toThrow(RequestAnalysisValidationError);
  });

  it('rejects phone numbers and URLs that were not supplied as trusted context', () => {
    expect(() =>
      parseRequestAnalysis(
        { ...valid, suggestedNextSteps: ['Call IT at 555-0100 or visit https://example.test.'] },
        context,
      ),
    ).toThrow(RequestAnalysisValidationError);
  });

  it('rejects any trusted-context key because no company knowledge is supplied', () => {
    expect(() =>
      parseRequestAnalysis({ ...valid, trustedContextKeys: ['it.secret.policy'] }, context),
    ).toThrow(RequestAnalysisValidationError);
  });

  it('rejects a fragmented suggested action', () => {
    expect(() =>
      parseRequestAnalysis(
        {
          ...valid,
          suggestedNextSteps: [
            'Notify the meeting organizer that you may be late.',
            'available.',
          ],
          trustedContextKeys: [],
        },
        context,
      ),
    ).toThrow('suggestedNextSteps contains an incomplete item');
  });

  it('rejects provider-owned extra fields such as confidence or reasoning', () => {
    expect(() =>
      parseRequestAnalysis({ ...valid, confidence: 0.99, reasoning: 'hidden' }, context),
    ).toThrow(RequestAnalysisValidationError);
  });
});
