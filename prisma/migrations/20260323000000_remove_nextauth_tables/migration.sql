-- App no longer uses Auth.js; only the User table remains for the shared guest account.
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "VerificationToken";
