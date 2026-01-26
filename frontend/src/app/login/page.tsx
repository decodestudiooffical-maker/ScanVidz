'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [input, setInput] = useState(''); // Stores Email or Phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validation
    const isEmail = input.includes('@');
    const isPhone = /^\d+$/.test(input);

    if (!isEmail && !isPhone) {
        alert("Please enter a valid Email or Phone Number");
        setLoading(false); return;
    }

    // API Call
    try {
        const res = await fetch('https://scanvidz-default.onrender.com/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email_or_phone: input,
                password: password
            })
        });

        const data = await res.json();

        if (res.ok) {
            // ✅ Success! Save user data to LocalStorage
            localStorage.setItem('scanvidz_user', JSON.stringify(data.user));
            
            // alert(`Welcome back, ${data.user.name}!`);
            router.push('/'); // Go to Home
        } else {
            alert("❌ Login Failed: " + (data.detail || "Invalid Credentials"));
        }

    } catch (err) {
        console.error(err);
        alert("❌ Server Error: Backend not running?");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-[#121212] border border-gray-800 w-full max-w-md p-8 rounded-2xl shadow-2xl z-10 relative">
        
        {/* Logo Section */}
        <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tighter cursor-pointer bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-2">
                ScanVidz
            </h1>
            <p className="text-gray-400 text-sm">Welcome back! Please login to continue.</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Input: Email or Phone */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email or Phone Number</label>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="example@mail.com or 9876543210" 
                        className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition placeholder-gray-600"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        required
                    />
                    <span className="absolute right-4 top-3.5 text-xl">📧</span>
                </div>
            </div>

            {/* Input: Password */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Enter your password" 
                        className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition placeholder-gray-600"
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
                {/* Forgot Password Link */}
                <div className="flex justify-end mt-2">
                    <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition">
                        Forgot Password?
                    </Link>
                </div>
            </div>

            {/* Submit Button */}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
            >
                {loading ? <span className="animate-spin">⏳ Logging in...</span> : 'Login'}
            </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
            <div className="h-px bg-gray-800 flex-1"></div>
            <span className="text-gray-500 text-xs uppercase font-bold">Or continue with</span>
            <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        {/* Social Login Buttons */}
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

        {/* Signup Link */}
        <div className="text-center mt-8 text-sm text-gray-400">
            Don't have an account? {' '}
            <Link href="/signup" className="text-blue-400 font-bold hover:underline">
                Sign up for free
            </Link>
        </div>

      </div>
    </div>
  );
}