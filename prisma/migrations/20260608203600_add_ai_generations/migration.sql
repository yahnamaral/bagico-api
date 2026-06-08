-- CreateEnum
CREATE TYPE "AiGenerationType" AS ENUM ('COPY_GENERATION', 'CONTENT_IDEAS', 'BRIEFING_IMPROVEMENT', 'CHANNEL_RECOMMENDATION', 'TASK_SUMMARY');

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "type" "AiGenerationType" NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "prompt" TEXT,
    "model" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_generations_organizationId_idx" ON "ai_generations"("organizationId");

-- CreateIndex
CREATE INDEX "ai_generations_clerkUserId_idx" ON "ai_generations"("clerkUserId");

-- CreateIndex
CREATE INDEX "ai_generations_type_idx" ON "ai_generations"("type");

-- CreateIndex
CREATE INDEX "ai_generations_createdAt_idx" ON "ai_generations"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
