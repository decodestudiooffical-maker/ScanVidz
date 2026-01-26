import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// 🔥 Footer import kiya (Make sure src/components/Footer.tsx exists)
import Footer from '../components/Footer'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ScanVidz - Premium Video Engine',
  description: 'The Ultimate Video Search Engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#050505] text-white`}>
        {/* 🔥 Flex-Col aur min-h-screen lagaya hai taki 
            Footer hamesha bottom me rahe, content chahe kam ho.
        */}
        <div className="flex flex-col min-h-screen">
            {/* Main Content (Ye expand hoga taki footer niche dhakel sake) */}
            <main className="flex-1">
                {children}
            </main>

            {/* Global Footer */}
            <Footer />
        </div>
      </body>
    </html>
  );
}