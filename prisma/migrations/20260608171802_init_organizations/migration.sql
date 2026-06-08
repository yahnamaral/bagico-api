-- CreateEnum
CREATE TYPE "PersonaMode" AS ENUM ('AGENCY', 'BUSINESS');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('START', 'PRO', 'AGENCY');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_MANAGER', 'AGENCY_MAKER', 'FREELANCER', 'CLIENT_ADMIN', 'CLIENT_MANAGER', 'CLIENT_STAFF');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "personaMode" "PersonaMode" NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'START',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_clerkOrgId_key" ON "organizations"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_clerkOrgId_idx" ON "organizations"("clerkOrgId");

-- CreateIndex
CREATE INDEX "organization_members_clerkUserId_idx" ON "organization_members"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_clerkUserId_key" ON "organization_members"("organizationId", "clerkUserId");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
