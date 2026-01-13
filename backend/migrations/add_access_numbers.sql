-- Migration: Update book copy tracking system
-- Change copy_number from integer to varchar for formatted copy numbers

-- Remove access_number columns if they exist
ALTER TABLE books DROP COLUMN IF EXISTS access_number;
ALTER TABLE book_issues DROP COLUMN IF EXISTS access_number;

-- Change copy_number to varchar to support formatted numbers like "01/10"
ALTER TABLE book_issues ALTER COLUMN copy_number TYPE VARCHAR(10);

-- Drop old unique constraint if it exists
DROP INDEX IF EXISTS idx_book_copy_unique;
DROP INDEX IF EXISTS idx_book_copy;

-- Create new index for copy number lookups
CREATE INDEX IF NOT EXISTS idx_book_issues_copy_number ON book_issues(book_id, copy_number);