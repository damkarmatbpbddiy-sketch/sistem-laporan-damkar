-- Add role column to users (safe to run once)
ALTER TABLE users
  ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';
