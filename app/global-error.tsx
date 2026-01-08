'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">שגיאה קריטית</h1>
            <p className="text-gray-600 mb-6">
              אירעה שגיאה קריטית באפליקציה. אנא רענן את הדף.
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors font-semibold"
            >
              רענן דף
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}




