import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'תנאי שימוש',
  description: 'תנאי השימוש של מועדון האוטומטורים - כללי השימוש באתר',
};

export default function TermsOfServicePage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 md:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">תנאי שימוש</h1>
          <p className="text-gray-600 mb-8">עדכון אחרון: {new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none space-y-6 text-gray-700" dir="rtl">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. מבוא</h2>
              <p>
                ברוכים הבאים למועדון האוטומטורים ("האתר", "השירות", "אנו", "שלנו"). תנאי שימוש אלה ("התנאים") מגדירים את הכללים והתקנות לשימוש באתר שלנו.
              </p>
              <p className="mt-4">
                באמצעות הגישה והשימוש באתר, אתה מסכים להיות כפוף לתנאים אלה. אם אינך מסכים לחלק כלשהו מהתנאים, אנא אל תשתמש באתר.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. קבלת התנאים</h2>
              <p>
                על ידי יצירת חשבון, התחברות או שימוש באתר, אתה מאשר שקראת, הבנת והסכמת להיות כפוף לתנאי שימוש אלה ולכל החוקים והתקנות החלים.
              </p>
              <p className="mt-4">
                אם אתה משתמש באתר בשם ארגון או חברה, אתה מאשר שיש לך סמכות לחייב את הארגון או החברה לתנאים אלה.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. גיל מינימלי</h2>
              <p>
                השימוש באתר מותר רק למשתמשים שגילם 18 שנים ומעלה. אם אתה מתחת לגיל 18, עליך לקבל הסכמה מהורה או אפוטרופוס לפני השימוש באתר.
              </p>
              <p className="mt-4">
                אנו שומרים לעצמנו את הזכות לבקש הוכחת גיל ולסרב או להפסיק שירות למשתמשים שלא עומדים בדרישת הגיל.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. יצירת חשבון</h2>
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.1 דרישות רישום</h3>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>עליך לספק מידע מדויק, מעודכן ומלא בעת יצירת החשבון</li>
                <li>עליך לשמור על סודיות הסיסמה שלך</li>
                <li>אתה אחראי לכל הפעילות שמתבצעת בחשבון שלך</li>
                <li>עליך להודיע לנו מיד על כל שימוש לא מורשה בחשבון שלך</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.2 חשבונות מרובים</h3>
              <p>
                כל משתמש רשאי להחזיק בחשבון אחד בלבד. יצירת חשבונות מרובים עלולה להוביל להשעיה או מחיקה של כל החשבונות.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. התנהגות משתמש</h2>
              <p>אתה מסכים לא להשתמש באתר בדרכים הבאות:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>לפרסם, להעלות או לשתף תוכן בלתי חוקי, מזיק, מאיים, מטריד, משפיל, פוגעני או מפלה</li>
                <li>להפר זכויות יוצרים, סימני מסחר או זכויות קניין רוחני אחרות</li>
                <li>להעלות וירוסים, תוכנות זדוניות או קוד מזיק אחר</li>
                <li>לנסות לגשת ללא הרשאה לחלקים מוגנים של האתר</li>
                <li>לעשות שימוש בוטים, סקריפטים או כלים אוטומטיים אחרים</li>
                <li>להפר את זכויות הפרטיות של משתמשים אחרים</li>
                <li>לפרסם תוכן שיווקי או ספאם ללא הרשאה</li>
                <li>לזייף או להטעות לגבי זהותך או הקשר שלך עם ישות כלשהי</li>
                <li>להפר כל חוק, תקנה או תקנה ישראלי או בינלאומי</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. תוכן משתמש</h2>
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6.1 בעלות על תוכן</h3>
              <p>
                אתה שומר על כל הזכויות בתוכן שאתה מפרסם, מעלה או משתף באתר ("תוכן משתמש"). על ידי העלאת תוכן, אתה מעניק לנו רישיון לא בלעדי, עולמי, ללא תמלוגים להשתמש, לשכפל, לשנות, להציג ולהפיץ את התוכן שלך למטרות הפעלת השירות.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6.2 אחריות לתוכן</h3>
              <p>
                אתה אחראי בלעדית לתוכן שאתה מפרסם. אנו לא בודקים מראש את כל התוכן, אך שומרים לעצמנו את הזכות להסיר, לערוך או לסרב לפרסם כל תוכן שמפר את התנאים האלה.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6.3 זכויות יוצרים</h3>
              <p>
                אם אתה מאמין שתוכן באתר מפר את זכויות היוצרים שלך, אנא פנה אלינו עם פרטים מלאים על ההפרה. אנו נטפל בתלונות כאלה בהתאם לחוק זכות יוצרים.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. שירותים בתשלום</h2>
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7.1 מנויים ותשלומים</h3>
              <p>
                חלק מהשירותים באתר דורשים תשלום. מחירים, תנאי תשלום ומדיניות ביטול מפורטים באתר.
              </p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>כל המחירים כוללים מע"מ כנדרש בחוק</li>
                <li>תשלומים מתבצעים מראש</li>
                <li>ביטולים והחזרים כפופים למדיניות הביטול המפורטת</li>
                <li>אנו שומרים לעצמנו את הזכות לשנות מחירים בכל עת</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7.2 החזרים</h3>
              <p>
                החזרים יתבצעו בהתאם לחוק הגנת הצרכן, התשמ"א-1981 ולמדיניות ההחזרים שלנו. בקשות להחזר יש להגיש תוך 14 ימים ממועד הרכישה.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. ביטול והשעיה</h2>
              <p>
                אנו שומרים לעצמנו את הזכות להפסיק, להשעות או לבטל את החשבון שלך ואת הגישה לאתר בכל עת, ללא הודעה מוקדמת, אם:
              </p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>הפרת את תנאי השימוש</li>
                <li>התנהגת בצורה שמסכנת או פוגעת במשתמשים אחרים</li>
                <li>ביקשת לבטל את החשבון שלך</li>
                <li>לא השתמשת בחשבון לתקופה ממושכת</li>
              </ul>
              <p className="mt-4">
                אתה רשאי לבטל את החשבון שלך בכל עת דרך הגדרות החשבון או על ידי פנייה אלינו.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. אחריות והגבלת אחריות</h2>
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">9.1 שירות "כפי שהוא"</h3>
              <p>
                האתר והשירותים מסופקים "כפי שהם" ללא כל אחריות, מפורשת או משתמעת. אנו לא מתחייבים שהשירות יהיה ללא הפרעות, בטוח או נטול שגיאות.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">9.2 הגבלת אחריות</h3>
              <p>
                במידה המרבית המותרת על פי החוק, אנו לא נהיה אחראים לכל נזק ישיר, עקיף, מקרי, מיוחד או תוצאתי הנובע משימוש או אי יכולת להשתמש באתר.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">9.3 אחריותך</h3>
              <p>
                אתה אחראי לשימוש שלך באתר ולתוכן שאתה מפרסם. אתה מסכים לפצות ולשחרר אותנו מכל תביעה, נזק, אחריות או הוצאה הנובעים משימוש שלך באתר או הפרה של תנאים אלה.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. שינויים בשירות</h2>
              <p>
                אנו שומרים לעצמנו את הזכות לשנות, להפסיק או להשהות כל חלק מהשירות בכל עת, ללא הודעה מוקדמת. אנו לא נהיה אחראים לך או לצד שלישי כלשהו על כל שינוי, השעיה או הפסקה של השירות.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. קישורים לאתרים חיצוניים</h2>
              <p>
                האתר שלנו עשוי להכיל קישורים לאתרים חיצוניים שאינם בשליטתנו. אנו לא אחראים לתוכן, מדיניות הפרטיות או הפרקטיקות של אתרים חיצוניים אלה. אנו ממליצים לך לקרוא את תנאי השימוש ומדיניות הפרטיות של כל אתר חיצוני שאתה מבקר בו.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. שינויים בתנאים</h2>
              <p>
                אנו שומרים לעצמנו את הזכות לעדכן או לשנות את תנאי השימוש בכל עת. שינויים משמעותיים יפורסמו באתר ויישלחו לך בהודעה (אם יש לך חשבון פעיל).
              </p>
              <p className="mt-4">
                המשך השימוש באתר לאחר פרסום השינויים מהווה הסכמה לתנאים המעודכנים.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. חוק ישראלי וסמכות שיפוט</h2>
              <p>
                תנאי שימוש אלה כפופים לחוקי מדינת ישראל. כל מחלוקת הנובעת מתנאים אלה או מהשימוש באתר תיפתר בפני בתי המשפט המוסמכים בישראל בלבד.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. היפרדות</h2>
              <p>
                אם הוגדר שסעיף כלשהו בתנאים אלה אינו ניתן לאכיפה או בלתי חוקי, הסעיף יוסר או יתוקן במידה המינימלית הנדרשת, ושאר התנאים יישארו בתוקף מלא.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">15. יצירת קשר</h2>
              <p>
                אם יש לך שאלות או הערות בנוגע לתנאי השימוש, אנא פנה אלינו:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="font-semibold">מועדון האוטומטורים</p>
                <p>אימייל: <a href="mailto:legal@autohub.com" className="text-[#F52F8E] hover:underline">legal@autohub.com</a></p>
                <p className="mt-2 text-sm text-gray-600">
                  נשמח לעזור ולענות על כל שאלה שלך.
                </p>
              </div>
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

