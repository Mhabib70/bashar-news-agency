-- ارتقای تدریجی Turso از v1.1 به v1.2 — ستون عکس پروفایل کاربر
-- اجرا: node --env-file=.env scripts/apply-turso-v12.mjs
ALTER TABLE "User" ADD COLUMN "avatar" TEXT NOT NULL DEFAULT '';
