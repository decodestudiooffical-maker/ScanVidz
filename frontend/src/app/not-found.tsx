'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-[150px] pointer-events-none"></div>

      {/* 404 Content */}
      <div className="z-10">
        <h1 className="text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600 select-none">
          404
        </h1>
        
        <div className="mt-[-20px] mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Page not found</h2>
            <p className="text-gray-400 max-w-md mx-auto">
                Oops! It seems you've ventured into the void. The page you are looking for doesn't exist or has been moved.
            </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
                href="/" 
                className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold transition flex items-center gap-2"
            >
                🏠 Go Home
            </Link>
            
            <Link 
                href="/search?q=trending" 
                className="bg-[#1f1f1f] border border-gray-700 hover:border-gray-500 text-white px-8 py-3 rounded-full font-bold transition"
            >
                🔍 Search Videos
            </Link>
        </div>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-10 text-xs text-gray-600 font-mono">
        Error Code: 404_NOT_FOUND | System: ScanVidz
      </div>

    </div>
  );
}