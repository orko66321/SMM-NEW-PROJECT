-- Order Comment / Notice feature. A canned-template table plus three
-- nullable columns on Order for the per-order customer-facing note.
-- (Keep these comments free of semicolons so splitStatements stays happy.)

CREATE TABLE "CommentTemplate" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommentTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN "adminComment" TEXT;

ALTER TABLE "Order" ADD COLUMN "adminCommentLink" TEXT;

ALTER TABLE "Order" ADD COLUMN "adminCommentUpdatedAt" TIMESTAMP(3);
