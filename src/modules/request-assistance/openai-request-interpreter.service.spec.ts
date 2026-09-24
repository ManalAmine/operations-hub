import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { OpenAiRequestInterpreter } from './openai-request-interpreter.service';
import { InterpretRequestInput } from './request-assistance.contract';
import { RequestInterpretationError } from './request-interpreter';

const input: InterpretRequestInput = {
  request: {
    title: 'Laptop stopped working',
    description: 'My laptop stopped working and I need it before tomorrow.',
    selectedDepartmentId: 'department-it',
  },
  trustedContext: {
    departments: [{ id: 'department-it', name: 'IT' }],
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
  },
};

const goodAnalysis = {
  requestType: 'IT_HARDWARE',
  summary: 'Employee laptop stopped working and is needed before tomorrow.',
  suggestedDepartmentId: 'department-it',
  urgency: 'HIGH',
  needsClarification: false,
  clarificationQuestion: null,
  suggestedNextSteps: ['Check the approved charger.'],
  trustedContextKeys: [],
};

function responseWith(content: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: JSON.stringify(content) }],
        },
      ],
    }),
    { status },
  );
}

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_REQUEST_MODEL;
});

describe('OpenAI request interpreter boundary', () => {
  it('separates employee text from trusted context and requests strict stateless output', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(responseWith(goodAnalysis));

    const result = await new OpenAiRequestInterpreter().interpret(input);

    expect(result.analysis.requestType).toBe('IT_HARDWARE');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.store).toBe(false);
    expect(body.instructions).toContain('already submitted');
    expect(body.instructions).toContain('Never suggest submitting it again');
    expect(body.text.format.type).toBe('json_schema');
    expect(body.text.format.strict).toBe(true);
    const sentInput = JSON.parse(body.input);
    expect(sentInput.request.description).toContain('before tomorrow');
    expect(sentInput.trustedContext.playbooks).toEqual([]);
    expect(body.instructions).toContain('Generate suggestedNextSteps directly from the request');
    expect(JSON.stringify(sentInput)).not.toContain('alice@example.com');
  });

  it('classifies a malformed successful response as invalid output', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    jest.spyOn(global, 'fetch').mockResolvedValue(
      responseWith({ ...goodAnalysis, requestType: 'MODEL_INVENTED_THIS' }),
    );

    await expect(new OpenAiRequestInterpreter().interpret(input)).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
    });
  });

  it('classifies provider outages without exposing the provider body', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'secret provider diagnostic' } }), {
        status: 503,
      }),
    );

    const promise = new OpenAiRequestInterpreter().interpret(input);
    await expect(promise).rejects.toBeInstanceOf(RequestInterpretationError);
    await expect(promise).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    await expect(promise).rejects.not.toThrow('secret provider diagnostic');
  });

  it('fails safely when the API key is not configured', async () => {
    await expect(new OpenAiRequestInterpreter().interpret(input)).rejects.toMatchObject({
      code: 'CONFIGURATION',
    });
  });
});
