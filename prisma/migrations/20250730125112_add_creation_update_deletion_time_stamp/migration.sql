/*
  Warnings:

  - Added the required column `updatedAt` to the `RSVP` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RSVP" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
