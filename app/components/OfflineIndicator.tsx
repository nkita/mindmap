'use client';

import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // 初期状態を設定
    setIsOffline(!navigator.onLine);

    // オンライン/オフライン状態の変化を監視
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-md transition-all ${
      isOffline 
        ? 'bg-yellow-500 text-white' 
        : 'bg-green-500/90 text-white'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isOffline ? 'bg-white animate-pulse' : 'bg-white'
      }`} />
      <span className="text-xs font-medium">
        {isOffline ? 'オフライン' : 'オンライン'}
      </span>
    </div>
  );
} 