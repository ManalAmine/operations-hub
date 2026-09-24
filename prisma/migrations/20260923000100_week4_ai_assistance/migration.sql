CREATE TYPE "AiAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "AiRequestType" AS ENUM ('IT_HARDWARE', 'IT_SOFTWARE', 'IT_ACCESS', 'HR_POLICY', 'HR_EMPLOYEE_SUPPORT', 'FINANCE_EXPENSE', 'FINANCE_PAYROLL', 'OTHER');
CREATE TYPE "AiUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH');

CREATE TABLE "request_ai_analyses" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" "AiAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "request_type" "AiRequestType",
    "summary" TEXT,
    "suggested_department_id" TEXT,
    "urgency" "AiUrgency",
    "needs_clarification" BOOLEAN,
    "clarification_question" TEXT,
    "suggested_next_steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trusted_context_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provider" TEXT,
    "model" TEXT,
    "prompt_version" TEXT NOT NULL,
    "failure_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "request_ai_analyses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "request_ai_analyses_request_id_key" ON "request_ai_analyses"("request_id");

ALTER TABLE "request_ai_analyses" ADD CONSTRAINT "request_ai_analyses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
