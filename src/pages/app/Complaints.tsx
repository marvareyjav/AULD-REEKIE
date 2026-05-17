import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, MessageSquare, History, Search, Trash2, CheckCircle, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { SupabaseService, Complaint } from '../../services/supabaseService';

export default function Complaints() {
  const [searchParams] = useSearchParams();
  const prefilledOrderId = searchParams.get('id') || '';

  const [complaint, setComplaint] = useState('');
  const [orderId, setOrderId] = useState(prefilledOrderId);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const currentUserEmail = localStorage.getItem('currentUserEmail');
  const currentUserName = localStorage.getItem('currentUserName') || 'User';
  const isAdmin = localStorage.getItem('currentUserRole') === 'admin';

  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    loadComplaints();
  }, [currentUserEmail, isAdmin]);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getComplaints(isAdmin ? undefined : currentUserEmail!);
      setComplaints(data);
    } catch (err) {
      console.error('Error loading complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint.trim() || !currentUserEmail) return;

    try {
      setSubmitLoading(true);
      const newComplaint: Complaint = {
        user_email: currentUserEmail,
        user_name: currentUserName,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        title: complaint,
        status: 'New',
        order_id: orderId || 'General Feedback'
      };

      await SupabaseService.createComplaint(newComplaint);
      await loadComplaints();

      setComplaint('');
      setOrderId('');
      alert('Terima kasih atas masukannya! Akan kami tinjau segera.');
    } catch (err) {
      console.error('Error submitting complaint:', err);
      alert('Gagal mengirim pesan.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) return;
    if (confirm('Hapus masukan ini?')) {
      try {
        await SupabaseService.deleteComplaint(id);
        await loadComplaints();
      } catch (err) {
        console.error('Error deleting complaint:', err);
      }
    }
  };

  const COMPENSATION_POINTS = 5000;

  const handleConfirm = async (item: Complaint) => {
    if (!isAdmin || !item.id) return;
    try {
      // Update complaint status to Reviewed
      await SupabaseService.updateComplaintStatus(item.id, 'Reviewed');

      // Give compensation points to the user
      const userProfile = await SupabaseService.getProfile(item.user_email);
      const currentPoints = userProfile?.points || 0;
      await SupabaseService.upsertProfile({
        email: item.user_email,
        points: currentPoints + COMPENSATION_POINTS
      });

      alert(`Komplain dikonfirmasi! ${item.user_name} mendapat kompensasi ${COMPENSATION_POINTS.toLocaleString('id-ID')} poin.`);
      await loadComplaints();
    } catch (err) {
      console.error('Error confirming complaint:', err);
      alert('Gagal mengkonfirmasi komplain.');
    }
  };

  const filteredComplaints = complaints.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-asphalt"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-asphalt">
            {isAdmin ? 'Manajemen Komplain' : 'Complaints & Feedback'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            {isAdmin ? 'Review dan kelola semua masukan dari pelanggan.' : 'Sampaikan keluhan atau masukan Anda mengenai produk dan layanan kami.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        {/* Form Column - Hide for Admin unless they want to submit feedback too */}
        {!isAdmin && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-black/[0.03]">
              <h2 className="text-xl font-bold text-brand-asphalt mb-6 flex items-center">
                <MessageSquare className="mr-2 text-brand-accent" size={20} />
                Kirim Komplain
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-ink">ID Pesanan (Opsional)</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="#ORD-XXXX"
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.05] bg-brand-bg focus:bg-white focus:ring-2 focus:ring-brand-asphalt outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-ink">Masukan / Keluhan Anda</label>
                  <textarea
                    rows={5}
                    required
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    placeholder="Tuliskan pengalaman Anda..."
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.05] bg-brand-bg focus:bg-white focus:ring-2 focus:ring-brand-asphalt outline-none transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full bg-brand-asphalt text-white py-4 rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {submitLoading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Kirim Pesan</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="bg-brand-sandstone/10 p-6 rounded-[2rem] border border-brand-sandstone/20">
              <p className="text-xs sm:text-sm text-brand-ink/70 font-medium leading-relaxed">
                Tim kami akan meninjau setiap masukan dalam 1x24 jam. Terima kasih telah membantu Auld Reekie Coffee menjadi lebih baik.
              </p>
            </div>
          </div>
        )}

        {/* History Column */}
        <div className={`${isAdmin ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6`}>
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-black/[0.03] min-h-[400px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <History className="mr-2 text-gray-400" size={20} />
                {isAdmin ? 'Semua Masukan Pelanggan' : 'Riwayat Masukan'}
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-brand-bg rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-asphalt transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredComplaints.length === 0 ? (
                <div className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest text-xs">
                  Belum ada catatan masukan
                </div>
              ) : (
                filteredComplaints.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-5 rounded-[1.5rem] border border-gray-50 bg-gray-50/30 hover:bg-white hover:shadow-md transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <div className="pr-10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.date}</span>
                          {isAdmin && (
                            <span className="text-[9px] font-black text-brand-secondary bg-brand-sandstone/10 px-2 py-0.5 rounded uppercase font-sans">FROM: {item.user_name}</span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 group-hover:text-brand-accent transition-colors text-sm sm:text-base">{item.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          item.status === 'New' ? 'bg-orange-100 text-orange-600' :
                          item.status === 'Reviewed' ? 'bg-brand-asphalt/10 text-brand-asphalt' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {item.status}
                        </span>
                        {isAdmin && item.status === 'New' && (
                          <button 
                            onClick={() => handleConfirm(item)}
                            className="p-1.5 hover:bg-green-50 text-gray-300 hover:text-green-600 rounded-lg transition-colors" 
                            title="Konfirmasi & Beri Kompensasi Poin"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => item.id && handleDelete(item.id)}
                            className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-brand-accent font-black opacity-60 uppercase tracking-tighter">{item.order_id}</div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
