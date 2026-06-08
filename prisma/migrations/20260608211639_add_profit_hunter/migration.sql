-- CreateEnum
CREATE TYPE "RevenueContractType" AS ENUM ('RECURRING', 'PROJECT_FIXED', 'HOURLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RevenueContractStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FINISHED', 'CANCELED');

-- CreateTable
CREATE TABLE "member_cost_rates" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "hourlyCost" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "member_cost_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_contracts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "projectId" UUID,
    "name" TEXT NOT NULL,
    "type" "RevenueContractType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "billingCycle" "BillingCycle",
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "RevenueContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "revenue_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_cost_rates_organizationId_idx" ON "member_cost_rates"("organizationId");

-- CreateIndex
CREATE INDEX "member_cost_rates_clerkUserId_idx" ON "member_cost_rates"("clerkUserId");

-- CreateIndex
CREATE INDEX "member_cost_rates_startsAt_idx" ON "member_cost_rates"("startsAt");

-- CreateIndex
CREATE INDEX "member_cost_rates_endsAt_idx" ON "member_cost_rates"("endsAt");

-- CreateIndex
CREATE INDEX "member_cost_rates_deletedAt_idx" ON "member_cost_rates"("deletedAt");

-- CreateIndex
CREATE INDEX "member_cost_rates_organizationId_clerkUserId_idx" ON "member_cost_rates"("organizationId", "clerkUserId");

-- CreateIndex
CREATE INDEX "revenue_contracts_organizationId_idx" ON "revenue_contracts"("organizationId");

-- CreateIndex
CREATE INDEX "revenue_contracts_clientId_idx" ON "revenue_contracts"("clientId");

-- CreateIndex
CREATE INDEX "revenue_contracts_projectId_idx" ON "revenue_contracts"("projectId");

-- CreateIndex
CREATE INDEX "revenue_contracts_type_idx" ON "revenue_contracts"("type");

-- CreateIndex
CREATE INDEX "revenue_contracts_status_idx" ON "revenue_contracts"("status");

-- CreateIndex
CREATE INDEX "revenue_contracts_startsAt_idx" ON "revenue_contracts"("startsAt");

-- CreateIndex
CREATE INDEX "revenue_contracts_endsAt_idx" ON "revenue_contracts"("endsAt");

-- CreateIndex
CREATE INDEX "revenue_contracts_deletedAt_idx" ON "revenue_contracts"("deletedAt");

-- CreateIndex
CREATE INDEX "revenue_contracts_organizationId_clientId_idx" ON "revenue_contracts"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "revenue_contracts_organizationId_projectId_idx" ON "revenue_contracts"("organizationId", "projectId");

-- AddForeignKey
ALTER TABLE "member_cost_rates" ADD CONSTRAINT "member_cost_rates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_contracts" ADD CONSTRAINT "revenue_contracts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_contracts" ADD CONSTRAINT "revenue_contracts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_contracts" ADD CONSTRAINT "revenue_contracts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
