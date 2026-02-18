-- Migration: Fix doses.given_by to reference profiles instead of auth.users
-- Run this if you've already created your database with the old schema

-- Step 1: Drop the old foreign key constraint
ALTER TABLE doses 
DROP CONSTRAINT IF EXISTS doses_given_by_fkey;

-- Step 2: Add the new foreign key constraint to profiles
ALTER TABLE doses 
ADD CONSTRAINT doses_given_by_fkey 
FOREIGN KEY (given_by) 
REFERENCES profiles(id);

-- That's it! Now the JOIN will work properly.