'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE_URL = "https://scanvidz-backend.onrender.com";

export default function SignupPage() {
  const router = useRouter();
  
  // --- STATES ---
  const [name, setName] = useState('');
  const [input, setInput] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Feature States
  const [loading, setLoading] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0 to 4

  // --- PASSWORD STRENGTH METER ---
  useEffect(() => {
      let score = 0;
      if (password.length > 5) score++;
      if (password.length > 8) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++; // Special char
      setPasswordStrength(score); // Max 5
  }, [password]);

  // --- SIGNUP LOGIC ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShakeError(false);

    // Validation
    const isEmail = input.includes('@');
    const isPhone = /^\d+$/.test(input);

    if (!name.trim()) {
        alert("Please enter your full name.");
        setShakeError(true); setLoading(false); return;
    }
    if (!isEmail && !isPhone) {
        alert("Please enter a valid Email or Phone Number");
        setShakeError(true); setLoading(false); return;
    }
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        setShakeError(true); setLoading(false); return;
    }

    // API Call
    try {
        const res = await fetch(`${API_BASE_URL}/signup`, {
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
            // Success Animation or Toast could go here
            alert("✅ Account Created Successfully! Redirecting to Login...");
            router.push('/login'); 
        } else {
            setShakeError(true);
            alert("❌ Signup Error: " + (data.detail || "User already exists or invalid data"));
        }

    } catch (err) {
        console.error(err);
        alert("❌ Server Error: Is Backend Running?");
    } finally {
        setLoading(false);
    }
  };

  // Helper for Strength Color
  const getStrengthColor = () => {
      if (passwordStrength <= 1) return "bg-red-500";
      if (passwordStrength <= 3) return "bg-yellow-500";
      return "bg-green-500";
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Glows */}
      <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] left-[-20%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>

      {/* Main Glassmorphism Card */}
      <div className={`bg-[#121212]/80 backdrop-blur-xl border ${shakeError ? 'border-red-500/50 animate-shake' : 'border-gray-800'} w-[90%] max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl z-10 relative transition-all duration-300`}>
        
        {/* Header */}
        <div className="text-center mb-6">
            <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-1">
                Join ScanVidz
            </h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Start Your Streaming Journey</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-4">
            
            {/* Input: Full Name */}
            <div className="group">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 group-focus-within:text-white transition-colors">Full Name</label>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="John Doe" 
                        className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all placeholder-gray-600 text-sm shadow-inner"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <span className="absolute right-4 top-3 text-gray-500 group-focus-within:text-purple-500 transition">👤</span>
                </div>
            </div>

            {/* Input: Email or Phone */}
            <div className="group">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 group-focus-within:text-white transition-colors">Email or Phone</label>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="john@example.com" 
                        className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all placeholder-gray-600 text-sm shadow-inner"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        required
                    />
                    <span className="absolute right-4 top-3 text-gray-500 group-focus-within:text-blue-500 transition">📧</span>
                </div>
            </div>

            {/* Input: Password */}
            <div className="group">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 group-focus-within:text-white transition-colors">Create Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Min 6 characters" 
                        className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-all placeholder-gray-600 text-sm shadow-inner"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3 text-gray-500 hover:text-white transition"
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                </div>
                
                {/* Password Strength Meter */}
                {password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${getStrengthColor()}`} 
                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold">
                            {passwordStrength <= 2 ? "Weak" : passwordStrength <= 3 ? "Medium" : "Strong"}
                        </span>
                    </div>
                )}
            </div>

            {/* Submit Button */}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 mt-4"
            >
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Create Free Account'}
            </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-gray-800 flex-1"></div>
            <span className="text-gray-600 text-[10px] uppercase font-bold tracking-wider">Or join with</span>
            <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-3 gap-3">
            <button className="bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-gray-700 hover:border-white/30 py-3 rounded-xl transition flex items-center justify-center group">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-5 h-5 group-hover:scale-110 transition" alt="Google" />
            </button>
            <button className="bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 hover:border-[#1877F2] py-3 rounded-xl transition flex items-center justify-center group">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/2048px-2021_Facebook_icon.svg.png" className="w-5 h-5 group-hover:scale-110 transition" alt="Facebook" />
            </button>
            <button className="bg-[#FFFC00]/10 hover:bg-[#FFFC00]/20 border border-[#FFFC00]/30 hover:border-[#FFFC00] py-3 rounded-xl transition flex items-center justify-center group">
                <img src="https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png" className="w-5 h-5 group-hover:scale-100 transition" alt="Snapchat" />
            </button>
        </div>

        {/* Login Link */}
        <div className="text-center mt-8 text-sm text-gray-400">
            Already have an account? {' '}
            <Link href="/login" className="text-purple-400 font-bold hover:text-purple-300 hover:underline transition">
                Login here
            </Link>
        </div>

      </div>

      {/* Animation CSS */}
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