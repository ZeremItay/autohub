# מדריך הגדרת מערכת גמיפיקציה

## שלב 1: יצירת הטבלאות ב-Supabase

1. היכנס ל-[Supabase Dashboard](https://app.supabase.com)
2. בחר את הפרויקט שלך
3. לך ל-**SQL Editor**
4. העתק והדבק את התוכן מקובץ `supabase-schema.sql`
5. לחץ על **Run** כדי להריץ את הסקריפט

זה ייצור:
- טבלת `gamification_rules` - כללי הגמיפיקציה
- טבלת `points_history` - היסטוריית נקודות
- עמודות נוספות בטבלת `profiles` (points, rank, וכו')

## שלב 2: גישה לדפים

### דף פרופיל משתמש:
```
http://localhost:3000/profile
```

**תכונות:**
- כותרת פרופיל עם תמונה, שם, נקודות ודרגה
- כרטיס "פרטים" עם אפשרות עריכה
- כרטיס "מידע אישי" עם תאריך לידה
- תפריט צד: פרופיל, התראות, פורומים, היסטוריית נקודות

### פאנל ניהול גמיפיקציה:
```
http://localhost:3000/admin/gamification
```

**תכונות:**
- טבלת כללי פעולות
- אפשרות לערוך ערך נקודות לכל פעולה
- אפשרות להפעיל/לבטל כללים
- אפשרות להוסיף כללים חדשים

## שלב 3: שימוש במערכת

### הענקת נקודות למשתמש:

```typescript
import { awardPoints } from '@/lib/queries/gamification'

// כאשר משתמש מבצע פעולה
await awardPoints(userId, 'פוסט חדש')
```

### קריאת סטטיסטיקות גמיפיקציה:

```typescript
import { getUserGamificationStats } from '@/lib/queries/gamification'

const { points, rank } = await getUserGamificationStats(userId)
```

### קריאת היסטוריית נקודות:

```typescript
import { getUserPointsHistory } from '@/lib/queries/gamification'

const { data } = await getUserPointsHistory(userId)
```

## כללי פעולות מוגדרים כברירת מחדל:

1. **כניסה יומית** - 5 נקודות
2. **פוסט חדש** - 10 נקודות
3. **תגובה לנושא** - 5 נקודות
4. **לייק לפוסט** - 1 נקודה
5. **שיתוף פוסט** - 3 נקודות
6. **השלמת קורס** - 50 נקודות
7. **העלאת פרויקט** - 25 נקודות

אתה יכול לשנות את הערכים דרך פאנל הניהול.

## הערות חשובות:

1. **אבטחה**: הטבלאות מוגנות עם Row Level Security (RLS)
2. **ביצועים**: נוצרו אינדקסים על הטבלאות לביצועים טובים יותר
3. **עדכון אוטומטי**: הטבלת `gamification_rules` מתעדכנת אוטומטית עם `updated_at`

## פתרון בעיות:

אם הטבלאות לא קיימות, המערכת תשתמש בכללים ברירת מחדל מהקוד.
לאחר יצירת הטבלאות, הנתונים יישמרו ב-Supabase.

