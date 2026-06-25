-- Thêm cột số buổi đã học thực (Σ sessionsDeducted), độc lập học phí.
ALTER TABLE "TuitionLedgerEntry" ADD COLUMN "sessionsUsed" INTEGER NOT NULL DEFAULT 0;
