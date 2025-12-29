# הגדרת Supabase Storage

## יצירת Bucket של Avatars

כדי להעלות תמונות פרופיל, צריך ליצור bucket ב-Supabase Storage:

### דרך 1: דרך ה-Dashboard (מומלץ)

1. היכנס ל-Supabase Dashboard
2. לך ל-**Storage** בתפריט השמאלי
3. לחץ על **"New bucket"** או **"Create bucket"**
4. הזן את הפרטים הבאים:
   - **Name:** `avatars`
   - **Public bucket:** ✅ (סמן את זה - זה יאפשר גישה ציבורית לתמונות)
   - **File size limit:** 5 MB (אופציונלי)
   - **Allowed MIME types:** `image/*` (אופציונלי)
5. לחץ על **"Create bucket"**

### דרך 2: דרך SQL (יצירת Policies בלבד)

לאחר שיצרת את ה-bucket דרך ה-Dashboard, הרץ את הקובץ `supabase-create-avatars-bucket.sql` ב-SQL Editor כדי ליצור את ה-policies.

### דרך 3: דרך API (אופציונלי)

אם אתה רוצה ליצור את ה-bucket דרך קוד, תוכל להשתמש ב-Supabase Management API, אבל זה דורש service role key.

## יצירת Bucket של Resources (למשאבים)

אם אתה צריך גם bucket למשאבים:

1. היכנס ל-Supabase Dashboard
2. לך ל-**Storage**
3. לחץ על **"New bucket"**
4. הזן:
   - **Name:** `resources`
   - **Public bucket:** ✅ (או ❌ אם אתה רוצה שזה יהיה פרטי)
5. לחץ על **"Create bucket"**

## הערות

- Buckets נוצרים רק דרך ה-Dashboard או ה-Management API, לא דרך SQL
- ה-SQL scripts רק יוצרים policies (הרשאות) ל-buckets שכבר קיימים
- אם ה-bucket לא קיים, המערכת תשתמש ב-base64 encoding כתחליף

