import { RequestStatus } from './requests.data';

const transitions: Readonly<Record<RequestStatus, readonly RequestStatus[]>> = {
  [RequestStatus.SUBMITTED]: [RequestStatus.IN_PROGRESS],
  [RequestStatus.IN_PROGRESS]: [RequestStatus.RESOLVED],
  [RequestStatus.RESOLVED]: [],
};

export class RequestLifecycle {
  static canTransition(from: RequestStatus, to: RequestStatus): boolean {
    return transitions[from].includes(to);
  }

  static nextStatuses(status: RequestStatus): readonly RequestStatus[] {
    return transitions[status];
  }

  static describe() {
    return {
      initialStatus: RequestStatus.SUBMITTED,
      terminalStatus: RequestStatus.RESOLVED,
      states: [
        {
          status: RequestStatus.SUBMITTED,
          meaning: 'Created and waiting for the responsible department.',
        },
        {
          status: RequestStatus.IN_PROGRESS,
          meaning: 'The responsible department is actively handling it.',
        },
        {
          status: RequestStatus.RESOLVED,
          meaning: 'The work is complete; this is a terminal state.',
        },
      ],
      allowedTransitions: [
        { from: RequestStatus.SUBMITTED, to: RequestStatus.IN_PROGRESS },
        { from: RequestStatus.IN_PROGRESS, to: RequestStatus.RESOLVED },
      ],
      rules: [
        'A new request always starts as SUBMITTED.',
        'States cannot be skipped or moved backward.',
        'expectedCurrentStatus must match the stored state before an update succeeds.',
        'Every successful transition is appended to statusHistory.',
        'Staff messages and employee replies are optional during IN_PROGRESS only.',
        'The conversation closes at RESOLVED.',
      ],
    };
  }
}
