import { describe, expect, it } from '@jest/globals';
import { TrustedRequestContextService } from './trusted-request-context.service';

const departments = [
  { id: 'department-it', name: 'IT' },
  { id: 'department-hr', name: 'HR' },
  { id: 'department-finance', name: 'Finance' },
];

describe('TrustedRequestContextService', () => {
  it('supplies only active product constraints and no prewritten guidance', () => {
    const context = new TrustedRequestContextService().build(departments, 'department-it');

    expect(context.requestTypes).toContain('IT_NETWORK');
    expect(context.selectedDepartmentId).toBe('department-it');
    expect(context.departments).toEqual(departments);
    expect(context.playbooks).toEqual([]);
  });
});
