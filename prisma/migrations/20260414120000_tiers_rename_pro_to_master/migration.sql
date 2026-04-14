-- Tier rollout: 2-tier (`free`/`pro`) → 4-tier (`free`/`builder`/`scholar`/`master`).
-- `subscriptionTier` is a String column (no enum), so the only change is a
-- one-shot data rewrite: existing `pro` users get mapped to `master`, which
-- preserves their behaviour (50-question quizzes, unlimited daily).
--
-- `getUserSubscription()` also handles this at read time as a belt-and-braces
-- safety net in case any rows were created between deploy and migration.
UPDATE "User"
SET "subscriptionTier" = 'master'
WHERE "subscriptionTier" = 'pro';
