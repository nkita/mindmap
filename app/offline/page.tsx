import Link from 'next/link';

export default function Offline() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 p-4">
      <div className="bg-white/90 backdrop-blur-md p-8 rounded-xl shadow-lg border border-blue-100 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">オフラインです</h1>
        <p className="text-slate-600 mb-6">
          インターネット接続がないようです。接続が回復したら自動的に更新されます。
        </p>
        <p className="text-slate-600 mb-6">
          すでに読み込まれたマインドマップは引き続き利用できます。
        </p>
        <Link 
          href="/"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
} 