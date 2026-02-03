'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE_URL = "https://scanvidz-backend.onrender.com";

export default function LoginPage() {
  const router = useRouter();
  
  // --- STATES ---
  const [input, setInput] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Feature States
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  // --- LOGIN LOGIC ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShakeError(false);
    
    // Validation
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
            // ✅ Smart Remember Me
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('scanvidz_user', JSON.stringify(data.user));
            // Dispatch a storage event to update UserMenu instantly
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

  // --- MAGIC LINK LOGIC (Feature 14 - Improved) ---
  const handleMagicLink = async () => {
      if (!input || !input.includes('@')) {
          alert("Please enter a valid Email first to receive the Magic Link!");
          setShakeError(true);
          return;
      }
      
      setMagicLoading(true);
      try {
          // Check if user exists first (Simulated for now, can be connected to backend)
          // In real backend, we would call /auth/magic-link
          const res = await fetch(`${API_BASE_URL}/auth/magic-link`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: input })
          });
          
          if (res.status === 404) {
              alert("🚫 User not found! Please Sign Up first.");
          } else if (res.ok) {
              alert("✨ Magic Link Sent! Check your inbox to login instantly.");
          } else {
              // Fallback for now if backend endpoint isn't ready
              console.log("Magic link simulation for:", input);
              alert(`✨ Magic Link Sent to ${input}! (Simulation Mode)`);
          }
      } catch (e) {
          alert("Network Error: Could not send link.");
      } finally {
          setMagicLoading(false);
      }
  };

  // --- GUEST MODE LOGIC (Feature 17) ---
  const handleGuestLogin = () => {
      const guestUser = {
          id: "guest_" + Date.now(),
          name: "Guest User",
          email_or_phone: "guest@scanvidz.app",
          isGuest: true
      };
      sessionStorage.setItem('scanvidz_user', JSON.stringify(guestUser));
      // Dispatch a storage event to update UserMenu instantly
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
        
        {/* Header */}
        <div className="text-center mb-8">
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
            <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-600 focus:ring-0 focus:ring-offset-0"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                </label>
                <button type="button" onClick={handleMagicLink} className="text-purple-400 hover:text-purple-300 font-bold transition flex items-center gap-1">
                    {magicLoading ? 'Sending...' : '✨ Magic Link'}
                </button>
            </div>

            {/* Submit Button */}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
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

        {/* Social Login Buttons (Feature 15) */}
        <div className="grid grid-cols-3 gap-3">
            <button className="bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-gray-700 hover:border-white/30 py-3 rounded-xl transition flex items-center justify-center group">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-5 h-5 group-hover:scale-110 transition" alt="Google" />
            </button>
            <button className="bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 hover:border-[#1877F2] py-3 rounded-xl transition flex items-center justify-center group">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/2048px-2021_Facebook_icon.svg.png" className="w-5 h-5 group-hover:scale-110 transition" alt="Facebook" />
            </button>
            <button className="bg-[#FFFC00]/10 hover:bg-[#FFFC00]/20 border border-[#FFFC00]/30 hover:border-[#FFFC00] py-3 rounded-xl transition flex items-center justify-center group">
                <img src="https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png" className="w-5 h-5 group-hover:scale-110 transition" alt="Snapchat" />
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