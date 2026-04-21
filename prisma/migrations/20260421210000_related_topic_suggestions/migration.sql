-- Persist AI-generated custom-quiz ideas from completed sessions so the
-- dashboard can recommend from history without calling AI during render.
CREATE TABLE IF NOT EXISTS "RelatedTopicSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceSessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatedTopicSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RelatedTopicSuggestion_userId_sourceSessionId_title_key" ON "RelatedTopicSuggestion"("userId", "sourceSessionId", "title");
CREATE INDEX IF NOT EXISTS "RelatedTopicSuggestion_userId_createdAt_idx" ON "RelatedTopicSuggestion"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "RelatedTopicSuggestion_userId_sourceSessionId_idx" ON "RelatedTopicSuggestion"("userId", "sourceSessionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RelatedTopicSuggestion_userId_fkey'
  ) THEN
    ALTER TABLE "RelatedTopicSuggestion"
    ADD CONSTRAINT "RelatedTopicSuggestion_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RelatedTopicSuggestion_sourceSessionId_fkey'
  ) THEN
    ALTER TABLE "RelatedTopicSuggestion"
    ADD CONSTRAINT "RelatedTopicSuggestion_sourceSessionId_fkey"
    FOREIGN KEY ("sourceSessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
