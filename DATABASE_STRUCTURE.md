# מבנה מסד הנתונים - Supabase

## סקירה כללית

ב-Supabase יש **הפרדה** בין שני חלקים:

### 1. Authentication (`auth.users`)
- זהו **מערכת Authentication מובנית** של Supabase
- נמצא תחת **Authentication > Users** ב-Dashboard
- מכיל: `id`, `email`, `encrypted_password`, `email_confirmed_at`, וכו'
- **לא ניתן לערוך ישירות** - רק דרך Supabase Auth API

### 2. Profiles Table (`profiles`)
- זהו **טבלה מותאמת אישית** במסד הנתונים
- נמצא תחת **Table Editor > profiles**
- מכיל מידע נוסף על המשתמשים: `display_name`, `avatar_url`, `points`, `role_id`, וכו'
- **מחובר ל-auth.users** דרך `user_id` (Foreign Key)

## הקשר בין הטבלאות

```
auth.users (Authentication)
    ↓ (id)
profiles.user_id (Foreign Key)
```

**כל profile חייב להיות קשור למשתמש ב-auth.users!**

## טבלאות במערכת

### טבלאות עיקריות:
1. **profiles** - פרופילי משתמשים (קשור ל-auth.users)
2. **roles** - תפקידים (מנוי חינמי, פרימיום, מנהל)
3. **projects** - פרויקטים
4. **recordings** - הקלטות
5. **forums** - פורומים
6. **forum_posts** - פוסטים בפורומים
7. **forum_post_replies** - תגובות לפוסטים
8. **events** - אירועים
9. **courses** - קורסים
10. **course_lessons** - שיעורים בקורסים
11. **posts** - פוסטים בדף הבית
12. **comments** - תגובות לפוסטים
13. **notifications** - התראות
14. **resources** - משאבים
15. **blog_posts** - פוסטים בבלוג

## איך לבדוק שהכל מסודר?

1. **בדוק Foreign Key:**
   ```sql
   SELECT
     tc.constraint_name,
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.table_name = 'profiles'
     AND tc.constraint_type = 'FOREIGN KEY';
   ```

2. **בדוק שיש profiles לכל משתמש ב-auth.users:**
   ```sql
   SELECT 
     au.id as auth_user_id,
     au.email,
     p.id as profile_id,
     p.display_name
   FROM auth.users au
   LEFT JOIN profiles p ON p.user_id = au.id;
   ```

3. **הרץ את הסקריפט:** `supabase-check-and-fix-profiles-table.sql`
   - זה יוודא שהטבלה קיימת
   - יוסיף foreign key אם חסר
   - יוסיף עמודות חסרות

## בעיות נפוצות

### בעיה: "Foreign key constraint violation"
**פתרון:** צריך ליצור משתמש ב-auth.users קודם, ואז ליצור profile

### בעיה: "Column doesn't exist"
**פתרון:** הרץ את `supabase-check-and-fix-profiles-table.sql`

### בעיה: "Role_id is required"
**פתרון:** הרץ את `supabase-restructure-roles.sql` ו-`supabase-make-role-required.sql`

