ALTER TABLE "request_comments"
ADD COLUMN "reply_to_comment_id" TEXT;

CREATE UNIQUE INDEX "request_comments_reply_to_comment_id_key"
ON "request_comments"("reply_to_comment_id");

ALTER TABLE "request_comments"
ADD CONSTRAINT "request_comments_reply_to_comment_id_fkey"
FOREIGN KEY ("reply_to_comment_id") REFERENCES "request_comments"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
