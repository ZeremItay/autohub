# הגדרת Zoom Environment Variables

## הוראות:

1. פתח את הקובץ `.env.local` (בשורש הפרויקט)

2. הוסף את השורות הבאות:
```env
# Zoom SDK Credentials (לשימוש ב-Meeting SDK)
ZOOM_CLIENT_ID=ngNPcJOESPWoRAQxf3jfjQ
ZOOM_CLIENT_SECRET=IQpTv3KqKguI44mXvt4eRGirm9S0P3a7

# Zoom OAuth Credentials (לשימוש ב-API - רשימת meetings)
ZOOM_ACCOUNT_ID=your_account_id_here
```

3. **חשוב:** מצא את ה-`ZOOM_ACCOUNT_ID` ב-[Zoom Marketplace](https://marketplace.zoom.us/):
   - Develop → Build App → בחר את ה-App שלך
   - לך ל-"App Credentials" או "OAuth" tab
   - העתק את **"Account ID"** והדבק במקום `your_account_id_here`

4. שמור את הקובץ

5. **חשוב:** הפעל מחדש את השרת (Ctrl+C ואז `npm run dev`)

## בדיקה:

לאחר הוספת ה-variables והפעלה מחדש:
- **Meeting SDK:** בדוק בקונסול של הדפדפן - אין שגיאת "Zoom SDK Key/Client ID not configured"
- **API (רשימת meetings):** פאנל ניהול → Live Events → אמור לראות dropdown עם רשימת meetings

## הערות:

- הקובץ `.env.local` לא נשמר ב-Git (זה תקין - אסור לשמור credentials)
- ב-Vercel, תצטרך להוסיף את ה-variables ב-Dashboard → Settings → Environment Variables
- **Account ID** נדרש רק אם אתה רוצה להשתמש ב-API לקבלת רשימת meetings
- לפרטים נוספים, ראה `ZOOM_OAUTH_SETUP.md`

