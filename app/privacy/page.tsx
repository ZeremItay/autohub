import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'תקנון פרטיות',
  description: 'תקנון פרטיות של מועדון האוטומטורים - הגנת הפרטיות והמידע האישי שלך',
};

export default function PrivacyPolicyPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 md:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">תקנון פרטיות</h1>
          <p className="text-gray-600 mb-8">עדכון אחרון: {new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none space-y-6 text-gray-700" dir="rtl">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. מבוא</h2>
              <p>
                מועדון האוטומטורים ("אנו", "שלנו", "האתר") מחויב להגנה על הפרטיות שלך. תקנון זה מסביר כיצד אנו אוספים, משתמשים, מגנים ומחשים את המידע האישי שלך בהתאם לחוק הגנת הפרטיות התשמ"א-1981 ותקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017.
              </p>
              <p>
                באמצעות השימוש באתר שלנו, אתה מסכים לאיסוף ושימוש במידע בהתאם לתקנון זה.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. המידע שאנו אוספים</h2>
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.1 מידע שאתה מספק לנו</h3>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li><strong>מידע רישום:</strong> שם, כתובת אימייל, סיסמה, תאריך לידה (אם נדרש)</li>
                <li><strong>מידע פרופיל:</strong> תמונה, כינוי, רמת ניסיון, תחומי עניין</li>
                <li><strong>תוכן משתמש:</strong> פוסטים בפורומים, הערות, פרויקטים, פידבקים</li>
                <li><strong>מידע תשלום:</strong> פרטי כרטיס אשראי, כתובת חיוב (אם רלוונטי)</li>
                <li><strong>תקשורת:</strong> הודעות שתשלח לנו דרך טופס יצירת קשר או פידבק</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.2 מידע שאנו אוספים אוטומטית</h3>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li><strong>מידע טכני:</strong> כתובת IP, סוג דפדפן, מערכת הפעלה, זמן ביקור</li>
                <li><strong>מידע שימוש:</strong> דפים שביקרת בהם, זמן שהייה, פעולות שביצעת</li>
                <li><strong>Cookies וטכנולוגיות דומות:</strong> קבצי עוגיות לאחסון העדפות ומידע סשן</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. אופן השימוש במידע</h2>
              <p>אנו משתמשים במידע שנאסף למטרות הבאות:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>לספק, לתפעל ולתחזק את השירותים שלנו</li>
                <li>לשפר, לפתח ולהרחיב את השירותים והתכונות</li>
                <li>להתאים אישית את החוויה שלך באתר</li>
                <li>לשלוח הודעות שירות, עדכונים והודעות מנהליות</li>
                <li>לעבד תשלומים ולנהל מנויים</li>
                <li>לאבטח את האתר ולמנוע הונאה וניצול לרעה</li>
                <li>לעמוד בדרישות משפטיות וחוקיות</li>
                <li>לשלוח עדכונים שיווקיים (רקכמתך המפורשת)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. שיתוף מידע עם צדדים שלישיים</h2>
              <p>אנו עשויים לשתף את המידע שלך עם:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li><strong>ספקי שירותים:</strong> חברות המספקות שירותי אירוח, תשלום, אנליטיקה ושירותים טכניים (כגון Supabase, Vercel)</li>
                <li><strong>שירותי תשלום:</strong> ספקי תשלום לעיבוד עסקאות</li>
                <li><strong>רשויות חוק:</strong> כאשר נדרש על פי חוק או צו בית משפט</li>
                <li><strong>העברת עסק:</strong> במקרה של מיזוג, רכישה או מכירת נכסים</li>
              </ul>
              <p className="mt-4">
                אנו דואגים שכל ספקי השירותים שלנו יכבדו את הפרטיות שלך ויעבדו את המידע בהתאם לתקנון זה ולחוק הישראלי.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. אבטחת מידע</h2>
              <p>
                אנו נוקטים אמצעי אבטחה טכניים וארגוניים מתאימים כדי להגן על המידע האישי שלך מפני גישה לא מורשית, שימוש לרעה, חשיפה, שינוי או הרס. אמצעים אלה כוללים:
              </p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>הצפנת מידע רגיש</li>
                <li>גישה מוגבלת למידע רק לעובדים הזקוקים לו</li>
                <li>ניטור שוטף של מערכות האבטחה</li>
                <li>גיבויים סדירים של המידע</li>
                <li>עדכונים שוטפים של מערכות האבטחה</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. זכויותיך</h2>
              <p>בהתאם לחוק הגנת הפרטיות, יש לך זכויות הבאות:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li><strong>זכות לעיון:</strong> לקבל עותק של המידע האישי שאנו מחזיקים עליך</li>
                <li><strong>זכות תיקון:</strong> לתקן או לעדכן מידע לא מדויק או לא מעודכן</li>
                <li><strong>זכות מחיקה:</strong> לבקש למחוק את המידע האישי שלך (בכפוף למגבלות משפטיות)</li>
                <li><strong>זכות התנגדות:</strong> להתנגד לעיבוד המידע שלך למטרות שיווקיות</li>
                <li><strong>זכות הגבלה:</strong> להגביל את עיבוד המידע שלך במקרים מסוימים</li>
                <li><strong>זכות נשיאה:</strong> לקבל את המידע שלך בפורמט מובנה</li>
              </ul>
              <p className="mt-4">
                כדי לממש את זכויותיך, אנא פנה אלינו בכתובת: <a href="mailto:privacy@autohub.com" className="text-[#F52F8E] hover:underline">privacy@autohub.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Cookies</h2>
              <p>
                אנו משתמשים בקבצי Cookies כדי לשפר את החוויה שלך באתר. Cookies הם קבצים קטנים הנשמרים במכשיר שלך ומאפשרים לנו לזכור את ההעדפות שלך ולשפר את השירות.
              </p>
              <p className="mt-4">
                אתה יכול להגדיר את הדפדפן שלך לדחות Cookies, אך הדבר עלול להשפיע על תפקוד האתר.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. שינויים בתקנון</h2>
              <p>
                אנו שומרים לעצמנו את הזכות לעדכן את תקנון הפרטיות מעת לעת. שינויים משמעותיים יפורסמו באתר ויישלחו לך בהודעה (אם יש לך חשבון פעיל).
              </p>
              <p className="mt-4">
                מומלץ לבדוק את התקנון מעת לעת כדי להישאר מעודכן על אופן הגנת הפרטיות שלך.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. הגנת קטינים</h2>
              <p>
                האתר שלנו מיועד למשתמשים מעל גיל 18. אנו לא אוספים במודע מידע אישי מקטינים מתחת לגיל 18. אם אתה הורה או אפוטרופוס ומבחין שילדך סיפק לנו מידע אישי, אנא פנה אלינו ואנו נמחק את המידע בהקדם האפשרי.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. יצירת קשר</h2>
              <p>
                אם יש לך שאלות, בקשות או תלונות בנוגע לתקנון הפרטיות או לאופן שבו אנו מטפלים במידע האישי שלך, אנא פנה אלינו:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="font-semibold">מועדון האוטומטורים</p>
                <p>אימייל: <a href="mailto:privacy@autohub.com" className="text-[#F52F8E] hover:underline">privacy@autohub.com</a></p>
                <p className="mt-2 text-sm text-gray-600">
                  נשמח לעזור ולענות על כל שאלה שלך.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. חוק ישראלי</h2>
              <p>
                תקנון זה כפוף לחוקי מדינת ישראל. כל מחלוקת הנובעת מתקנון זה תיפתר בפני בתי המשפט המוסמכים בישראל.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link 
              href="/"
              className="text-[#F52F8E] hover:underline font-medium"
            >
              ← חזרה לדף הבית
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

