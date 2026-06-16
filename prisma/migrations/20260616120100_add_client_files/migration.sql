-- CreateEnum
CREATE TYPE "ClientFileCategory" AS ENUM ('CONTRACT', 'BRANDBOOK', 'LOGO', 'BRIEFING', 'REFERENCE', 'OTHER');

-- CreateTable
CREATE TABLE "client_files" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "uploadedByClerkUserId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" "ClientFileCategory" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "client_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_files_organizationId_idx" ON "client_files"("organizationId");

-- CreateIndex
CREATE INDEX "client_files_clientId_idx" ON "client_files"("clientId");

-- CreateIndex
CREATE INDEX "client_files_uploadedByClerkUserId_idx" ON "client_files"("uploadedByClerkUserId");

-- CreateIndex
CREATE INDEX "client_files_category_idx" ON "client_files"("category");

-- CreateIndex
CREATE INDEX "client_files_deletedAt_idx" ON "client_files"("deletedAt");

-- CreateIndex
CREATE INDEX "client_files_organizationId_clientId_idx" ON "client_files"("organizationId", "clientId");

-- AddForeignKey
ALTER TABLE "client_files" ADD CONSTRAINT "client_files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_files" ADD CONSTRAINT "client_files_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
