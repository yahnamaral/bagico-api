-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_COMMENT_CREATED', 'TASK_FILE_UPLOADED', 'TASK_APPROVAL_REQUESTED', 'TASK_APPROVED', 'TASK_CHANGES_REQUESTED', 'PORTAL_COMMENT_CREATED', 'MEMBER_INVITED', 'CLIENT_PORTAL_INVITED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM ('TASK', 'PROJECT', 'CLIENT', 'BOARD', 'COMMENT', 'FILE', 'INVITE', 'ORGANIZATION');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "recipientClerkUserId" TEXT NOT NULL,
    "actorClerkUserId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "entityType" "NotificationEntityType",
    "entityId" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_organizationId_idx" ON "notifications"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_recipientClerkUserId_idx" ON "notifications"("recipientClerkUserId");

-- CreateIndex
CREATE INDEX "notifications_actorClerkUserId_idx" ON "notifications"("actorClerkUserId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_entityType_idx" ON "notifications"("entityType");

-- CreateIndex
CREATE INDEX "notifications_entityId_idx" ON "notifications"("entityId");

-- CreateIndex
CREATE INDEX "notifications_readAt_idx" ON "notifications"("readAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_deletedAt_idx" ON "notifications"("deletedAt");

-- CreateIndex
CREATE INDEX "notifications_organizationId_recipientClerkUserId_idx" ON "notifications"("organizationId", "recipientClerkUserId");

-- CreateIndex
CREATE INDEX "notifications_organizationId_recipientClerkUserId_readAt_idx" ON "notifications"("organizationId", "recipientClerkUserId", "readAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
