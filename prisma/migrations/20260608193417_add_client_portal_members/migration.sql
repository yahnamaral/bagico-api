-- CreateEnum
CREATE TYPE "ClientPortalRole" AS ENUM ('CLIENT_ADMIN', 'CLIENT_MANAGER', 'CLIENT_STAFF');

-- CreateTable
CREATE TABLE "client_members" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "role" "ClientPortalRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "client_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_members_organizationId_idx" ON "client_members"("organizationId");

-- CreateIndex
CREATE INDEX "client_members_clientId_idx" ON "client_members"("clientId");

-- CreateIndex
CREATE INDEX "client_members_clerkUserId_idx" ON "client_members"("clerkUserId");

-- CreateIndex
CREATE INDEX "client_members_role_idx" ON "client_members"("role");

-- CreateIndex
CREATE INDEX "client_members_deletedAt_idx" ON "client_members"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_members_organizationId_clientId_clerkUserId_key" ON "client_members"("organizationId", "clientId", "clerkUserId");

-- AddForeignKey
ALTER TABLE "client_members" ADD CONSTRAINT "client_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_members" ADD CONSTRAINT "client_members_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
