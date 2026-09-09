export enum RequestStatus {
  SUBMITTED = 'SUBMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export interface RequestStatusEvent {
  id: string;
  requestId: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  requesterId: string;
  departmentId: string;
  title: string;
  description: string;
  currentStatus: RequestStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  statusHistory: RequestStatusEvent[];
}

/** Mock request data kept in memory until a database is added. */
export const REQUESTS: ServiceRequest[] = [];
