import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">404 - הדף לא נמצא</h1>
        <p className="text-gray-600 mb-6">
          הדף שחיפשת לא קיים או הועבר למיקום אחר.
        </p>
        <Link href="/">
          <Button variant="primary">חזור לדף הבית</Button>
        </Link>
      </div>
    </div>
  );
}





