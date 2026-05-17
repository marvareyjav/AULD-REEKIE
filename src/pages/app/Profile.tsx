import React, { useState, useEffect } from 'react';
import { User, Camera, Save, Coffee, Award, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { SupabaseService, Profile as ProfileType } from '../../services/supabaseService';

export default function Profile() {
  const currentUserEmail = localStorage.getItem('currentUserEmail');
  const isAdmin = localStorage.getItem('currentUserRole') === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState<ProfileType | null>(null);

  useEffect(() => {
    if (currentUserEmail) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [currentUserEmail]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Give it a timeout so it never hangs indefinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const dataPromise = SupabaseService.getProfile(currentUserEmail!);
      
      const data = await Promise.race([dataPromise, timeoutPromise]) as ProfileType | null;
      
      if (data) {
        setProfile(data);
        setTempProfile(data);
      } else {
        // Fallback to minimal data if everything failed
        const fallback = {
          email: currentUserEmail || '',
          username: (currentUserEmail || '').split('@')[0],
          bio: 'Coffee Lover',
          photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserEmail}`,
          points: 0,
          role: 'user',
          status: 'Active'
        };
        setProfile(fallback);
        setTempProfile(fallback);
      }
    } catch (err) {
      console.warn('Profile load timed out or failed, using local/fallback');
      const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
      const local = usersRegistry.find((u: any) => u.email === currentUserEmail) || {
        email: currentUserEmail || '',
        username: (currentUserEmail || '').split('@')[0],
        bio: 'Coffee Lover',
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserEmail}`,
        points: 0,
        role: 'user',
        status: 'Active'
      };
      setProfile(local);
      setTempProfile(local);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && tempProfile) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File terlalu besar. Maksimal 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempProfile({ ...tempProfile, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!tempProfile) return;
    try {
      setSaving(true);
      const updated = await SupabaseService.upsertProfile(tempProfile);
      localStorage.setItem('currentUserName', updated.username);
      setProfile(updated);
      setIsEditing(false);
      // No alert to prevent blocking
    } catch (err) {
      console.error('Error saving profile:', err);
      // Even if network fails, updated locally in state
      setProfile(tempProfile);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-asphalt"></div>
      </div>
    );
  }

  if (!profile || !tempProfile) return null;

  if (isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
        <div className="w-20 h-20 bg-brand-slate text-white rounded-3xl flex items-center justify-center shadow-xl mb-4">
          <User size={40} />
        </div>
        <h1 className="text-2xl font-bold text-brand-asphalt">Admin Profile</h1>
        <p className="text-gray-500 max-w-sm">Sebagai Admin, profil Anda dikelola oleh sistem pusat. Anda memiliki akses penuh ke manajemen toko.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="relative h-48 sm:h-64 rounded-[2.5rem] overflow-hidden group">
        <img 
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1200" 
          className="w-full h-full object-cover"
          alt="Cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="px-4 sm:px-10 -mt-16 sm:-mt-24 relative z-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6 text-center sm:text-left w-full sm:w-auto">
          <div className="relative group">
            <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-[1.8rem] sm:rounded-[2.5rem] bg-white p-1.5 sm:p-2 shadow-2xl overflow-hidden ring-4 ring-white">
              <img 
                src={(isEditing ? tempProfile.photo : profile.photo) || undefined} 
                className="w-full h-full object-cover rounded-[1.4rem] sm:rounded-[2rem]"
                alt="Avatar"
              />
            </div>
            {isEditing && (
              <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 flex gap-1">
                <input
                  type="file"
                  id="profile-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <button 
                  onClick={() => document.getElementById('profile-upload')?.click()}
                  className="p-2 sm:p-3 bg-brand-asphalt text-white rounded-lg sm:rounded-xl shadow-lg hover:scale-110 transition-all border-2 border-white"
                >
                  <Camera size={14} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
            )}
          </div>
          <div className="pb-1 sm:pb-2">
            <h1 className="text-xl sm:text-3xl font-black text-brand-asphalt tracking-tight flex items-center justify-center sm:justify-start gap-2">
              {profile.username}
              {!isAdmin && <Star className="text-orange-400 shrink-0" size={14} sm:size={18} fill="currentColor" />}
            </h1>
            <p className="text-brand-accent font-bold text-[8px] sm:text-sm uppercase tracking-widest mt-0.5 sm:mt-1 opacity-70">Member Setia Since 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white border border-black/[0.05] rounded-xl sm:rounded-2xl font-bold text-brand-asphalt shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-[11px] sm:text-sm"
            >
              Edit Profil
            </button>
          ) : (
            <button 
              onClick={handleSave}
              disabled={saving}
              className={`px-7 sm:px-8 py-2.5 sm:py-3 bg-brand-asphalt text-white rounded-xl sm:rounded-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-[11px] sm:text-sm ${saving ? 'opacity-70 cursor-wait' : ''}`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white/30 border-t-white"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={14} className="sm:w-[18px] sm:h-[18px]" />
                  Simpan Perubahan
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 sm:px-0">
        <div className="md:col-span-1 space-y-6">
          <div className="minimal-card p-8 text-center bg-gradient-to-br from-brand-asphalt to-brand-slate text-white border-none relative overflow-hidden">
             <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/5 rounded-full blur-3xl" />
             <div className="relative z-10">
               <Award className="mx-auto mb-4 text-orange-400" size={48} />
               <div className="text-4xl font-black mb-1">{profile.points.toLocaleString('id-ID')}</div>
               <div className="text-[10px] uppercase font-black tracking-widest opacity-60">Kopi Points (Rp)</div>
               <p className="text-[10px] mt-4 opacity-50 font-medium">Bisa ditukarkan dengan menu favoritmu!</p>
             </div>
          </div>

          <div className="minimal-card p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-asphalt/40 px-2">Info Membership</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-brand-bg rounded-xl">
                <span className="text-xs font-bold text-gray-500">Tier</span>
                <span className="text-xs font-black text-brand-asphalt">Silver Member</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-brand-bg rounded-xl">
                <span className="text-xs font-bold text-gray-500">Sejak</span>
                <span className="text-xs font-black text-brand-asphalt">Mei 2026</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="minimal-card p-8">
            <h2 className="text-lg font-black text-brand-asphalt mb-6 flex items-center gap-2">
              <Star className="text-orange-400" size={20} fill="currentColor" />
              Tentang Saya
            </h2>
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-brand-asphalt/40">Username</label>
                  <input 
                    type="text"
                    value={tempProfile.username}
                    onChange={(e) => setTempProfile({...tempProfile, username: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.05] bg-brand-bg focus:bg-white focus:ring-2 focus:ring-brand-asphalt outline-none transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-brand-asphalt/40">Bio</label>
                  <textarea 
                    rows={4}
                    value={tempProfile.bio}
                    onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.05] bg-brand-bg focus:bg-white focus:ring-2 focus:ring-brand-asphalt outline-none transition-all font-medium resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-600 leading-relaxed font-medium">
                  {profile.bio}
                </p>
                <div className="flex items-center gap-8 pt-4 border-t border-black/[0.05]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-asphalt/40 mb-1">Total Kopi</span>
                    <span className="font-bold flex items-center gap-1">
                      <Coffee size={14} className="text-brand-accent" /> 24 Gelas
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-asphalt/40 mb-1">Favorit</span>
                    <span className="font-bold">Aren Latte</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="minimal-card p-8">
            <h2 className="text-lg font-black text-brand-asphalt mb-6">Keamanan Akun</h2>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
              <div>
                <h4 className="text-sm font-bold text-red-600">Email Utama</h4>
                <p className="text-xs text-red-400 mt-1">{currentUserEmail}</p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest bg-red-200/50 text-red-600 px-2 py-1 rounded">Terverifikasi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
