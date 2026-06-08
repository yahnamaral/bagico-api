-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "boards" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_columns" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "board_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "columnId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "mediaType" TEXT,
    "dueDate" TIMESTAMP(3),
    "position" INTEGER NOT NULL,
    "isRework" BOOLEAN NOT NULL DEFAULT false,
    "createdByClerkUserId" TEXT NOT NULL,
    "assignedToClerkUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "boards_organizationId_idx" ON "boards"("organizationId");

-- CreateIndex
CREATE INDEX "boards_projectId_idx" ON "boards"("projectId");

-- CreateIndex
CREATE INDEX "boards_deletedAt_idx" ON "boards"("deletedAt");

-- CreateIndex
CREATE INDEX "boards_organizationId_projectId_idx" ON "boards"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "board_columns_organizationId_idx" ON "board_columns"("organizationId");

-- CreateIndex
CREATE INDEX "board_columns_boardId_idx" ON "board_columns"("boardId");

-- CreateIndex
CREATE INDEX "board_columns_position_idx" ON "board_columns"("position");

-- CreateIndex
CREATE INDEX "board_columns_deletedAt_idx" ON "board_columns"("deletedAt");

-- CreateIndex
CREATE INDEX "board_columns_organizationId_boardId_idx" ON "board_columns"("organizationId", "boardId");

-- CreateIndex
CREATE INDEX "tasks_organizationId_idx" ON "tasks"("organizationId");

-- CreateIndex
CREATE INDEX "tasks_boardId_idx" ON "tasks"("boardId");

-- CreateIndex
CREATE INDEX "tasks_columnId_idx" ON "tasks"("columnId");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_clientId_idx" ON "tasks"("clientId");

-- CreateIndex
CREATE INDEX "tasks_assignedToClerkUserId_idx" ON "tasks"("assignedToClerkUserId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

-- CreateIndex
CREATE INDEX "tasks_position_idx" ON "tasks"("position");

-- CreateIndex
CREATE INDEX "tasks_deletedAt_idx" ON "tasks"("deletedAt");

-- CreateIndex
CREATE INDEX "tasks_organizationId_boardId_idx" ON "tasks"("organizationId", "boardId");

-- CreateIndex
CREATE INDEX "tasks_organizationId_columnId_idx" ON "tasks"("organizationId", "columnId");

-- CreateIndex
CREATE INDEX "tasks_organizationId_projectId_idx" ON "tasks"("organizationId", "projectId");

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "board_columns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
