import { describe, expect, it } from '@jest/globals';
import { RequestStatus } from './requests.data';
import { RequestLifecycle } from './requests.lifecycle';

describe('RequestLifecycle', () => {
  it('allows the established forward lifecycle', () => {
    expect(
      RequestLifecycle.canTransition(
        RequestStatus.SUBMITTED,
        RequestStatus.IN_PROGRESS,
      ),
    ).toBe(true);
    expect(
      RequestLifecycle.canTransition(
        RequestStatus.IN_PROGRESS,
        RequestStatus.RESOLVED,
      ),
    ).toBe(true);
  });

  it('protects against skipping directly from submitted to resolved', () => {
    expect(
      RequestLifecycle.canTransition(
        RequestStatus.SUBMITTED,
        RequestStatus.RESOLVED,
      ),
    ).toBe(false);
  });

  it('protects against moving backward from resolved', () => {
    expect(RequestLifecycle.nextStatuses(RequestStatus.RESOLVED)).toEqual([]);
  });
});
