'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Global API Base URL
const API_BASE_URL = "https://scanvidz-backend.onrender.com";

export default function LoginPage() {
  const router = useRouter();
  
  // --- STATES ---
  const [input, setInput] = useState(''); // Stores Email or Phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Feature States
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shakeError, setShakeError] = useState(false); // For Shake Animation
  
  // Auto Avatar State
  const [avatarUrl, setAvatarUrl] = useState("https://ui-avatars.com/api/?background=random&name=User&color=fff");

  // --- 1. AUTO AVATAR GENERATOR ---
  useEffect(() => {
      // Debounce the avatar update to avoid flickering while typing
      const handler = setTimeout(() => {
          if (input.length > 2) {
              // Extract name from email (e.g., billa from billa@gmail.com)
              const namePart = input.includes('@') ? input.split('@')[0] : input;
              setAvatarUrl(`https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${namePart}&size=128&bold=true`);
          }
      }, 500); 
      return () => clearTimeout(handler);
  }, [input]);

  // --- 2. LOGIN LOGIC ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShakeError(false);
    
    // Basic Validation
    const isEmail = input.includes('@');
    const isPhone = /^\d+$/.test(input);

    if (!isEmail && !isPhone) {
        alert("Please enter a valid Email or Phone Number");
        setShakeError(true);
        setLoading(false); return;
    }

    // API Call
    try {
        const res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email_or_phone: input,
                password: password
            })
        });

        const data = await res.json();

        if (res.ok) {
            // ✅ Success! Save user data
            // Feature 12: Smart Remember Me
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('scanvidz_user', JSON.stringify(data.user));
            
            // Dispatch event so UserMenu updates immediately
            window.dispatchEvent(new Event('storage'));
            
            router.push('/'); // Go to Home
        } else {
            setShakeError(true); // Trigger Shake Animation
            alert("❌ Login Failed: " + (data.detail || "Invalid Credentials"));
        }

    } catch (err) {
        console.error(err);
        alert("❌ Server Error: Backend not running?");
    } finally {
        setLoading(false);
    }
  };

  // --- 3. MAGIC LINK LOGIC (FIXED & CONNECTED) ---
  const handleMagicLink = async () => {
      // 1. Validate Input
      if (!input || !input.includes('@')) {
          alert("⚠️ Please enter a valid Email address in the box first!");
          setShakeError(true);
          return;
      }
      
      setMagicLoading(true);
      
      try {
          // 2. Real Backend Call
          const res = await fetch(`${API_BASE_URL}/auth/magic-link`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: input })
          });
          
          const data = await res.json(); // Always parse response

          // 3. Handle Response
          if (res.status === 404) {
              alert("🚫 User not found! Please Sign Up first.");
              setShakeError(true);
          } else if (res.ok) {
              alert("✨ Magic Link Sent! Check your inbox to login instantly.");
          } else {
              // Fallback for errors
              console.log("Magic link error:", data);
              alert("❌ Error: " + (data.detail || "Could not send link"));
          }
      } catch (e) {
          console.error("Magic Link Network Error:", e);
          alert("Network Error: Could not reach server.");
      } finally {
          setMagicLoading(false);
      }
  };

  // --- 4. GUEST MODE LOGIC (Feature 17) ---
  const handleGuestLogin = () => {
      const guestUser = {
          id: "guest_" + Date.now(),
          name: "Guest User",
          email_or_phone: "guest@scanvidz.app",
          isGuest: true
      };
      sessionStorage.setItem('scanvidz_user', JSON.stringify(guestUser));
      // Dispatch event to update UI
      window.dispatchEvent(new Event('storage'));
      router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Animated Glows (Netflix Style) */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>

      {/* Main Glassmorphism Card */}
      <div className={`w-[90%] max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl z-10 relative transition-all duration-300 ${shakeError ? 'animate-shake border-red-500/50' : 'border-gray-800'} border bg-[#121212]/80 backdrop-blur-xl`}>
        
        {/* Dynamic Avatar Display */}
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 shadow-2xl rounded-full border-4 border-[#050505]">
            <img 
                src={avatarUrl} 
                className="w-20 h-20 rounded-full bg-gray-800 object-cover" 
                alt="User Avatar" 
            />
        </div>

        {/* Header Section */}
        <div className="text-center mt-12 mb-8">
            <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-1">
                ScanVidz ID
            </h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Secure Access Gateway</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Input: Email or Phone */}
            <div className="group">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 group-focus-within:text-blue-500 transition-colors">Email or Phone Number</label>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="john@example.com" 
                        className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 transition-all placeholder-gray-600 shadow-inner text-sm"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        required
                    />
                    <span className="absolute right-4 top-3.5 text-gray-500 group-focus-within:text-white transition">📧</span>
                </div>
            </div>

            {/* Input: Password */}
            <div className="group">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 group-focus-within:text-purple-500 transition-colors">Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-purple-500 transition-all placeholder-gray-600 shadow-inner text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-gray-500 hover:text-white transition"
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                </div>
            </div>

            {/* Remember Me & Magic Link */}
            <div className="flex items-center justify-between text-xs mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition select-none">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-600 focus:ring-0 focus:ring-offset-0 accent-blue-500"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                </label>
                <button 
                    type="button" 
                    onClick={handleMagicLink} 
                    disabled={magicLoading}
                    className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-bold hover:opacity-80 transition flex items-center gap-1 disabled:opacity-50"
                >
                    {magicLoading ? '✨ Sending...' : '✨ Magic Link'}
                </button>
            </div>

            {/* Submit Button */}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 mt-4"
            >
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Secure Login'}
            </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-gray-800 flex-1"></div>
            <span className="text-gray-600 text-[10px] uppercase font-bold tracking-wider">Social Access</span>
            <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        {/* Social Login Buttons (FIXED LOGOS) */}
        <div className="grid grid-cols-3 gap-3">
            <button className="bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-gray-700 hover:border-white/30 py-3 rounded-xl transition flex items-center justify-center group relative overflow-hidden">
                {/* Google Logo - Fixed Link */}
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition z-10" alt="Google" />
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition"></div>
            </button>
            <button className="bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 hover:border-[#1877F2] py-3 rounded-xl transition flex items-center justify-center group relative overflow-hidden">
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" className="w-5 h-5 group-hover:scale-110 transition z-10" alt="Facebook" />
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition"></div>
            </button>
            <button className="bg-[#FFFC00]/10 hover:bg-[#FFFC00]/20 border border-[#FFFC00]/30 hover:border-[#FFFC00] py-3 rounded-xl transition flex items-center justify-center group relative overflow-hidden">
                <img src="https://www.svgrepo.com/show/448251/snapchat.svg" className="w-5 h-5 group-hover:scale-110 transition z-10" alt="Snapchat" />
                <div className="absolute inset-0 bg-yellow-400/10 opacity-0 group-hover:opacity-100 transition"></div>
            </button>
        </div>

        {/* Footer Actions (Signup & Guest) */}
        <div className="text-center mt-8 space-y-4">
            <p className="text-sm text-gray-400">
                New to ScanVidz? {' '}
                <Link href="/signup" className="text-blue-400 font-bold hover:text-blue-300 hover:underline transition">
                    Create free account
                </Link>
            </p>
            
            <button onClick={handleGuestLogin} className="text-xs text-gray-500 hover:text-white transition uppercase font-bold tracking-widest border-b border-transparent hover:border-gray-500">
                Continue as Guest 👤
            </button>
        </div>

        {/* Terms Footer */}
        <div className="mt-8 text-center border-t border-gray-800/50 pt-4">
            <p className="text-[10px] text-gray-600">
                By continuing, you agree to our <a href="#" className="hover:text-gray-400">Terms of Service</a> and <a href="#" className="hover:text-gray-400">Privacy Policy</a>.
            </p>
        </div>

      </div>
      
      {/* CSS for Shake Animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}