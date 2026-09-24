ALTER TABLE "requests"
ADD COLUMN "resolution_note" TEXT;

CREATE TABLE "request_comments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_comments_request_id_created_at_idx"
ON "request_comments"("request_id", "created_at");

ALTER TABLE "request_comments"
ADD CONSTRAINT "request_comments_request_id_fkey"
FOREIGN KEY ("request_id") REFERENCES "requests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "request_comments"
ADD CONSTRAINT "request_comments_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
