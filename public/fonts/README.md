# הוראות העלאת פונט מותאם לעברית

## שלבים:

1. **העתק את קבצי הפונט שלך** לתיקייה הזו (`public/fonts/`)

2. **עדכן את שמות הקבצים** בקובץ `app/layout.tsx`:
   - מצא את השורות עם `your-font-regular.woff2` ו-`your-font-bold.woff2`
   - החלף אותם בשמות הקבצים האמיתיים שלך

3. **אם יש לך רק קובץ אחד** (לא שני גדלים), מחק את אחד מה-`src` entries

4. **פורמטים נתמכים**: `.woff2`, `.woff`, `.ttf`, `.otf`

## דוגמה:

אם הקבצים שלך נקראים:
- `hebrew-font-regular.woff2`
- `hebrew-font-bold.woff2`

עדכן ב-`app/layout.tsx`:
```typescript
path: "../../public/fonts/hebrew-font-regular.woff2",
path: "../../public/fonts/hebrew-font-bold.woff2",
```

## הערה:
אם יש לך רק קובץ אחד, תוכל להשתמש בו גם ל-regular וגם ל-bold:
```typescript
const customHebrewFont = localFont({
  src: [
    {
      path: "../../public/fonts/your-font.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-hebrew",
  display: "swap",
});
```

