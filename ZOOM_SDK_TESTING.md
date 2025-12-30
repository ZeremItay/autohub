# מדריך בדיקה ל-Zoom Meeting SDK

## שלבי בדיקה

### 1. בדיקת התקנת החבילה
```bash
npm list @zoom/meetingsdk
```
צריך להציג: `@zoom/meetingsdk@5.0.2`

### 2. בדיקת Environment Variables
ודא שיש לך בקובץ `.env.local`:
```
ZOOM_SDK_KEY=your_sdk_key_here
ZOOM_SDK_SECRET=your_sdk_secret_here
```

או:
```
NEXT_PUBLIC_ZOOM_SDK_KEY=your_sdk_key_here
ZOOM_SDK_SECRET=your_sdk_secret_here
```

### 3. בדיקת API Route
בדוק שהנתיב `/api/zoom/generate-signature` עובד:

**בדיקה ידנית:**
1. הרץ את השרת: `npm run dev`
2. פתח את הדפדפן ופתח את Developer Tools (F12)
3. בקונסול, הרץ:
```javascript
fetch('/api/zoom/generate-signature', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ meetingNumber: '123456789' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**תוצאה צפויה:**
- אם יש environment variables: `{ signature: "...", sdkKey: "..." }`
- אם אין: `{ error: "Zoom SDK Key not configured" }`

### 4. בדיקת טעינת SDK בדפדפן
1. פתח את הדף `/live-room` (או כל דף שמשתמש ב-`ZoomMeeting`)
2. פתח את Developer Tools (F12) → Console
3. בדוק שאין שגיאות טעינה של `@zoom/meetingsdk`
4. בדוק שהקומפוננטה `ZoomMeeting` נטענת

### 5. בדיקת הצטרפות לפגישה
**דרישות:**
- יש לך אירוע ב-database עם `zoom_meeting_id`
- האירוע נמצא בטווח של שעה לפני/אחרי התחלה
- אתה משתמש פרימיום (או יש לך גישה)

**שלבים:**
1. היכנס לדף `/live-room`
2. אם יש אירוע פעיל, תראה את הקומפוננטה `ZoomMeeting`
3. בדוק בקונסול:
   - "Successfully joined Zoom meeting" = הצלחה
   - שגיאות = יש בעיה

### 6. בדיקת שגיאות נפוצות

**שגיאה: "Zoom SDK not loaded"**
- בדוק שה-import נכון: `import { ZoomMtg } from '@zoom/meetingsdk'`
- בדוק שהחבילה מותקנת: `npm list @zoom/meetingsdk`

**שגיאה: "Failed to generate signature"**
- בדוק שה-environment variables מוגדרים
- בדוק שה-API route עובד (שלב 3)

**שגיאה: "Error initializing Zoom"**
- בדוק שהדפדפן תומך (Chrome מומלץ)
- בדוק שאין חסימת popups/הרשאות

**שגיאה: "Error joining meeting"**
- בדוק שה-`meetingNumber` נכון
- בדוק שה-`signature` תקין (לא expired)
- בדוק שה-`sdkKey` תואם ל-`sdkSecret`

### 7. בדיקת Console Logs
בדוק בקונסול של הדפדפן:
- ✅ "Successfully joined Zoom meeting" = הכל עובד
- ❌ שגיאות = יש בעיה - בדוק את ה-error message

### 8. בדיקת Network Requests
בדוק ב-Developer Tools → Network:
- ✅ `POST /api/zoom/generate-signature` → 200 OK
- ❌ 500/400 = יש בעיה ב-API route

## הערות חשובות

1. **SDK Key ו-Secret** - חייבים להיות מ-Zoom App Marketplace
2. **Meeting Number** - חייב להיות מספר פגישה תקף
3. **Browser Support** - Chrome מומלץ, Firefox/Safari עשויים להיות מוגבלים
4. **HTTPS** - ב-production, Zoom דורש HTTPS
5. **Permissions** - המשתמש צריך לאשר מיקרופון ומצלמה

## בדיקה מהירה

הרץ את הפקודות הבאות:

```bash
# 1. בדוק התקנה
npm list @zoom/meetingsdk

# 2. הרץ את השרת
npm run dev

# 3. פתח בדפדפן
# http://localhost:3000/live-room
```

בדוק בקונסול של הדפדפן אם יש שגיאות.

