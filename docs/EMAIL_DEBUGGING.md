# איך לבדוק אם המייל נשלח

## 1. בדיקה ב-Console של השרת

כאשר מישהו מגיש מועמדות לפרויקט, תראה ב-console של השרת (Terminal שבו רץ `npm run dev`):

```
📧 Sending email to project owner: { ownerEmail: '...', projectTitle: '...', ... }
✅ Email sent successfully: { to: '...', emailId: '...' }
```

או אם יש שגיאה:
```
❌ Email sending failed: { status: 500, error: {...} }
```

## 2. בדיקה ב-Resend Dashboard

1. היכנס ל-Resend Dashboard: https://resend.com/emails
2. תראה שם את כל המיילים שנשלחו
3. תוכל לראות את הסטטוס של כל מייל (sent, delivered, bounced, etc.)

## 3. בדיקה ב-Console של הדפדפן

פתח את Developer Tools (F12) → Console
תראה שם הודעות על שליחת המייל.

## 4. בדיקה ישירה - שליחת מייל לעצמך

אם אתה רוצה לבדוק שהמערכת עובדת, תוכל לשלוח מייל לעצמך דרך ה-API:

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "בדיקת מייל",
    "html": "<h1>זה מייל בדיקה</h1>"
  }'
```

## פתרון בעיות

### המייל לא נשלח
1. בדוק ש-`RESEND_API_KEY` מוגדר ב-`.env.local`
2. בדוק את ה-console של השרת לשגיאות
3. בדוק ב-Resend Dashboard אם יש שגיאות

### השגיאה "No email found for project owner"
- זה אומר שלא נמצא אימייל למשתמש שהגיש את הפרויקט
- וודא שהמשתמש נרשם עם אימייל תקין

### המייל נשלח אבל לא מגיע
- בדוק את תיבת הספאם
- בדוק ב-Resend Dashboard את הסטטוס של המייל
- אם אתה משתמש ב-`onboarding@resend.dev`, זה מייל בדיקה - ייתכן שהוא לא יגיע לכל הכתובות

