-- AlterTable: Add value column to forum_votes for up/down voting support
ALTER TABLE "forum_votes" ADD COLUMN "value" INTEGER NOT NULL DEFAULT 1;
