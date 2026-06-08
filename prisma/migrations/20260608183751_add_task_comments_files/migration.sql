-- CreateEnum
CREATE TYPE "TaskCommentType" AS ENUM ('COMMENT', 'SYSTEM', 'APPROVAL', 'CHANGE_REQUEST');

-- CreateEnum
CREATE TYPE "TaskFileCategory" AS ENUM ('ATTACHMENT', 'CREATIVE', 'BRIEFING', 'CONTRACT', 'REFERENCE', 'FINAL');

-- CreateTable
CREATE TABLE "task_comments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "TaskCommentType" NOT NULL DEFAULT 'COMMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_files" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "uploadedByClerkUserId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "category" "TaskFileCategory" NOT NULL DEFAULT 'ATTACHMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "task_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_activities" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "clerkUserId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_comments_organizationId_idx" ON "task_comments"("organizationId");

-- CreateIndex
CREATE INDEX "task_comments_taskId_idx" ON "task_comments"("taskId");

-- CreateIndex
CREATE INDEX "task_comments_clerkUserId_idx" ON "task_comments"("clerkUserId");

-- CreateIndex
CREATE INDEX "task_comments_deletedAt_idx" ON "task_comments"("deletedAt");

-- CreateIndex
CREATE INDEX "task_comments_organizationId_taskId_idx" ON "task_comments"("organizationId", "taskId");

-- CreateIndex
CREATE INDEX "task_files_organizationId_idx" ON "task_files"("organizationId");

-- CreateIndex
CREATE INDEX "task_files_taskId_idx" ON "task_files"("taskId");

-- CreateIndex
CREATE INDEX "task_files_uploadedByClerkUserId_idx" ON "task_files"("uploadedByClerkUserId");

-- CreateIndex
CREATE INDEX "task_files_category_idx" ON "task_files"("category");

-- CreateIndex
CREATE INDEX "task_files_deletedAt_idx" ON "task_files"("deletedAt");

-- CreateIndex
CREATE INDEX "task_files_organizationId_taskId_idx" ON "task_files"("organizationId", "taskId");

-- CreateIndex
CREATE INDEX "task_activities_organizationId_idx" ON "task_activities"("organizationId");

-- CreateIndex
CREATE INDEX "task_activities_taskId_idx" ON "task_activities"("taskId");

-- CreateIndex
CREATE INDEX "task_activities_type_idx" ON "task_activities"("type");

-- CreateIndex
CREATE INDEX "task_activities_createdAt_idx" ON "task_activities"("createdAt");

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
