import { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, Trash2, ShieldCheck, Mail, Ban, Gift, X, Star } from 'lucide-react';
import { SupabaseService, Profile } from '../../services/supabaseService';
import { supabase } from '../../lib/supabase';

export default function UserManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [giftPoints, setGiftPoints] = useState(10000);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getAllProfiles();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    active: users.filter(u => u.status === 'Active').length,
    admins: users.filter(u => u.role === 'admin').length,
    blocked: users.filter(u => u.status === 'Blocked').length,
  };

  const handleBlock = async (email: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Blocked' ? 'Active' : 'Blocked';
      await SupabaseService.upsertProfile({ email, status: newStatus });
      await loadUsers();
    } catch (err) {
      console.error('Error blocking user:', err);
    }
  };

  const handleDelete = async (email: string) => {
    if (confirm(`Yakin ingin menghapus user ${email}? Semua data permanen akan hilang.`)) {
      try {
        // Delete from local registry
        const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
        const updatedRegistry = usersRegistry.filter((u: any) => u.email !== email);
        localStorage.setItem('users_registry', JSON.stringify(updatedRegistry));

        // Attempt delete from Supabase
        const { error } = await supabase.from('profiles').delete().eq('email', email);
        if (error) console.warn('Supabase delete failed, but local registry was updated');
        
        await loadUsers();
      } catch (err) {
        console.error('Error deleting user:', err);
      }
    }
  };

  const handleGiftPoints = async () => {
    if (!selectedUser) return;
    try {
      const currentPoints = selectedUser.points || 0;
      const newPoints = currentPoints + giftPoints;
      await SupabaseService.upsertProfile({ email: selectedUser.email, points: newPoints });
      alert(`Berhasil mengirim hadiah ${giftPoints.toLocaleString()} poin ke ${selectedUser.username}!`);
      setShowGiftModal(false);
      await loadUsers();
    } catch (err) {
      console.error('Error gifting points:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-asphalt">User Management</h1>
          <p className="text-gray-500 mt-1">Kelola akses, role, dan akun pengguna Auld Reekie Coffee.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center space-x-2 bg-brand-asphalt text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <UserPlus size={20} />
          <span>Tambah User Baru</span>
        </button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Users', value: stats.active.toString(), color: 'bg-green-600' },
          { label: 'Admins', value: stats.admins.toString(), color: 'bg-brand-slate' },
          { label: 'Blocked Accounts', value: stats.blocked.toString(), color: 'bg-red-500' },
        ].map((stat) => (
          <div key={stat.label} className="minimal-card p-6 flex items-center justify-between">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{stat.label}</span>
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-brand-ink">{stat.value}</span>
              <div className={`h-2 w-2 rounded-full ${stat.color} animate-pulse`} />
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="minimal-card overflow-hidden">
        <div className="p-6 border-b border-black/[0.05] flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari user berdasarkan nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-brand-bg border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-asphalt outline-none font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg/50">
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">User</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Email</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Role</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.02]">
              {filteredUsers.map((user) => (
                <tr key={user.email} className="group hover:bg-brand-bg transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-2xl bg-brand-sandstone/20 flex items-center justify-center text-brand-ink font-extrabold shadow-sm border border-black/[0.03] overflow-hidden">
                        <img src={user.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="avatar" />
                      </div>
                      <span className="font-bold text-brand-ink">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-gray-500 font-medium text-sm">{user.email}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-1.5 font-bold text-[10px] uppercase tracking-widest">
                      {user.role === 'admin' ? (
                        <span className="flex items-center text-brand-slate bg-brand-slate/10 px-2.5 py-1 rounded-md border border-brand-slate/20">
                          <ShieldCheck size={12} className="mr-1" /> ADMIN
                        </span>
                      ) : (
                        <span className="text-brand-ink/40 bg-brand-bg px-2.5 py-1 rounded-md font-extrabold border border-black/[0.03]">USER</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest ${
                      user.status === 'Active' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-red-50 text-red-500'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right space-x-1">
                    {user.role !== 'admin' && (
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setShowGiftModal(true);
                        }}
                        className="p-2 text-brand-ink/30 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                        title="Gift Points"
                      >
                        <Gift size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleBlock(user.email, user.status)}
                      className={`p-2 rounded-lg transition-all ${user.status === 'Blocked' ? 'text-red-600 bg-red-50' : 'text-brand-ink/30 hover:text-red-500 hover:bg-red-50'}`}
                      title={user.status === 'Blocked' ? 'Unblock' : 'Block User'}
                    >
                      <Ban size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(user.email)}
                      className="p-2 text-brand-ink/30 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                      title="Hapus Permanen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-asphalt/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-brand-asphalt">👤 Tambah User</h3>
              <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const email = formData.get('email') as string;
              const username = formData.get('username') as string;
              const role = formData.get('role') as string;
              
              try {
                const result = await SupabaseService.upsertProfile({
                  email,
                  username,
                  role,
                  status: 'Active',
                  points: 0,
                  joined_at: new Date().toISOString()
                });
                
                if (result) {
                  alert(`User ${email} berhasil disimpan!`);
                  setShowAddModal(false);
                  await loadUsers();
                } else {
                  alert(`Gagal menyimpan user. Silakan hubungi admin.`);
                }
              } catch (err) {
                console.error('Error adding user:', err);
                alert(`Error: ${err instanceof Error ? err.message : 'Gagal menyimpan user'}`);
              }
            }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-brand-asphalt/40 block ml-1 tracking-widest">Email Address</label>
                <input 
                  name="email"
                  type="email"
                  required
                  className="w-full px-6 py-4 bg-brand-bg rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-asphalt transition-all text-sm"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-brand-asphalt/40 block ml-1 tracking-widest">Full Name / Username</label>
                <input 
                  name="username"
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-brand-bg rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-asphalt transition-all text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-brand-asphalt/40 block ml-1 tracking-widest">Role</label>
                <select 
                  name="role"
                  className="w-full px-6 py-4 bg-brand-bg rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-asphalt transition-all text-sm appearance-none"
                >
                  <option value="user">User / Pelanggan</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-brand-asphalt text-white py-4 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all mt-4"
              >
                Simpan User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Gift Modal */}
      {showGiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-asphalt/40 backdrop-blur-sm" onClick={() => setShowGiftModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-brand-asphalt">🎁 Kirim Hadiah</h3>
              <button onClick={() => setShowGiftModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-6">
              {selectedUser && (
                <div className="p-4 bg-brand-bg rounded-2xl border border-black/[0.03] flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-sandstone flex items-center justify-center text-white font-bold">
                    {selectedUser.username[0]}
                  </div>
                  <div>
                    <p className="text-xs font-black text-brand-asphalt uppercase leading-none">{selectedUser.username}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{selectedUser.email}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-brand-asphalt/40 block ml-1 tracking-widest">Jumlah Poin</label>
                <div className="relative">
                  <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400" size={18} fill="currentColor" />
                  <input 
                    type="number"
                    value={giftPoints}
                    onChange={(e) => setGiftPoints(Number(e.target.value))}
                    className="w-full pl-12 pr-6 py-4 bg-brand-bg rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-brand-asphalt transition-all"
                  />
                </div>
              </div>
              <button 
                onClick={handleGiftPoints}
                className="w-full bg-brand-asphalt text-white py-4 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
