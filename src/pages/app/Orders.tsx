import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, MessageSquare, Printer, ChefHat, Truck, CheckCircle, XCircle } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';

export default function Orders() {
  const navigate = useNavigate();
  const currentUserEmail = localStorage.getItem('currentUserEmail');
  const currentUserName = localStorage.getItem('currentUserName') || 'User';
  const isAdmin = localStorage.getItem('currentUserRole') === 'admin';

  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadOrders();
  }, [currentUserEmail, isAdmin]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadOrders = async () => {
    if (!currentUserEmail) return;
    try {
      setLoading(true);
      const data = await SupabaseService.getOrders(isAdmin ? undefined : currentUserEmail);
      const mapped = data.map((o: any) => ({
        ...o,
        user: o.user_name || o.user_email?.split('@')[0] || 'Guest',
        paymentMethod: o.payment_method || 'Cash'
      }));
      setOrders(mapped);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o: any) => {
    const matchesFilter = filter === 'All' || o.status?.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      (o.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.user || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    const headers = ['Order ID', 'Customer', 'Date', 'Total', 'Status'];
    const csvData = filteredOrders.map((o: any) => [o.id, o.user, o.date, o.total, o.status]);
    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Order_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (order: any) => {
    setSelectedOrder(order);
    setTimeout(() => window.print(), 100);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (updatingId === orderId) return;

    const prevOrders = orders;
    const order = orders.find(o => o.id === orderId);

    try {
      setUpdatingId(orderId);

      // Optimistic update
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      );

      await SupabaseService.updateOrderStatus(orderId, newStatus);

      // Refund poin jika cancel dan bayar pakai Points
      if (newStatus === 'Cancelled' && order?.payment_method === 'Points' && currentUserEmail) {
        // Hitung total order (strip format Rp)
        const totalStr = order.total || '0';
        const totalNum = parseInt(totalStr.replace(/[^0-9]/g, '')) || 0;

        // Ambil poin sekarang lalu tambahkan refund
        const profile = await SupabaseService.getProfile(currentUserEmail);
        const currentPoints = profile?.points || 0;
        const refundedPoints = currentPoints + totalNum;

        await SupabaseService.upsertProfile({
          email: currentUserEmail,
          points: refundedPoints
        });

        showToast(`Pesanan dibatalkan. ${totalNum.toLocaleString('id-ID')} poin dikembalikan!`, 'success');
      } else {
        showToast(`Status berhasil diubah ke ${newStatus}`, 'success');
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
      setOrders(prevOrders);
      showToast(err?.message || 'Gagal mengupdate status pesanan.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-asphalt"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-bold transition-all ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-asphalt">
            {isAdmin ? 'Rekap Pesanan' : 'Riwayat Pembelian'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin
              ? 'Lacak semua aktivitas penjualan dan detail pelanggan.'
              : `Halo ${currentUserName}, ini adalah riwayat kopi yang pernah kamu beli.`}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <>
              <button
                onClick={() => { setSelectedOrder(null); setTimeout(() => window.print(), 100); }}
                className="hidden sm:flex items-center space-x-2 bg-white px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Printer size={18} />
                <span>Print Report</span>
              </button>
              <button
                onClick={handleExport}
                className="hidden sm:flex items-center space-x-2 bg-white px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download size={18} />
                <span>Export CSV</span>
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/app/menu')}
            className="bg-brand-asphalt text-white px-4 sm:px-6 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-black shadow-lg shadow-brand-slate/20 hover:scale-105 active:scale-95 transition-all"
          >
            Pelayanan
          </button>
        </div>
      </div>

      {/* Daily Summary for Admin */}
      {isAdmin && filteredOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-brand-asphalt">Ringkasan Penjualan</h2>
            <span className="text-[10px] bg-brand-sandstone text-white px-2 py-0.5 rounded-full font-bold uppercase">
              Admin Only
            </span>
          </div>
          <div className="minimal-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-brand-bg/50 text-gray-400 text-[10px] uppercase tracking-widest font-black">
                    <th className="px-6 py-4">Nama Produk</th>
                    <th className="px-6 py-4">Total Terjual</th>
                    <th className="px-6 py-4 text-right">Estimasi Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.02]">
                  {Object.values(
                    filteredOrders.reduce((acc: any, order) => {
                      (order.items || []).forEach((it: any) => {
                        if (!acc[it.name]) acc[it.name] = { name: it.name, qty: 0, total: 0 };
                        acc[it.name].qty += it.qty;
                        const price = parseInt((it.price || '').replace('Rp ', '').replace(/\./g, '')) || 0;
                        acc[it.name].total += price * it.qty;
                      });
                      return acc;
                    }, {})
                  )
                    .sort((a: any, b: any) => b.qty - a.qty)
                    .map((summary: any, idx: number) => (
                      <tr key={idx} className="hover:bg-brand-bg/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-brand-ink">{summary.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-brand-asphalt">{summary.qty} x</span>
                            <div className="w-24 h-1.5 bg-brand-bg rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-sandstone"
                                style={{ width: `${Math.min(100, (summary.qty / filteredOrders.length) * 50)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-black text-brand-ink">
                            Rp {summary.total.toLocaleString('id-ID')}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="minimal-card overflow-hidden">
        {isAdmin && (
          <div className="p-6 border-b border-black/[0.05] flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar scrollbar-none">
              {['All', 'Confirmed', 'Preparing', 'Delivery', 'Completed', 'Cancelled'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                    filter === tab
                      ? 'bg-brand-asphalt text-white ring-2 ring-brand-asphalt/20'
                      : 'text-gray-400 hover:text-brand-ink hover:bg-brand-bg'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari ID atau Pelanggan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-brand-bg border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-asphalt outline-none font-bold"
              />
            </div>
          </div>
        )}

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-bg/50 text-gray-400 text-[10px] uppercase tracking-widest font-black">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4">Item Detail</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.02]">
              {filteredOrders.map(order => {
                const isUpdating = updatingId === order.id;
                return (
                  <tr key={order.id} className="hover:bg-brand-bg/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-brand-ink font-bold opacity-60">
                      {order.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-lg bg-brand-sandstone flex items-center justify-center text-white text-[10px] font-black shrink-0">
                          {(order.user || '?')[0]}
                        </div>
                        <span className="text-sm font-bold text-brand-ink truncate max-w-[120px]">
                          {order.user}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                        {(order.items || []).map((it: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 bg-white border border-brand-asphalt/10 px-2 py-0.5 rounded-md shadow-sm"
                          >
                            <span className="text-[10px] font-bold text-brand-ink">{it.name}</span>
                            <span className="text-[10px] bg-brand-sandstone text-white px-1.5 rounded-sm font-black">
                              x{it.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 font-medium whitespace-nowrap">
                      {order.date}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-brand-ink whitespace-nowrap">
                      {order.total}
                      {order.payment_method === 'Points' && (
                        <span className="ml-1 text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black">POIN</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest whitespace-nowrap ${
                        order.status === 'Completed' ? 'bg-[#DCFCE7] text-[#166534]' :
                        order.status === 'Confirmed' ? 'bg-blue-50 text-blue-600' :
                        order.status === 'Preparing' ? 'bg-amber-50 text-amber-600' :
                        order.status === 'Delivery' ? 'bg-purple-50 text-purple-600' :
                        'bg-red-50 text-red-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2 whitespace-nowrap">
                        {isAdmin && order.status === 'Confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                            disabled={isUpdating}
                            className={`p-2 rounded-lg transition-all ${
                              isUpdating
                                ? 'opacity-50 cursor-not-allowed bg-amber-50 text-amber-400'
                                : 'hover:bg-amber-50 hover:text-amber-600 text-gray-400'
                            }`}
                            title="Mulai Proses"
                          >
                            {isUpdating
                              ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              : <ChefHat size={16} />
                            }
                          </button>
                        )}
                        {isAdmin && order.status === 'Preparing' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Delivery')}
                            disabled={isUpdating}
                            className={`p-2 rounded-lg transition-all ${
                              isUpdating
                                ? 'opacity-50 cursor-not-allowed bg-purple-50 text-purple-400'
                                : 'hover:bg-purple-50 hover:text-purple-600 text-gray-400'
                            }`}
                            title="Kirim Pesanan"
                          >
                            {isUpdating
                              ? <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                              : <Truck size={16} />
                            }
                          </button>
                        )}
                        {isAdmin && order.status === 'Delivery' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Completed')}
                            disabled={isUpdating}
                            className={`p-2 rounded-lg transition-all ${
                              isUpdating
                                ? 'opacity-50 cursor-not-allowed bg-green-50 text-green-400'
                                : 'hover:bg-green-50 hover:text-green-600 text-gray-400'
                            }`}
                            title="Selesaikan Pesanan"
                          >
                            {isUpdating
                              ? <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                              : <CheckCircle size={16} />
                            }
                          </button>
                        )}
                        {!isAdmin && order.status === 'Confirmed' && (
                          <button
                            onClick={() => {
                              const msg = order.payment_method === 'Points'
                                ? 'Yakin ingin membatalkan? Poin akan dikembalikan.'
                                : 'Yakin ingin membatalkan pesanan ini?';
                              if (confirm(msg)) {
                                handleUpdateStatus(order.id, 'Cancelled');
                              }
                            }}
                            disabled={isUpdating}
                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-gray-400 disabled:opacity-50"
                            title="Batalkan Pesanan"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        {!isAdmin && order.status === 'Delivery' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Completed')}
                            disabled={isUpdating}
                            className="p-2 hover:bg-green-50 hover:text-green-600 rounded-lg transition-all text-gray-400 disabled:opacity-50"
                            title="Pesanan Diterima"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {!isAdmin && (
                          <button
                            onClick={() => navigate(`/app/complaints?id=${order.id}`)}
                            className="p-2 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all text-gray-400"
                            title="Komplain Pesanan"
                          >
                            <MessageSquare size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrint(order)}
                          className="p-2 hover:bg-brand-asphalt hover:text-white rounded-lg transition-all text-gray-400"
                          title="Print Receipt"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden divide-y divide-black/[0.05]">
          {filteredOrders.map(order => {
            const isUpdating = updatingId === order.id;
            return (
              <div key={order.id} className="p-5 space-y-4 hover:bg-brand-bg/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-brand-sandstone flex items-center justify-center text-white text-xs font-black">
                      {(order.user || '?')[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-brand-ink">{order.user}</h3>
                      <p className="text-[10px] font-mono text-gray-400">ID: {order.id}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[8px] font-extrabold uppercase tracking-widest ${
                    order.status === 'Completed' ? 'bg-[#DCFCE7] text-[#166534]' :
                    order.status === 'Confirmed' ? 'bg-blue-50 text-blue-600' :
                    order.status === 'Preparing' ? 'bg-amber-50 text-amber-600' :
                    order.status === 'Delivery' ? 'bg-purple-50 text-purple-600' :
                    'bg-red-50 text-red-500'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(order.items || []).map((it: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-brand-bg px-2 py-1 rounded-lg border border-brand-asphalt/5"
                    >
                      <span className="text-[11px] font-bold text-brand-ink">{it.name}</span>
                      <span className="text-[10px] bg-brand-asphalt text-white px-1.5 rounded-md font-black">
                        x{it.qty}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{order.date}</p>
                    <p className="text-base font-black text-brand-ink">
                      {order.total}
                      {order.payment_method === 'Points' && (
                        <span className="ml-1 text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black">POIN</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isAdmin && order.status === 'Confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                        disabled={isUpdating}
                        className="p-3 bg-amber-50 text-amber-600 rounded-xl shadow-sm disabled:opacity-50"
                      >
                        {isUpdating
                          ? <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          : <ChefHat size={18} />
                        }
                      </button>
                    )}
                    {isAdmin && order.status === 'Preparing' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Delivery')}
                        disabled={isUpdating}
                        className="p-3 bg-purple-50 text-purple-600 rounded-xl shadow-sm disabled:opacity-50"
                      >
                        {isUpdating
                          ? <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          : <Truck size={18} />
                        }
                      </button>
                    )}
                    {isAdmin && order.status === 'Delivery' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Completed')}
                        disabled={isUpdating}
                        className="p-3 bg-green-50 text-green-600 rounded-xl shadow-sm disabled:opacity-50"
                      >
                        {isUpdating
                          ? <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                          : <CheckCircle size={18} />
                        }
                      </button>
                    )}
                    {!isAdmin && order.status === 'Confirmed' && (
                      <button
                        onClick={() => {
                          const msg = order.payment_method === 'Points'
                            ? 'Yakin ingin membatalkan? Poin akan dikembalikan.'
                            : 'Yakin ingin membatalkan pesanan ini?';
                          if (confirm(msg)) handleUpdateStatus(order.id, 'Cancelled');
                        }}
                        disabled={isUpdating}
                        className="p-3 bg-red-50 text-red-600 rounded-xl shadow-sm disabled:opacity-50"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                    {!isAdmin && order.status === 'Delivery' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Completed')}
                        disabled={isUpdating}
                        className="p-3 bg-green-50 text-green-600 rounded-xl shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    {!isAdmin && (
                      <button
                        onClick={() => navigate(`/app/complaints?id=${order.id}`)}
                        className="p-3 bg-orange-50 text-orange-600 rounded-xl shadow-sm"
                      >
                        <MessageSquare size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handlePrint(order)}
                      className="p-3 bg-brand-bg text-brand-asphalt rounded-xl shadow-sm border border-brand-asphalt/10"
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Print Receipt */}
      <div className="hidden print:block fixed inset-0 bg-white p-10 z-[100]">
        {selectedOrder && (
          <div className="max-w-xs mx-auto text-center font-mono text-sm">
            <h2 className="text-xl font-bold mb-1">AULD REEKIE</h2>
            <p className="text-xs mb-4">Coffee & Roastery</p>
            <div className="border-t border-dashed border-black my-4" />
            <div className="flex justify-between mb-2"><span>Order ID:</span><span>{selectedOrder.id}</span></div>
            <div className="flex justify-between mb-2"><span>Date:</span><span>{selectedOrder.date}</span></div>
            <div className="flex justify-between mb-4"><span>Customer:</span><span>{selectedOrder.user}</span></div>
            <div className="border-t border-dashed border-black my-4" />
            <div className="space-y-2 mb-4">
              {selectedOrder.items.map((it: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <div className="text-left">
                    <div>{it.name}</div>
                    <div className="text-[10px]">x{it.qty}</div>
                  </div>
                  <span>{it.price}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-black my-4" />
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL:</span>
              <span>{selectedOrder.total}</span>
            </div>
            <div className="mt-8 text-[10px]">
              <p>Terima kasih sudah berkunjung ke Auld Reekie!</p>
              <p>Follow us @auldreekiecoffee</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          ${selectedOrder ? `
            body * { visibility: hidden; }
            .print\\:block, .print\\:block * { visibility: visible; }
            .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
          ` : `
            @page { size: landscape; }
            body * { visibility: hidden; }
            .minimal-card, .minimal-card * { visibility: visible; }
            .minimal-card { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
            header, nav, aside, button, .flex-1 { display: none !important; }
            .minimal-card button { display: none !important; }
          `}
        }
      `}</style>
    </div>
  );
}