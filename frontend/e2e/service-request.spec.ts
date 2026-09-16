import { APIRequestContext, expect, test } from '@playwright/test';

const password = 'Password123!';
const apiUrl = 'http://127.0.0.1:3100/api';

async function apiLogin(request: APIRequestContext, email: string) {
  const response = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ accessToken: string }>;
}

test('employee submits a request, wrong department is denied, and IT staff advances it', async ({ page, request }) => {
  const uniqueTitle = `VPN access ${Date.now()}`;

  await page.goto('/');
  await page.getByLabel('Work email').fill('alice@example.com');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.getByLabel('Title').fill(uniqueTitle);
  await page.getByLabel('Description').fill('The company VPN times out whenever I try to connect.');
  await page.getByLabel('Department').selectOption('department-it');
  await page.getByRole('button', { name: 'Submit request' }).click();

  const employeeCard = page.locator('.request-card').filter({ hasText: uniqueTitle });
  await expect(employeeCard).toContainText('SUBMITTED');
  const requestId = await employeeCard.getAttribute('data-request-id');
  expect(requestId).toBeTruthy();

  const hr = await apiLogin(request, 'hannah@example.com');
  const denied = await request.patch(`${apiUrl}/requests/${requestId}/status`, {
    headers: { Authorization: `Bearer ${hr.accessToken}` },
    data: { status: 'IN_PROGRESS', expectedCurrentStatus: 'SUBMITTED' },
  });
  expect(denied.status()).toBe(403);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Work email').fill('ivan@example.com');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  const staffCard = page.locator('.request-card').filter({ hasText: uniqueTitle });
  await expect(staffCard).toBeVisible();
  await staffCard.getByRole('button', { name: 'Move to IN PROGRESS' }).click();
  await expect(staffCard).toContainText('IN PROGRESS');

  const it = await apiLogin(request, 'ivan@example.com');
  const stale = await request.patch(`${apiUrl}/requests/${requestId}/status`, {
    headers: { Authorization: `Bearer ${it.accessToken}` },
    data: { status: 'RESOLVED', expectedCurrentStatus: 'SUBMITTED' },
  });
  expect(stale.status()).toBe(409);
});
