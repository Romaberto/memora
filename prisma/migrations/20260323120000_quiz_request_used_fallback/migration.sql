-- AlterTable
ALTER TABLE "QuizRequest" ADD COLUMN "usedFallback" INTEGER NOT NULL DEFAULT 0;

-- Mark existing sample quizzes (topic suffix from buildFallbackQuiz)
UPDATE "QuizRequest" SET "usedFallback" = 1 WHERE "topic" LIKE '%(fallback)%';
