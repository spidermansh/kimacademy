-- CreateTable
CREATE TABLE "AssignedTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "dueDate" DATE,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assigneeUserId" TEXT NOT NULL,
    "assigneeName" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "assignedByName" TEXT,
    "completionNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignedTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssignedTask_assigneeUserId_status_idx" ON "AssignedTask"("assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "AssignedTask_dueDate_idx" ON "AssignedTask"("dueDate");
