'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [input, setInput] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Validation
    const isEmail = input.includes('@');
    const isPhone = /^\d+$/.test(input);

    if (!name.trim()) {
        alert("Please enter your full name.");
        setLoading(false); return;
    }
    if (!isEmail && !isPhone) {
        alert("Please enter a valid Email or Phone Number");
        setLoading(false); return;
    }
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        setLoading(false); return;
    }

    // 2. API Call (Connecting to Python Backend)
    try {
        const res = await fetch('https://scanvidz-default.onrender.com/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                email_or_phone: input,
                password: password
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ Account Created Successfully! Please Login.");
            router.push('/login'); // Success ke baad Login page par bhejo
        } else {
            alert("❌ Error: " + (data.detail || "Signup failed"));
        }

    } catch (err) {
        console.error(err);
        alert("❌ Server Error: Is Backend Running?");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-[#121212] border border-gray-800 w-full max-w-md p-8 rounded-2xl shadow-2xl z-10 relative">
        
        {/* Header */}
        <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-2">
                Join ScanVidz
            </h1>
            <p className="text-gray-400 text-sm">Create an account to start watching.</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-5">
            
            {/* Input: Full Name */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Full Name</label>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="John Doe" 
                        className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition placeholder-gray-600"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <span className="absolute right-4 top-3.5 text-xl">👤</span>
                </div>
            </div>

            {/* Input: Email or Phone */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email or Phone</label>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="example@mail.com or 9876543210" 
                        className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition placeholder-gray-600"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        required
                    />
                    <span className="absolute right-4 top-3.5 text-xl">📧</span>
                </div>
            </div>

            {/* Input: Password */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Create Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Min 6 characters" 
                        className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition placeholder-gray-600"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-gray-400 hover:text-white"
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                </div>
            </div>

            {/* Submit Button */}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2"
            >
                {loading ? <span className="animate-spin">⏳ Processing...</span> : 'Create Account'}
            </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
            <div className="h-px bg-gray-800 flex-1"></div>
            <span className="text-gray-500 text-xs uppercase font-bold">Or signup with</span>
            <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-3 gap-3">
            <button className="bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-gray-700 hover:border-gray-500 py-2.5 rounded-lg transition flex items-center justify-center">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-5 h-5" alt="Google" />
            </button>
            <button className="bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 hover:border-[#1877F2] py-2.5 rounded-lg transition flex items-center justify-center">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/2048px-2021_Facebook_icon.svg.png" className="w-5 h-5" alt="Facebook" />
            </button>
            <button className="bg-[#FFFC00]/10 hover:bg-[#FFFC00]/20 border border-[#FFFC00]/30 hover:border-[#FFFC00] py-2.5 rounded-lg transition flex items-center justify-center">
                <img src="https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png" className="w-5 h-5" alt="Snapchat" />
            </button>
        </div>

        {/* Login Link */}
        <div className="text-center mt-8 text-sm text-gray-400">
            Already have an account? {' '}
            <Link href="/login" className="text-purple-400 font-bold hover:underline">
                Login here
            </Link>
        </div>

      </div>
    </div>
  );
}