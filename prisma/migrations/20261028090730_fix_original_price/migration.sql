/*
  Warnings:

  - You are about to drop the column `ogrinalPrice` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "ogrinalPrice",
ADD COLUMN     "originalPrice" INTEGER;
