-- CreateEnum
CREATE TYPE "TimeEntrySource" AS ENUM ('TIMER', 'MANUAL');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('RUNNING', 'STOPPED', 'DELETED');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "estimatedMinutes" INTEGER;

-- CreateTable
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "description" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "source" "TimeEntrySource" NOT NULL DEFAULT 'TIMER',
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'RUNNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_entries_organizationId_idx" ON "time_entries"("organizationId");

-- CreateIndex
CREATE INDEX "time_entries_taskId_idx" ON "time_entries"("taskId");

-- CreateIndex
CREATE INDEX "time_entries_projectId_idx" ON "time_entries"("projectId");

-- CreateIndex
CREATE INDEX "time_entries_clientId_idx" ON "time_entries"("clientId");

-- CreateIndex
CREATE INDEX "time_entries_clerkUserId_idx" ON "time_entries"("clerkUserId");

-- CreateIndex
CREATE INDEX "time_entries_status_idx" ON "time_entries"("status");

-- CreateIndex
CREATE INDEX "time_entries_startedAt_idx" ON "time_entries"("startedAt");

-- CreateIndex
CREATE INDEX "time_entries_endedAt_idx" ON "time_entries"("endedAt");

-- CreateIndex
CREATE INDEX "time_entries_deletedAt_idx" ON "time_entries"("deletedAt");

-- CreateIndex
CREATE INDEX "time_entries_organizationId_taskId_idx" ON "time_entries"("organizationId", "taskId");

-- CreateIndex
CREATE INDEX "time_entries_organizationId_projectId_idx" ON "time_entries"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "time_entries_organizationId_clerkUserId_idx" ON "time_entries"("organizationId", "clerkUserId");

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
