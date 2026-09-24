import { APIRequestContext, expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';

const apiUrl = 'http://127.0.0.1:3100/api';
const prisma = new PrismaClient();
const runId = randomUUID();
const password = `E2E-${randomUUID()}!`;
const employeeId = `e2e-employee-${runId}`;
const staffId = `e2e-staff-${runId}`;
const otherStaffId = `e2e-other-staff-${runId}`;
const departmentId = `e2e-it-${runId}`;
const otherDepartmentId = `e2e-hr-${runId}`;
const employeeEmail = `employee-${runId}@example.test`;
const staffEmail = `staff-${runId}@example.test`;
const otherStaffEmail = `other-staff-${runId}@example.test`;

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.department.createMany({
    data: [
      { id: departmentId, name: `E2E IT ${runId}` },
      { id: otherDepartmentId, name: `E2E HR ${runId}` },
    ],
  });
  await prisma.user.create({
    data: {
      id: employeeId,
      name: 'E2E Employee',
      email: employeeEmail,
      passwordHash,
    },
  });
  await prisma.user.create({
    data: {
      id: staffId,
      name: 'E2E IT Staff',
      email: staffEmail,
      passwordHash,
      memberships: { create: { departmentId } },
    },
  });
  await prisma.user.create({
    data: {
      id: otherStaffId,
      name: 'E2E Other Staff',
      email: otherStaffEmail,
      passwordHash,
      memberships: { create: { departmentId: otherDepartmentId } },
    },
  });
});

test.afterAll(async () => {
  await prisma.request.deleteMany({ where: { requesterId: employeeId } });
  await prisma.user.deleteMany({
    where: { id: { in: [employeeId, staffId, otherStaffId] } },
  });
  await prisma.department.deleteMany({
    where: { id: { in: [departmentId, otherDepartmentId] } },
  });
  await prisma.$disconnect();
});

async function apiLogin(request: APIRequestContext, email: string) {
  const response = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ accessToken: string }>;
}

test('employee submits a request, wrong department is denied, and IT staff advances it', async ({ page, request }) => {
  const uniqueTitle = `[E2E] VPN access ${Date.now()}`;

  await page.goto('/');
  await page.getByLabel('Work email').fill(employeeEmail);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.getByLabel('Title').fill(uniqueTitle);
  await page.getByLabel('Description').fill('The company VPN times out whenever I try to connect.');
  await page.getByLabel('Department').selectOption(departmentId);
  await page.getByRole('button', { name: 'Submit request' }).click();

  const employeeCard = page.locator('.request-card').filter({ hasText: uniqueTitle });
  await expect(employeeCard).toContainText('SUBMITTED');
  const requestId = await employeeCard.getAttribute('data-request-id');
  expect(requestId).toBeTruthy();

  const hr = await apiLogin(request, otherStaffEmail);
  const denied = await request.patch(`${apiUrl}/requests/${requestId}/status`, {
    headers: { Authorization: `Bearer ${hr.accessToken}` },
    data: { status: 'IN_PROGRESS', expectedCurrentStatus: 'SUBMITTED' },
  });
  expect(denied.status()).toBe(403);
  const deniedReply = await request.post(`${apiUrl}/requests/${requestId}/comments`, {
    headers: { Authorization: `Bearer ${hr.accessToken}` },
    data: { body: 'A different department must not see or reply to this request.' },
  });
  expect(deniedReply.status()).toBe(403);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Work email').fill(staffEmail);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  const staffCard = page.locator('.request-card').filter({ hasText: uniqueTitle });
  await expect(staffCard).toBeVisible();
  await staffCard.getByRole('button', { name: 'Mark as in progress' }).click();
  await expect(staffCard).toContainText('IN PROGRESS');

  await staffCard.getByLabel(`Update for ${uniqueTitle}`).fill('IT is checking the VPN configuration.');
  await staffCard.getByRole('button', { name: 'Post an update' }).click();
  await expect(staffCard).toContainText('IT is checking the VPN configuration.');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Work email').fill(employeeEmail);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const employeeReplyCard = page.locator('.request-card').filter({ hasText: uniqueTitle });
  await employeeReplyCard
    .getByLabel(`Reply to E2E IT Staff on ${uniqueTitle}`)
    .fill('The issue still occurs after restarting my laptop.');
  await employeeReplyCard.getByRole('button', { name: 'Reply to message' }).click();
  await expect(employeeReplyCard).toContainText('The issue still occurs after restarting my laptop.');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Work email').fill(staffEmail);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  const it = await apiLogin(request, staffEmail);
  const stale = await request.patch(`${apiUrl}/requests/${requestId}/status`, {
    headers: { Authorization: `Bearer ${it.accessToken}` },
    data: {
      status: 'RESOLVED',
      expectedCurrentStatus: 'SUBMITTED',
      resolutionNote: 'This stale update must not be accepted.',
    },
  });
  expect(stale.status()).toBe(409);

  await staffCard.getByLabel(`Resolution note for ${uniqueTitle}`).fill(
    'The VPN configuration was corrected and the connection was verified.',
  );
  await staffCard.getByRole('button', { name: 'Mark as resolved' }).click();
  await expect(staffCard).toContainText('RESOLVED');
  await expect(staffCard).toContainText('The VPN configuration was corrected');
  await expect(staffCard).toContainText('This request is closed. The conversation is read-only.');
  await expect(staffCard.getByLabel(`Update for ${uniqueTitle}`)).toHaveCount(0);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Work email').fill(employeeEmail);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const resolvedEmployeeCard = page.locator('.request-card').filter({ hasText: uniqueTitle });
  await expect(resolvedEmployeeCard).toContainText('IT is checking the VPN configuration.');
  await expect(resolvedEmployeeCard).toContainText('The issue still occurs after restarting my laptop.');
  await expect(resolvedEmployeeCard).toContainText('The VPN configuration was corrected');
  await expect(resolvedEmployeeCard).toContainText('This request is closed. The conversation is read-only.');
  await expect(resolvedEmployeeCard.getByLabel(`Reply to E2E IT Staff on ${uniqueTitle}`)).toHaveCount(0);
});
