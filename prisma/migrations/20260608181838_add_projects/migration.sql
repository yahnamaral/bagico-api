-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FINISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "budget" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_priority_idx" ON "projects"("priority");

-- CreateIndex
CREATE INDEX "projects_deletedAt_idx" ON "projects"("deletedAt");

-- CreateIndex
CREATE INDEX "projects_organizationId_clientId_idx" ON "projects"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "projects_organizationId_status_idx" ON "projects"("organizationId", "status");

-- CreateIndex
CREATE INDEX "projects_organizationId_name_idx" ON "projects"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
