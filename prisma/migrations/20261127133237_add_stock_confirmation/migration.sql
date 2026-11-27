-- CreateTable
CREATE TABLE "StockConfirmation" (
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockConfirmation_pkey" PRIMARY KEY ("orderId")
);
