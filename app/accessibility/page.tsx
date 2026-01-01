import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'הצהרת נגישות | מועדון האוטומטורים',
  description: 'הצהרת נגישות של מועדון האוטומטורים - תאימות לתקן הישראלי 5568 (WCAG 2.1 Level AA)',
};

export default function AccessibilityStatementPage() {
  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back to Home Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-hot-pink hover:text-hot-pink-light mb-8 text-sm sm:text-base transition-colors focus-visible:ring-2 focus-visible:ring-hot-pink focus-visible:outline-none rounded"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
          חזרה לעמוד הבית
        </Link>

        {/* Main Content Card */}
        <div className="glass-card rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 border-white/20">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 pb-4 border-b border-white/20">
            הצהרת נגישות
          </h1>

          <div className="prose prose-invert max-w-none space-y-6 text-white">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">מבוא</h2>
              <p className="text-gray-200 leading-relaxed">
                מועדון האוטומטורים מחויב לספק שירות נגיש ושוויוני לכל המשתמשים, 
                כולל אנשים עם מוגבלויות. האתר שלנו תואם לתקן הישראלי 5568 
                (ת"י 5568) המבוסס על תקן WCAG 2.1 Level AA של ארגון W3C.
              </p>
            </section>

            {/* Compliance Level */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">רמת התאימות</h2>
              <p className="text-gray-200 leading-relaxed">
                האתר שלנו תואם לתקן הישראלי 5568 ברמת תאימות AA. 
                תקן זה מגדיר דרישות נגישות לאתרי אינטרנט ומבטיח שהאתר נגיש 
                לאנשים עם מוגבלויות שונות, כולל:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-200 mt-4 mr-4">
                <li>אנשים עם לקויות ראייה המשתמשים בקוראי מסך</li>
                <li>אנשים עם לקויות שמיעה</li>
                <li>אנשים עם מוגבלויות מוטוריות המשתמשים במקלדת בלבד</li>
                <li>אנשים עם קשיי קוגניציה או למידה</li>
              </ul>
            </section>

            {/* Accessibility Features */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">תכונות נגישות באתר</h2>
              <p className="text-gray-200 leading-relaxed mb-4">
                האתר שלנו כולל את התכונות הבאות לשיפור הנגישות:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-200 mr-4">
                <li><strong>ניווט במקלדת:</strong> כל הפונקציות באתר נגישות באמצעות מקלדת בלבד</li>
                <li><strong>קוראי מסך:</strong> האתר תואם לקוראי מסך נפוצים (NVDA, JAWS, VoiceOver)</li>
                <li><strong>ניגודיות צבעים:</strong> האתר עומד בדרישות ניגודיות מינימליות של 4.5:1 לטקסט רגיל ו-3:1 לטקסט גדול</li>
                <li><strong>תגיות ALT:</strong> כל התמונות באתר כוללות תיאור טקסטואלי חלופי</li>
                <li><strong>תוויות טפסים:</strong> כל שדות הטופס כוללות תוויות ברורות</li>
                <li><strong>אינדיקטורי פוקוס:</strong> אינדיקטורים ברורים למיקום הפוקוס בעת ניווט במקלדת</li>
                <li><strong>ווידג'ט נגישות:</strong> ווידג'ט נגישות המאפשר התאמה אישית של האתר</li>
              </ul>
            </section>

            {/* Accessibility Widget */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">ווידג'ט נגישות</h2>
              <p className="text-gray-200 leading-relaxed">
                באתר שלנו קיים ווידג'ט נגישות המאפשר לך להתאים את האתר לצרכים שלך. 
                הווידג'ט כולל את האפשרויות הבאות:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-200 mt-4 mr-4">
                <li><strong>הגדלת טקסט:</strong> אפשרות להגדיל את גודל הטקסט בשתי רמות</li>
                <li><strong>ניגודיות גבוהה:</strong> אפשרות להפעיל מצב ניגודיות גבוהה</li>
                <li><strong>הדגשת קישורים:</strong> אפשרות להדגיש את כל הקישורים באתר</li>
                <li><strong>גופן קריא:</strong> אפשרות להחליף לגופן מערכת קריא יותר</li>
              </ul>
              <p className="text-gray-200 leading-relaxed mt-4">
                הווידג'ט נמצא בפינה השמאלית התחתונה של המסך. 
                ההעדפות שלך נשמרות במחשב שלך ונשארות גם לאחר סגירת הדפדפן.
              </p>
            </section>

            {/* Known Issues */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">בעיות נגישות ידועות</h2>
              <p className="text-gray-200 leading-relaxed">
                אנו עובדים באופן מתמיד על שיפור הנגישות של האתר. 
                אם נתקלת בבעיית נגישות כלשהי, אנא צור איתנו קשר באמצעות הפרטים למטה.
              </p>
            </section>

            {/* Contact Information */}
          </div>

          {/* Contact Section */}
          <div className="mt-10 pt-8 border-t border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">יצירת קשר - רכז נגישות</h2>
            <div className="glass-card rounded-xl p-6 bg-white/5 border border-white/10">
              <div className="space-y-4 text-gray-200">
                <div>
                  <h3 className="font-semibold text-white mb-2">שם רכז הנגישות:</h3>
                  <p className="text-lg">[שם רכז הנגישות]</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">טלפון:</h3>
                  <a
                    href="tel:[טלפון]"
                    className="text-lg text-hot-pink hover:text-hot-pink-light underline focus-visible:ring-2 focus-visible:ring-hot-pink focus-visible:outline-none rounded"
                  >
                    [טלפון]
                  </a>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">אימייל:</h3>
                  <a
                    href="mailto:[אימייל]"
                    className="text-lg text-hot-pink hover:text-hot-pink-light underline focus-visible:ring-2 focus-visible:ring-hot-pink focus-visible:outline-none rounded"
                  >
                    [אימייל]
                  </a>
                </div>
              </div>
            </div>
            <p className="text-gray-300 text-sm mt-6">
              נשמח לקבל פניות, הערות והצעות לשיפור הנגישות של האתר.
            </p>
          </div>

          {/* Last Updated */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              תאריך עדכון אחרון: {new Date().toLocaleDateString('he-IL', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

