-- CreateEnum
CREATE TYPE "TaskApprovalStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "approvalRequestedAt" TIMESTAMP(3),
ADD COLUMN     "approvalRequestedByClerkUserId" TEXT,
ADD COLUMN     "approvalStatus" "TaskApprovalStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByClerkUserId" TEXT,
ADD COLUMN     "changeRequestedAt" TIMESTAMP(3),
ADD COLUMN     "changeRequestedByClerkUserId" TEXT;
