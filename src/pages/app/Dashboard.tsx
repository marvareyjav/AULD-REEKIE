import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Users, MessageSquare, ArrowUpRight, TrendingUp, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { SupabaseService } from '../../services/supabaseService';

export default function Dashboard() {
  const navigate = useNavigate();
  const currentUserEmail = localStorage.getItem('currentUserEmail');
  const isAdmin = localStorage.getItem('currentUserRole') === 'admin';

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [complaintCount, setComplaintCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [showFullInventory, setShowFullInventory] = useState(false);

  useEffect(() => {
    loadDashboardData();
    const timer = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(timer);
  }, [currentUserEmail]);

  const loadDashboardData = async () => {
    if (!currentUserEmail) { setLoading(false); return; }
    try {
      setLoading(true);
      const ordersData = await SupabaseService.getOrders(isAdmin ? undefined : currentUserEmail);
      setOrders(ordersData);

      const complaintsData = await SupabaseService.getComplaints(isAdmin ? undefined : currentUserEmail);
      setComplaintCount(complaintsData.length);

      const menuData = await SupabaseService.getMenuItems();
      setMenuItems(menuData);

      if (!isAdmin) {
        const profile = await SupabaseService.getProfile(currentUserEmail);
        if (profile && typeof profile.points === 'number') {
          setPoints(profile.points);
          const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
          const userIdx = usersRegistry.findIndex((u: any) => u.email === currentUserEmail);
          if (userIdx >= 0 && usersRegistry[userIdx].points !== profile.points) {
            usersRegistry[userIdx].points = profile.points;
            localStorage.setItem('users_registry', JSON.stringify(usersRegistry));
          }
        } else {
          const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
          const user = usersRegistry.find((u: any) => u.email === currentUserEmail);
          setPoints(user?.points || 0);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Top sellers dari data order real
  const topSellers = (() => {
    const salesMap: Record<string, { name: string; qty: number; price: number }> = {};
    orders.forEach(order => {
      (order.items || []).forEach((it: any) => {
        if (!salesMap[it.name]) salesMap[it.name] = { name: it.name, qty: 0, price: 0 };
        salesMap[it.name].qty += it.qty || 1;
        if (!salesMap[it.name].price) {
          const raw = typeof it.price === 'string'
            ? parseInt(it.price.replace(/[^0-9]/g, ''))
            : it.price || 0;
          salesMap[it.name].price = isNaN(raw) ? 0 : raw;
        }
      });
    });
    return Object.values(salesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3)
      .map(item => {
        const menuMatch = menuItems.find(m => m.name === item.name);
        return { ...item, img: menuMatch?.img || null };
      });
  })();

  // Fallback kalau belum ada order
  const displaySellers = topSellers.length > 0 ? topSellers : [
    { name: 'Matcha Latte', qty: 85, price: 37500, img: 'https://images.unsplash.com/photo-1536496070240-dac43ca9bc81?auto=format&fit=crop&q=80&w=200' },
    { name: 'Espresso Single', qty: 64, price: 18000, img: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=200' },
    { name: 'Classic Brownies', qty: 42, price: 22500, img: 'https://images.unsplash.com/photo-1606312619070-d48b4c6e2a52?auto=format&fit=crop&q=80&w=200' },
  ];

  const totalRevenueNum = orders
    .filter(o => o.status === 'Completed' || o.status === 'Confirmed')
    .reduce((acc, o) => {
      if (!o.total) return acc;
      const val = parseInt(o.total.toString().replace(/[^0-9]/g, ''));
      return isNaN(val) ? acc : acc + val;
    }, 0);

  const totalItemsBought = orders.reduce((acc, o) => {
    const itemQty = o.items ? o.items.reduce((sum: number, item: any) => sum + item.qty, 0) : 1;
    return acc + itemQty;
  }, 0);

  const stats = isAdmin ? [
    { name: 'Total Revenue', value: `Rp ${totalRevenueNum.toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-white', bg: 'bg-brand-slate' },
    { name: 'Active Orders', value: orders.filter(o => o.status === 'Confirmed' || o.status === 'Pending').length.toString(), icon: ShoppingCart, color: 'text-white', bg: 'bg-brand-asphalt' },
    { name: 'Total Orders', value: orders.length.toString(), icon: Users, color: 'text-white', bg: 'bg-brand-sandstone' },
    { name: 'Complaints', value: complaintCount.toString(), icon: MessageSquare, color: 'text-white', bg: 'bg-brand-mossy' },
  ] : [
    { name: 'Kopi Points', value: `${points.toLocaleString('id-ID')} pts`, icon: DollarSign, color: 'text-white', bg: 'bg-brand-slate' },
    { name: 'Total Items Bought', value: totalItemsBought.toString(), icon: ShoppingCart, color: 'text-white', bg: 'bg-brand-asphalt' },
    { name: 'Active Orders', value: orders.filter(o => o.status === 'Confirmed').length.toString(), icon: TrendingUp, color: 'text-white', bg: 'bg-brand-sandstone' },
    { name: 'My Feedback', value: complaintCount.toString(), icon: MessageSquare, color: 'text-white', bg: 'bg-brand-mossy' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-asphalt"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-brand-asphalt tracking-tight font-sans">Dashboard</h1>
        <p className="text-xs sm:text-base text-gray-500 mt-1 sm:mt-2 font-medium">
          {isAdmin
            ? 'Real-time performance summary for Auld Reekie Coffee.'
            : 'Ringkasan aktivitas ngopi kamu di Auld Reekie Coffee secara real-time.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="minimal-card p-3 sm:p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-brand-asphalt/50 truncate mr-2">{stat.name}</span>
              <div className={`p-1 sm:p-2 rounded-lg ${stat.bg} ${stat.color} shadow-lg shadow-black/10 shrink-0`}>
                <stat.icon size={12} className="sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <h3 className="text-sm sm:text-2xl font-black text-brand-ink truncate">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 minimal-card overflow-hidden">
          <div className="p-6 border-b border-black/[0.05] flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-ink">Recent Order Recap</h2>
            <button className="text-brand-accent text-sm font-bold hover:underline" onClick={() => navigate('/app/orders')}>View All</button>
          </div>

          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-brand-bg/50 text-gray-400 text-[10px] uppercase tracking-widest font-black">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4 text-center">Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.02]">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-brand-bg/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-sandstone flex items-center justify-center text-white text-[10px] font-black shrink-0">
                          {(order.user_name || order.user || 'G')[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-brand-ink truncate max-w-[120px]">{order.user_name || order.user || 'Guest'}</span>
                          <span className="text-[9px] text-gray-400 font-mono tracking-tighter">{order.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                        {(order.items || []).map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1 bg-white border border-brand-asphalt/10 px-2 py-0.5 rounded-md shadow-sm">
                            <span className="text-[10px] font-bold text-brand-ink">{it.name}</span>
                            <span className="text-[10px] bg-brand-sandstone text-white px-1.5 rounded-sm font-black">x{it.qty}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-brand-ink whitespace-nowrap">{order.total}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest whitespace-nowrap ${
                        order.status === 'Completed' ? 'bg-[#DCFCE7] text-[#166534]' :
                        order.status === 'Confirmed' ? 'bg-blue-50 text-blue-600' :
                        order.status === 'Preparing' ? 'bg-amber-50 text-amber-600' :
                        order.status === 'Delivery' ? 'bg-purple-50 text-purple-600' :
                        order.status === 'Cancelled' ? 'bg-red-50 text-red-500' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">Belum ada pesanan masuk</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-black/[0.05]">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-5 space-y-3 hover:bg-brand-bg/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-sandstone flex items-center justify-center text-white text-xs font-black">
                      {(order.user_name || order.user || 'G')[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-brand-ink truncate max-w-[150px]">{order.user_name || order.user || 'Guest'}</h3>
                      <p className="text-[10px] text-gray-400 font-mono italic">{order.id}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[8px] font-extrabold uppercase tracking-widest ${
                    order.status === 'Completed' ? 'bg-[#DCFCE7] text-[#166534]' :
                    order.status === 'Confirmed' ? 'bg-blue-50 text-blue-600' :
                    order.status === 'Cancelled' ? 'bg-red-50 text-red-500' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-12">
                  {(order.items || []).map((it: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1 bg-brand-bg/80 border border-brand-asphalt/5 px-2 py-0.5 rounded-md">
                      <span className="text-[10px] font-bold text-brand-ink">{it.name}</span>
                      <span className="text-[10px] bg-brand-asphalt text-white px-1.5 rounded-sm font-black">x{it.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center ml-12 pt-1 border-t border-black/[0.02]">
                  <span className="text-sm font-black text-brand-ink">{order.total}</span>
                  <ArrowUpRight size={14} className="text-brand-sandstone" />
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="p-10 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">Belum ada pesanan masuk</div>
            )}
          </div>
        </div>

        {/* ✅ Top Sellers card — scrollable di dalam card, Full Inventory expand di dalam */}
        <div className="minimal-card p-6 flex flex-col" style={{ maxHeight: '520px' }}>
          <div className="flex items-center justify-between mb-8 shrink-0">
            <h2 className="text-lg font-bold text-brand-ink">
              {showFullInventory ? 'Full Inventory' : 'Top Sellers'}
            </h2>
            <TrendingUp size={18} className="text-brand-accent" />
          </div>

          {/* Scrollable area */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {!showFullInventory ? (
              // Top Sellers list
              displaySellers.map((item) => (
                <div key={item.name} className="flex items-center space-x-4">
                  {item.img ? (
                    <img src={item.img} alt={item.name} className="h-14 w-14 rounded-2xl object-cover border border-black/[0.03] shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-brand-bg flex items-center justify-center border border-black/[0.03] shrink-0">
                      <span className="text-2xl">☕</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-brand-ink truncate">{item.name}</h4>
                    <p className="text-xs text-gray-400 font-medium">{item.qty} orders</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-ink text-sm">
                      {item.price > 0 ? `Rp ${item.price.toLocaleString('id-ID')}` : '—'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              // Full Inventory list — scroll di dalam card ini
              menuItems.length === 0 ? (
                <div className="py-10 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">
                  Belum ada menu di katalog
                </div>
              ) : (
                menuItems.map((item) => (
                  <div key={item.id || item.name} className="flex items-center space-x-4">
                    {item.img ? (
                      <img src={item.img} alt={item.name} className="h-14 w-14 rounded-2xl object-cover border border-black/[0.03] shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-brand-bg flex items-center justify-center border border-black/[0.03] shrink-0">
                        <span className="text-2xl">☕</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-brand-ink truncate">{item.name}</h4>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{item.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-brand-ink text-sm">Rp {(item.price || 0).toLocaleString('id-ID')}</p>
                      {item.tag && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                          item.tag === 'Best Seller' ? 'bg-orange-100 text-orange-500' :
                          item.tag === 'New Menu' ? 'bg-green-100 text-green-600' :
                          'bg-brand-bg text-brand-asphalt'
                        }`}>
                          {item.tag}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {/* ✅ Toggle button — Full Inventory / Back to Top Sellers */}
          <button
            onClick={() => setShowFullInventory(prev => !prev)}
            className="w-full mt-6 py-3 border-2 border-brand-slate text-brand-slate font-bold rounded-xl text-sm hover:bg-brand-slate/10 transition-all shrink-0"
          >
            {showFullInventory ? '← Top Sellers' : 'Full Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
}