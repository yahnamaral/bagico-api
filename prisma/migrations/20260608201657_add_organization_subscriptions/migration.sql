-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "organization_subscriptions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "plan" "PlanType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_subscriptions_organizationId_idx" ON "organization_subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "organization_subscriptions_plan_idx" ON "organization_subscriptions"("plan");

-- CreateIndex
CREATE INDEX "organization_subscriptions_status_idx" ON "organization_subscriptions"("status");

-- CreateIndex
CREATE INDEX "organization_subscriptions_currentPeriodEnd_idx" ON "organization_subscriptions"("currentPeriodEnd");

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
