-- CreateEnum
CREATE TYPE "ClientPortalInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "client_portal_invites" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ClientPortalRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByClerkUserId" TEXT NOT NULL,
    "acceptedByClerkUserId" TEXT,
    "status" "ClientPortalInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "client_portal_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_portal_invites_tokenHash_key" ON "client_portal_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "client_portal_invites_organizationId_idx" ON "client_portal_invites"("organizationId");

-- CreateIndex
CREATE INDEX "client_portal_invites_clientId_idx" ON "client_portal_invites"("clientId");

-- CreateIndex
CREATE INDEX "client_portal_invites_email_idx" ON "client_portal_invites"("email");

-- CreateIndex
CREATE INDEX "client_portal_invites_status_idx" ON "client_portal_invites"("status");

-- CreateIndex
CREATE INDEX "client_portal_invites_expiresAt_idx" ON "client_portal_invites"("expiresAt");

-- CreateIndex
CREATE INDEX "client_portal_invites_deletedAt_idx" ON "client_portal_invites"("deletedAt");

-- AddForeignKey
ALTER TABLE "client_portal_invites" ADD CONSTRAINT "client_portal_invites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_portal_invites" ADD CONSTRAINT "client_portal_invites_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
