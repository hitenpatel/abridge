-- AlterTable
ALTER TABLE "payment_items" ADD COLUMN     "allowInstalments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instalmentPlan" JSONB,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false;
