const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  departmentIds: string[];
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Department {
  id: string;
  name: string;
}

export type RequestStatus = 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED';

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  currentStatus: RequestStatus;
  requesterName: string;
  departmentId: string;
  departmentName: string;
  createdAt: string;
  allowedNextStatuses: RequestStatus[];
  statusHistory: Array<{
    id: string;
    fromStatus: RequestStatus | null;
    toStatus: RequestStatus;
    changedByName: string;
    createdAt: string;
  }>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    throw new ApiError(response.status, message ?? 'The request could not be completed.');
  }
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    call<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  departments: (token: string) => call<Department[]>('/departments', {}, token),
  requests: (token: string) => call<ServiceRequest[]>('/requests', {}, token),
  createRequest: (
    token: string,
    input: { title: string; description: string; departmentId: string },
  ) =>
    call<ServiceRequest>(
      '/requests',
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
  updateStatus: (
    token: string,
    requestId: string,
    status: RequestStatus,
    expectedCurrentStatus: RequestStatus,
  ) =>
    call<ServiceRequest>(
      `/requests/${requestId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status, expectedCurrentStatus }) },
      token,
    ),
};
