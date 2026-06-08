-- CreateEnum
CREATE TYPE "OrganizationMemberStatus" AS ENUM ('ACTIVE', 'REMOVED', 'PENDING');

-- CreateEnum
CREATE TYPE "OrganizationInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "organization_members" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "invitedEmail" TEXT,
ADD COLUMN     "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "organization_invites" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByClerkUserId" TEXT NOT NULL,
    "acceptedByClerkUserId" TEXT,
    "status" "OrganizationInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_invites_tokenHash_key" ON "organization_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "organization_invites_organizationId_idx" ON "organization_invites"("organizationId");

-- CreateIndex
CREATE INDEX "organization_invites_email_idx" ON "organization_invites"("email");

-- CreateIndex
CREATE INDEX "organization_invites_role_idx" ON "organization_invites"("role");

-- CreateIndex
CREATE INDEX "organization_invites_status_idx" ON "organization_invites"("status");

-- CreateIndex
CREATE INDEX "organization_invites_expiresAt_idx" ON "organization_invites"("expiresAt");

-- CreateIndex
CREATE INDEX "organization_invites_tokenHash_idx" ON "organization_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "organization_invites_deletedAt_idx" ON "organization_invites"("deletedAt");

-- CreateIndex
CREATE INDEX "organization_members_organizationId_idx" ON "organization_members"("organizationId");

-- CreateIndex
CREATE INDEX "organization_members_role_idx" ON "organization_members"("role");

-- CreateIndex
CREATE INDEX "organization_members_status_idx" ON "organization_members"("status");

-- CreateIndex
CREATE INDEX "organization_members_deletedAt_idx" ON "organization_members"("deletedAt");

-- AddForeignKey
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
