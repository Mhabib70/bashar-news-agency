-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "ref" TEXT NOT NULL DEFAULT '',
    "deliveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NewsItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL DEFAULT '',
    "reporterId" TEXT NOT NULL,
    "district" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'none',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "mediaType" TEXT NOT NULL DEFAULT 'none',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewStage" TEXT NOT NULL DEFAULT 'district',
    "rejectReason" TEXT NOT NULL DEFAULT '',
    "rejectNote" TEXT NOT NULL DEFAULT '',
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "reviewedAt" DATETIME,
    "challengeId" INTEGER,
    "mediaUrl" TEXT NOT NULL DEFAULT '',
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NewsItem_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NewsItem" ("category", "challengeId", "code", "content", "createdAt", "district", "durationMin", "id", "mediaType", "rejectNote", "rejectReason", "reporterId", "reviewStage", "reviewedAt", "reviewedBy", "status", "title", "updatedAt") SELECT "category", "challengeId", "code", "content", "createdAt", "district", "durationMin", "id", "mediaType", "rejectNote", "rejectReason", "reporterId", "reviewStage", "reviewedAt", "reviewedBy", "status", "title", "updatedAt" FROM "NewsItem";
DROP TABLE "NewsItem";
ALTER TABLE "new_NewsItem" RENAME TO "NewsItem";
CREATE TABLE "new_Challenge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "deadlineAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "reward" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "deadlineNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);
INSERT INTO "new_Challenge" ("code", "createdAt", "createdBy", "deadlineAt", "description", "endAt", "finishedAt", "id", "reward", "status", "title") SELECT "code", "createdAt", "createdBy", "deadlineAt", "description", "endAt", "finishedAt", "id", "reward", "status", "title" FROM "Challenge";
DROP TABLE "Challenge";
ALTER TABLE "new_Challenge" RENAME TO "Challenge";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_userId_deliveredAt_idx" ON "Notification"("userId", "deliveredAt");

