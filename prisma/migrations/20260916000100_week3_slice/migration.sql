CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "department_memberships" (
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    CONSTRAINT "department_memberships_pkey" PRIMARY KEY ("user_id", "department_id")
);

CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "current_status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_status_events" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "from_status" "RequestStatus",
    "to_status" "RequestStatus" NOT NULL,
    "changed_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "request_status_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");
CREATE INDEX "requests_requester_id_created_at_idx" ON "requests"("requester_id", "created_at");
CREATE INDEX "requests_department_id_current_status_created_at_idx" ON "requests"("department_id", "current_status", "created_at");
CREATE INDEX "request_status_events_request_id_created_at_idx" ON "request_status_events"("request_id", "created_at");

ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "request_status_events" ADD CONSTRAINT "request_status_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_status_events" ADD CONSTRAINT "request_status_events_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
