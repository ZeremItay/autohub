# הגדרת Zoom OAuth Credentials

## מה הם ה-Credentials?

כדי להשתמש ב-Zoom API (למשל, לקבל רשימת meetings), צריך 3 credentials:

### 1. **OAuth Account ID** (`ZOOM_ACCOUNT_ID`)
- **מה זה?** מזהה ייחודי של חשבון ה-Zoom שלך
- **איפה למצוא?**
  1. היכנס ל-[Zoom Marketplace](https://marketplace.zoom.us/)
  2. לחץ על "Develop" → "Build App"
  3. בחר את ה-App שלך (או צור חדש)
  4. לך ל-"App Credentials" או "OAuth" tab
  5. תמצא את **"Account ID"** - זה המזהה שצריך

### 2. **OAuth Client ID** (`ZOOM_CLIENT_ID`)
- **מה זה?** מזהה ייחודי של ה-App שלך ב-Zoom
- **איפה למצוא?**
  1. באותו מקום כמו Account ID
  2. תמצא את **"Client ID"** או **"OAuth Client ID"**
  3. **יש לך כבר:** `ngNPcJOESPWoRAQxf3jfjQ`

### 3. **OAuth Client Secret** (`ZOOM_CLIENT_SECRET`)
- **מה זה?** סיסמה סודית של ה-App שלך (אסור לחשוף!)
- **איפה למצוא?**
  1. באותו מקום כמו Client ID
  2. לחץ על "Show" או "Reveal" כדי לראות את ה-Secret
  3. **יש לך כבר:** `IQpTv3KqKguI44mXvt4eRGirm9S0P3a7`

## איך להוסיף ל-`.env.local`?

פתח את הקובץ `.env.local` והוסף:

```env
# Zoom OAuth Credentials (לשימוש ב-API)
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=ngNPcJOESPWoRAQxf3jfjQ
ZOOM_CLIENT_SECRET=IQpTv3KqKguI44mXvt4eRGirm9S0P3a7
```

## הערות חשובות:

1. **Account ID** - זה מה שחסר לך! צריך למצוא אותו ב-Zoom Marketplace
2. **Client ID ו-Secret** - כבר יש לך, רק צריך לוודא שהם נכונים
3. **Server-to-Server OAuth** - צריך את כל השלושה כדי לקבל access token
4. **Permissions** - ודא שה-App שלך ב-Zoom יש לו הרשאות ל-"View meetings" או "Manage meetings"

## איפה למצוא Account ID - צעד אחר צעד:

1. היכנס ל-[Zoom Marketplace](https://marketplace.zoom.us/)
2. התחבר עם חשבון ה-Zoom שלך
3. לחץ על "Develop" → "Build App"
4. בחר "Server-to-Server OAuth" או "OAuth"
5. בחר את ה-App שלך (או צור חדש)
6. לך ל-"App Credentials" או "OAuth" tab
7. תמצא את **"Account ID"** - העתק אותו

## בדיקה:

לאחר הוספת כל השלושה, הפעל מחדש את השרת ובדוק:
- פאנל ניהול → Live Events → אמור לראות dropdown עם רשימת meetings
- אם יש שגיאה, בדוק את הקונסול של השרת

