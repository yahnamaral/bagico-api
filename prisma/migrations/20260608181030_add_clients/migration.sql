-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "segment" TEXT,
    "notes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_organizationId_idx" ON "clients"("organizationId");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_deletedAt_idx" ON "clients"("deletedAt");

-- CreateIndex
CREATE INDEX "clients_organizationId_name_idx" ON "clients"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
