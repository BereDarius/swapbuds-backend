/*
Warnings:

- Changed the type of `category` on the `items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('ELECTRONICS', 'CLOTHING', 'BOOKS', 'TOYS', 'SPORTS', 'COLLECTIBLES', 'HOME', 'OTHER');

-- AlterTable - Safe migration with data preservation
ALTER TABLE "items" ALTER COLUMN "category" TYPE "ItemCategory" USING (
  CASE
    WHEN UPPER("category") = 'ELECTRONICS' THEN 'ELECTRONICS'::"ItemCategory"
    WHEN UPPER("category") = 'CLOTHING' THEN 'CLOTHING'::"ItemCategory"
    WHEN UPPER("category") = 'BOOKS' THEN 'BOOKS'::"ItemCategory"
    WHEN UPPER("category") = 'TOYS' THEN 'TOYS'::"ItemCategory"
    WHEN UPPER("category") = 'SPORTS' THEN 'SPORTS'::"ItemCategory"
    WHEN UPPER("category") = 'COLLECTIBLES' THEN 'COLLECTIBLES'::"ItemCategory"
    WHEN UPPER("category") = 'HOME' THEN 'HOME'::"ItemCategory"
    ELSE 'OTHER'::"ItemCategory"
  END
);
