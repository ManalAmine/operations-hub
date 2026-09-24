import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, jest } from '@jest/globals';
import { OpenAiRequestInterpreter } from '../../src/modules/request-assistance/openai-request-interpreter.service';
import { TrustedRequestContextService } from '../../src/modules/request-assistance/trusted-request-context.service';

type EvaluationCase = {
  id: string;
  title: string;
  description: string;
  selectedDepartmentId: string;
  expectedTypes: string[];
  expectedUrgency?: string;
  expectedClarification?: boolean;
  expectedSuggestedDepartmentId?: string;
  requiredContextKeys?: string[];
  minimumNextSteps?: number;
  requiredText?: string[];
  forbiddenText: string[];
};

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required for npm run eval:ai');
}

const cases = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'request-ai-evals.json'), 'utf8'),
) as EvaluationCase[];
const departments = [
  { id: 'department-it', name: 'IT' },
  { id: 'department-hr', name: 'HR' },
  { id: 'department-finance', name: 'Finance' },
];
const trustedContextService = new TrustedRequestContextService();
const interpreter = new OpenAiRequestInterpreter();

jest.setTimeout(45_000);

describe('configured OpenAI request interpretation', () => {
  for (const evaluation of cases) {
    it(evaluation.id, async () => {
      const result = await interpreter.interpret({
        request: {
          title: evaluation.title,
          description: evaluation.description,
          selectedDepartmentId: evaluation.selectedDepartmentId,
        },
        trustedContext: trustedContextService.build(
          departments,
          evaluation.selectedDepartmentId,
        ),
      });

      expect(evaluation.expectedTypes).toContain(result.analysis.requestType);
      if (evaluation.expectedClarification !== undefined) {
        expect(result.analysis.needsClarification).toBe(evaluation.expectedClarification);
      }
      if (evaluation.expectedUrgency) {
        expect(result.analysis.urgency).toBe(evaluation.expectedUrgency);
      }
      if (evaluation.expectedSuggestedDepartmentId) {
        expect(result.analysis.suggestedDepartmentId).toBe(
          evaluation.expectedSuggestedDepartmentId,
        );
      }
      for (const key of evaluation.requiredContextKeys ?? []) {
        expect(result.analysis.trustedContextKeys).toContain(key);
      }
      const displayedText = JSON.stringify(result.analysis).toLowerCase();
      if (evaluation.minimumNextSteps !== undefined) {
        expect(result.analysis.suggestedNextSteps.length).toBeGreaterThanOrEqual(
          evaluation.minimumNextSteps,
        );
      }
      for (const required of evaluation.requiredText ?? []) {
        expect(displayedText).toContain(required.toLowerCase());
      }
      for (const forbidden of evaluation.forbiddenText) {
        expect(displayedText).not.toContain(forbidden.toLowerCase());
      }
    });
  }
});
