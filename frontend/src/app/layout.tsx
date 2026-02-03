import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// 🔥 Using '@' alias for cleaner imports (points to src folder)
import Footer from '@/components/Footer'; 
import BottomNav from '@/components/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ScanVidz - Premium Video Engine',
  description: 'The Ultimate Video Search Engine without Ads',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#050505] text-white overflow-x-hidden`}>
        
        <div className="flex flex-col min-h-screen">
            
            {/* 🔥 MAIN CONTENT AREA 
               - 'pb-20' added specifically for Mobile to prevent content 
                 from hiding behind the fixed Bottom Navbar.
               - On Desktop (md:pb-0), no padding needed.
            */}
            <main className="flex-1 pb-20 md:pb-0">
                {children}
            </main>

            {/* 🔥 DESKTOP FOOTER 
               - 'hidden md:block': Mobile pe hide, Laptop pe show.
            */}
            <div className="hidden md:block">
                <Footer />
            </div>

            {/* 🔥 MOBILE BOTTOM NAVIGATION
               - Components/BottomNav.tsx khud handle karega ki 
                 wo sirf mobile pe dikhe.
            */}
            <BottomNav />
            
        </div>
      </body>
    </html>
  );
}