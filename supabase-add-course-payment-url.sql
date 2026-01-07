-- Add payment_url column to courses table
-- This allows each course to have its own payment link from Sumit

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS payment_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN courses.payment_url IS 'קישור תשלום ספציפי לקורס זה מ-Sumit. אם לא מוגדר, ישתמש בקישור ברירת מחדל.';

