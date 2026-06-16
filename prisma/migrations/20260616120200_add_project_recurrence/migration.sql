-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('ONE_OFF', 'RECURRING');

-- CreateEnum
CREATE TYPE "RecurrenceInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "fixedDeliverables" TEXT,
ADD COLUMN     "monthlyFee" DECIMAL(12,2),
ADD COLUMN     "recurrenceInterval" "RecurrenceInterval",
ADD COLUMN     "renewalDay" INTEGER,
ADD COLUMN     "type" "ProjectType" NOT NULL DEFAULT 'ONE_OFF';

-- CreateIndex
CREATE INDEX "projects_type_idx" ON "projects"("type");

-- CreateIndex
CREATE INDEX "projects_organizationId_type_idx" ON "projects"("organizationId", "type");
