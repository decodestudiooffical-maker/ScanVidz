'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false); // To show success message

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation Logic
    const isEmail = input.includes('@');
    const isPhone = /^\d+$/.test(input);

    if (!isEmail && !isPhone) {
        alert("Please enter a valid Email or Phone Number");
        setLoading(false);
        return;
    }

    // Simulate API Call (Backend baad me judega)
    setTimeout(() => {
        setLoading(false);
        setSent(true); // Show success screen
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Glows (Consistent with Login/Signup) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-[#121212] border border-gray-800 w-full max-w-md p-8 rounded-2xl shadow-2xl z-10 relative">
        
        {/* Step 1: Input Form */}
        {!sent ? (
            <>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-2">
                        Reset Password
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Enter your email or phone number to receive a recovery code.
                    </p>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email or Phone</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="example@mail.com or 9876543210" 
                                className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition placeholder-gray-600"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                required
                            />
                            <span className="absolute right-4 top-3.5 text-xl">🔒</span>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                    >
                        {loading ? <span className="animate-spin">⏳ Processing...</span> : 'Send Recovery Code'}
                    </button>
                </form>
            </>
        ) : (
            // Step 2: Success Message
            <div className="text-center py-4">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">✅</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Check your inbox!</h2>
                <p className="text-gray-400 text-sm mb-8">
                    We have sent a password recovery link/OTP to <span className="text-white font-bold">{input}</span>.
                </p>
                
                <button 
                    onClick={() => router.push('/login')}
                    className="w-full bg-[#1f1f1f] border border-gray-700 hover:bg-white hover:text-black text-white font-bold py-3 rounded-xl transition"
                >
                    Back to Login
                </button>
                
                <button 
                    onClick={() => setSent(false)} 
                    className="mt-4 text-sm text-blue-400 hover:underline"
                >
                    Try a different email?
                </button>
            </div>
        )}

        {/* Back Link */}
        {!sent && (
            <div className="text-center mt-8 text-sm text-gray-400">
                Remember your password? {' '}
                <Link href="/login" className="text-blue-400 font-bold hover:underline">
                    Login here
                </Link>
            </div>
        )}

      </div>
    </div>
  );
}