'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form Data State
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      age: '',
      birthday: '',
      bio: '',
      relationship: 'Single',
      location: ''
  });

  // --- 1. LOAD USER DATA ---
  useEffect(() => {
      const stored = localStorage.getItem('scanvidz_user') || sessionStorage.getItem('scanvidz_user');
      if (stored) {
          try {
              const parsed = JSON.parse(stored);
              setUser(parsed);
              // Pre-fill form with existing data or defaults
              setFormData(prev => ({
                  ...prev,
                  name: parsed.name || '',
                  email: parsed.email || (parsed.email_or_phone?.includes('@') ? parsed.email_or_phone : ''),
                  phone: parsed.phone || (!parsed.email_or_phone?.includes('@') ? parsed.email_or_phone : ''),
                  age: parsed.age || '',
                  birthday: parsed.birthday || '',
                  bio: parsed.bio || '',
                  relationship: parsed.relationship || 'Single',
                  location: parsed.location || ''
              }));
          } catch(e) {
              router.push('/login');
          }
      } else {
          router.push('/login');
      }
  }, []);

  // --- 2. HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      // Simulate Network Delay (Real app would hit Backend API here)
      setTimeout(() => {
          if(!user) return;

          // Update Local Storage
          const updatedUser = { ...user, ...formData };
          
          if(localStorage.getItem('scanvidz_user')) {
              localStorage.setItem('scanvidz_user', JSON.stringify(updatedUser));
          } else {
              sessionStorage.setItem('scanvidz_user', JSON.stringify(updatedUser));
          }
          
          // 🔥 Dispatch event so UserMenu updates avatar/name instantly
          window.dispatchEvent(new Event('storage'));
          
          setUser(updatedUser);
          setLoading(false);
          showToast("✅ Profile Updated Successfully!");
      }, 1500);
  };

  const showToast = (msg: string) => {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
  };

  // If loading user or not logged in, return blank or loader
  if (!user) return <div className="min-h-screen bg-[#050505]"></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 pb-24 md:pb-8 flex justify-center font-sans">
        
        <div className="w-full max-w-3xl mt-4 md:mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* --- HEADER HEADER (Banner & Avatar) --- */}
            <div className="relative bg-[#121212] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden mb-6 group">
                {/* Banner Gradient */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-pink-900/40"></div>
                
                <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 mt-12">
                    {/* Avatar with Ring */}
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-[#121212] shadow-2xl bg-gray-800 overflow-hidden relative z-10">
                            <img 
                                src={`https://ui-avatars.com/api/?name=${formData.name}&background=random&size=256&bold=true`} 
                                className="w-full h-full object-cover" 
                                alt="Avatar"
                            />
                        </div>
                        <button className="absolute bottom-1 right-1 z-20 bg-blue-600 p-2 rounded-full text-white shadow-lg border-2 border-[#121212] hover:scale-110 transition">
                            ✏️
                        </button>
                    </div>

                    <div className="text-center md:text-left flex-1 mb-2">
                        <h1 className="text-3xl font-black tracking-tight">{formData.name || 'User'}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                             <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase">Premium</span>
                             <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase">@{formData.name.replace(/\s/g, '').toLowerCase().slice(0, 10)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- EDIT FORM --- */}
            <form onSubmit={handleSave} className="bg-[#121212] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-8">
                
                {/* Section 1: Basic Info */}
                <div>
                    <h2 className="text-lg font-bold border-b border-gray-800 pb-2 mb-4 text-gray-300 flex items-center gap-2">
                        <span>📋</span> Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition focus:ring-1 focus:ring-blue-500/50" placeholder="Enter your name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition focus:ring-1 focus:ring-blue-500/50" placeholder="your@email.com" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition focus:ring-1 focus:ring-blue-500/50" placeholder="+91 98765..." />
                        </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Location / Country</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition focus:ring-1 focus:ring-blue-500/50" placeholder="Mumbai, India" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Personal Details */}
                <div>
                    <h2 className="text-lg font-bold border-b border-gray-800 pb-2 mb-4 text-gray-300 flex items-center gap-2">
                        <span>🎂</span> Personal Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Birthday</label>
                            <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Age</label>
                            <input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition" placeholder="25" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Relationship</label>
                            <select name="relationship" value={formData.relationship} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition">
                                <option>Single</option>
                                <option>In a Relationship</option>
                                <option>Married</option>
                                <option>It's Complicated</option>
                                <option>Privately Locked 🔒</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 3: Bio */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Bio / Status</label>
                    <textarea name="bio" rows={3} value={formData.bio} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition resize-none" placeholder="I love gaming and coding..."></textarea>
                </div>

                {/* Save Button */}
                <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={loading} className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3.5 rounded-xl font-bold hover:opacity-90 transition transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20">
                        {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Save Changes'}
                    </button>
                </div>

            </form>
        </div>

        {/* Toast Notification */}
        {toast && (
            <div className="fixed bottom-24 md:bottom-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-bounce">
                <span>✅</span> {toast}
            </div>
        )}

    </div>
  );
}