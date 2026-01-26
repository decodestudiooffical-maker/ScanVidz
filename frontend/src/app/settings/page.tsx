'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu'; // 🔥 Import UserMenu

export default function SettingsPage() {
  const router = useRouter();
  
  // User Data States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 Load Real User Data on Mount
  useEffect(() => {
    const storedUser = localStorage.getItem('scanvidz_user');
    if (storedUser) {
        try {
            const parsed = JSON.parse(storedUser);
            setName(parsed.name || 'ScanVidz User');
            setEmail(parsed.email_or_phone || 'user@scanvidz.com');
            // Phone, DOB, Gender database se aayega future mein
        } catch (e) {
            console.error(e);
        }
    }
  }, []);

  const handleSave = () => {
    setLoading(true);
    // Backend API Call Simulation
    setTimeout(() => {
        // Update Local Storage locally for demo
        const storedUser = localStorage.getItem('scanvidz_user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            parsed.name = name; // Update name
            localStorage.setItem('scanvidz_user', JSON.stringify(parsed));
        }

        alert('Profile Updated Successfully! ✅');
        setLoading(false);
        window.location.reload(); // Refresh to show new name in UserMenu
    }, 1000);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('scanvidz_user');
        router.push('/login'); 
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-gray-800">
         <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition flex items-center gap-1">
               <span>←</span> Back
            </button>
            <h1 className="text-xl font-bold hidden md:block">Settings</h1>
         </div>

         {/* 🔥 Added UserMenu for Consistency */}
         <UserMenu />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6">
        
        {/* Profile Avatar Section */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-4xl font-bold mb-4 border-4 border-[#1f1f1f] shadow-xl relative group cursor-pointer">
                {name ? name.charAt(0).toUpperCase() : 'U'}
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-medium">
                    Change
                </div>
            </div>
            <h2 className="text-2xl font-bold">{name || 'Guest User'}</h2>
            <p className="text-gray-400 text-sm">Free Plan Member</p>
        </div>

        {/* Edit Details Form */}
        <div className="space-y-6 bg-[#121212] p-6 rounded-2xl border border-gray-800">
            
            {/* 1. Name */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Display Name</label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition"
                />
            </div>

            {/* 2. Email (Read Only) */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                <input 
                    type="text" 
                    value={email}
                    disabled
                    className="w-full bg-[#1f1f1f]/50 border border-gray-800 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-600 mt-2">To change email, please contact support.</p>
            </div>

            {/* 3. Phone Number */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone Number</label>
                <input 
                    type="tel" 
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition"
                />
            </div>

            {/* Row for DOB and Gender */}
            <div className="flex flex-col md:flex-row gap-6">
                
                {/* 4. Date of Birth */}
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date of Birth</label>
                    <input 
                        type="date" 
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition [color-scheme:dark]" 
                    />
                </div>

                {/* 5. Gender */}
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Gender</label>
                    <select 
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-[#1f1f1f] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition appearance-none cursor-pointer"
                    >
                        <option value="" disabled>Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition shadow-lg active:scale-95"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

        </div>

        {/* Danger Zone (Logout) */}
        <div className="mt-8">
            <h3 className="text-red-500 font-bold mb-4 text-sm uppercase">Danger Zone</h3>
            <button 
                onClick={handleLogout}
                className="w-full border border-red-900/50 text-red-500 bg-red-900/10 hover:bg-red-900/20 font-bold py-3 rounded-xl transition"
            >
                Log Out
            </button>
        </div>

      </main>
    </div>
  );
}