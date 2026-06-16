-- CreateEnum
CREATE TYPE "TaskApproverKind" AS ENUM ('INTERNAL', 'CLIENT');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "responsibleApproverClerkUserId" TEXT,
ADD COLUMN     "responsibleApproverKind" "TaskApproverKind";

-- CreateIndex
CREATE INDEX "tasks_responsibleApproverClerkUserId_idx" ON "tasks"("responsibleApproverClerkUserId");
