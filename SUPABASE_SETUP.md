# הגדרת Supabase

## שלב 1: יצירת פרויקט ב-Supabase

1. היכנס ל-[Supabase](https://app.supabase.com)
2. צור פרויקט חדש או בחר פרויקט קיים
3. לך ל-Settings → API

## שלב 2: קבלת ה-API Keys

בדף ה-API Settings תמצא:
- **Project URL** - זה ה-`NEXT_PUBLIC_SUPABASE_URL`
- **anon/public key** - זה ה-`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** (אופציונלי) - זה ה-`SUPABASE_SERVICE_ROLE_KEY`

## שלב 3: הגדרת משתני סביבה

1. העתק את הקובץ `.env.local.example` ל-`.env.local`
2. מלא את הערכים מה-Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## שלב 4: שימוש ב-Supabase בקוד

### בקומפוננטות Client (Client Components):

```typescript
'use client'
import { supabase } from '@/lib/supabase'

// דוגמה: קריאת נתונים
const { data, error } = await supabase
  .from('posts')
  .select('*')
```

### בשרת (Server Components / API Routes):

```typescript
import { createServerClient } from '@/lib/supabase-server'

const supabase = createServerClient()
const { data, error } = await supabase
  .from('posts')
  .select('*')
```

## שלב 5: יצירת טבלאות

אתה יכול ליצור טבלאות ב-Supabase Dashboard:
1. לך ל-Table Editor
2. לחץ על "New Table"
3. הגדר את העמודות

או להשתמש ב-SQL Editor:

```sql
-- דוגמה: טבלת פוסטים
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- דוגמה: טבלת משתמשים
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## אבטחה

- **לעולם אל תחשוף** את ה-`SUPABASE_SERVICE_ROLE_KEY` בקוד client-side
- השתמש ב-Row Level Security (RLS) ב-Supabase כדי להגן על הנתונים
- ה-`NEXT_PUBLIC_SUPABASE_ANON_KEY` בטוח לחשיפה (הוא מיועד לשימוש client-side)

## משאבים נוספים

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

