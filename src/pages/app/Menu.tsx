import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingBag, Plus, Minus, Trash2, Edit2, X, Check, Image as ImageIcon, Star, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES, MENU_ITEMS } from '../../constants/menu';
import { SupabaseService } from '../../services/supabaseService';

export default function Menu() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Management state
  const currentUserEmail = localStorage.getItem('currentUserEmail');
  const isAdmin = localStorage.getItem('currentUserRole') === 'admin';
  const currentUserName = localStorage.getItem('currentUserName');

  const [points, setPoints] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QRIS' | 'Transfer' | 'Points'>('Cash');

  const [isManageMode, setIsManageMode] = useState(isAdmin);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    price: 0,
    category: 'Coffee',
    img: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?auto=format&fit=crop&q=80&w=600'
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        alert('File terlalu besar. Maksimal 2MB.');
        return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (editingItem) {
          setEditingItem({ ...editingItem, img: base64 });
        } else {
          setNewItem({ ...newItem, img: base64 });
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    loadCatalog();
    if (currentUserEmail && !isAdmin) {
      SupabaseService.getProfile(currentUserEmail).then(profile => {
        if (profile) {
          setPoints(profile.points || 0);
        } else {
          const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
          const user = usersRegistry.find((u: any) => u.email === currentUserEmail);
          setPoints(user?.points || 0);
        }
      });
    }
  }, [currentUserEmail, isAdmin]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getMenuItems();
      const deletedNames: string[] = JSON.parse(localStorage.getItem('deleted_menu_names') || '[]');
      
      // Always merge: Supabase data takes priority, fill gaps with default constants
      const merged = [...MENU_ITEMS];
      
      // Override defaults with Supabase data (match by name)
      data.forEach((dbItem: any) => {
        const idx = merged.findIndex(m => m.name === dbItem.name);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...dbItem };
        } else {
          merged.push(dbItem);
        }
      });
      
      // Filter out deleted items
      setItems(merged.filter(item => !deletedNames.includes(item.name)));
    } catch (err) {
      console.error('Error loading catalog:', err);
      setItems(MENU_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  const filteredMenu = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeCategory === 'All') return true;
    if (['Best Seller', 'New Menu', 'Combo'].includes(activeCategory)) {
      return item.tag === activeCategory;
    }
    return item.category === activeCategory;
  });

  const addToCart = (item: any) => {
    if (isManageMode || isAdmin) return;
    setCart(prev => {
      const existing = prev.find(i => i.name === item.name);
      if (existing) {
        return prev.map(i => i.name === item.name ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (name: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.name === name) {
        const newQty = Math.max(0, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  // Management functions
  const handleSaveItem = async () => {
    try {
      if (editingItem) {
        await SupabaseService.upsertMenuItem(editingItem);
      } else {
        await SupabaseService.upsertMenuItem(newItem);
        setNewItem({
          name: '',
          price: 0,
          category: 'Coffee',
          img: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?auto=format&fit=crop&q=80&w=600'
        });
      }
      await loadCatalog();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving item:', err);
      alert('Gagal menyimpan menu. Cek koneksi.');
    }
  };

  const handleDeleteItem = async (id: number) => {
    const item = items.find(i => i.id === id);
    if (confirm('Yakin ingin menghapus menu ini dari katalog?')) {
      try {
        // Track deleted items so they don't come back from MENU_ITEMS
        const deleted = JSON.parse(localStorage.getItem('deleted_menu_names') || '[]');
        if (item && !deleted.includes(item.name)) {
          deleted.push(item.name);
          localStorage.setItem('deleted_menu_names', JSON.stringify(deleted));
        }
        await SupabaseService.deleteMenuItem(id);
        setItems(prev => prev.filter(i => i.id !== id));
        setCart(prev => prev.filter(i => i.id !== id));
      } catch (err) {
        console.error('Error deleting item:', err);
      }
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0 || !currentUserEmail) return;
    
    if (paymentMethod === 'Points' && points < total) {
      alert('Poin kamu tidak cukup untuk membayar pesanan ini.');
      return;
    }

    try {
      setCheckoutLoading(true);
      const orderId = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder = {
        id: orderId,
        user_email: currentUserEmail,
        user_name: currentUserName || 'Guest',
        menu: cart.map(i => `${i.name} (x${i.qty})`).join(', '),
        items: cart.map(i => ({ name: i.name, qty: i.qty, price: `Rp ${i.price.toLocaleString('id-ID')}` })),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        total: `Rp ${total.toLocaleString('id-ID')}`,
        status: 'Confirmed',
        payment_method: paymentMethod
      };

      await SupabaseService.createOrder(newOrder);

      // Points logic
      let newPoints = points;
      if (paymentMethod === 'Points') {
        newPoints = points - total;
        alert('Pesanan berhasil dibayar menggunakan poin!');
      } else {
        // Earning 50%
        const earned = Math.floor(total * 0.5);
        newPoints = points + earned;
        alert(`Pesanan berhasil! Kamu menggunakan ${paymentMethod} dan mendapatkan ${earned.toLocaleString('id-ID')} poin!`);
      }

      await SupabaseService.upsertProfile({ email: currentUserEmail, points: newPoints });
      setPoints(newPoints);
      setCart([]);
      setPaymentMethod('Cash');
    } catch (err) {
      console.error('Error during checkout:', err);
      alert('Gagal melakukan checkout. Cek koneksi atau konfigurasi Supabase.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-8 relative">
      {/* Menu Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-asphalt">Menu</h1>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button 
                onClick={() => {
                  setEditingItem(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={18} />
                <span>Menu Baru</span>
              </button>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search coffee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-brand-bg border border-black/[0.05] rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-asphalt transition-all"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex space-x-2 mb-4 sm:mb-8 overflow-x-auto pb-2 no-scrollbar scrollbar-none shrink-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl whitespace-nowrap transition-all font-bold text-[11px] sm:text-sm ${
                activeCategory === cat 
                  ? 'bg-brand-asphalt text-white shadow-xl' 
                  : 'bg-white text-brand-ink/60 hover:bg-gray-100 border border-black/[0.03]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-4 grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-8 auto-rows-max pb-32 lg:pb-10">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-asphalt"></div>
              <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest">Memuat Menu...</p>
            </div>
          ) : filteredMenu.length > 0 ? (
            filteredMenu.map(item => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="minimal-card p-2 sm:p-4 group flex flex-col hover:shadow-lg transition-all duration-300 relative"
              >
                <div className="relative h-28 sm:h-48 mb-2 sm:mb-6 overflow-hidden rounded-lg sm:rounded-2xl bg-gray-50">
                  <img 
                    src={item.img || undefined} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    referrerPolicy="no-referrer"
                  />
                  
                  {item.tag && (
                    <div className={`absolute top-2 left-2 sm:top-4 sm:left-4 px-2 py-1 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[7px] sm:text-[9px] font-black uppercase tracking-widest shadow-lg ${
                      item.tag === 'Best Seller' ? 'bg-orange-500 text-white' :
                      item.tag === 'New Menu' ? 'bg-green-500 text-white' :
                      'bg-brand-asphalt text-white'
                    }`}>
                      {item.tag}
                    </div>
                  )}

                  {isAdmin ? (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="h-8 w-8 sm:h-10 sm:w-10 bg-white text-brand-asphalt rounded-lg sm:rounded-xl shadow-xl flex items-center justify-center hover:bg-brand-bg transition-colors"
                      >
                        <Edit2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 sm:h-10 sm:w-10 bg-white text-red-500 rounded-lg sm:rounded-xl shadow-xl flex items-center justify-center hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(item)}
                      className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 h-8 w-8 sm:h-12 sm:w-12 bg-brand-ink text-white rounded-lg sm:rounded-2xl shadow-xl flex items-center justify-center sm:translate-y-2 sm:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300"
                    >
                      <Plus size={16} className="sm:w-6 sm:h-6" />
                    </button>
                  )}
                </div>
                <div className="px-1 pb-1">
                  <h3 className="font-bold text-brand-ink group-hover:text-brand-accent transition-colors mb-0.5 text-[10px] sm:text-base truncate">{item.name}</h3>
                  <p className="text-gray-400 text-[6px] sm:text-xs font-semibold uppercase tracking-[0.1em] mb-1 sm:mb-3">{item.category}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-xl font-black text-brand-asphalt">Rp {item.price.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-gray-400 font-medium italic text-sm">Menu tidak ditemukan...</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar / Drawer - only for non-admin */}
      {!isAdmin && (
      <AnimatePresence>
        {(isCartOpen || window.innerWidth >= 1024) && (
          <motion.div 
            initial={window.innerWidth < 1024 ? { y: '100%' } : { x: 50, opacity: 0 }}
            animate={window.innerWidth < 1024 ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={window.innerWidth < 1024 ? { y: '100%' } : { x: 50, opacity: 0 }}
            className={`fixed lg:relative inset-x-0 bottom-0 z-50 lg:z-0 lg:inset-auto w-full lg:w-96 bg-white border-t lg:border border-black/[0.1] lg:border-black/[0.05] rounded-t-[2rem] lg:rounded-3xl flex flex-col shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.15)] lg:shadow-xl overflow-hidden shrink-0 h-[80vh] lg:h-full`}
          >
            <div className="p-4 sm:p-6 bg-brand-bg border-b border-black/[0.05] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-sandstone rounded-lg text-white">
                  <ShoppingBag size={20} />
                </div>
                <h2 className="font-bold text-brand-ink text-sm sm:text-base">Order Details</h2>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="lg:hidden p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 space-y-2">
                <ShoppingBag size={48} />
                <p className="font-bold text-[10px] sm:text-sm uppercase tracking-widest text-center">Keranjang masih kosong</p>
              </div>
            ) : (
              cart.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center space-x-3 sm:space-x-4"
                >
                  <img src={item.img || undefined} alt={item.name} className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl object-cover flex-shrink-0"  referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[11px] sm:text-sm text-brand-ink truncate">{item.name}</h4>
                    <p className="text-brand-accent font-bold text-[10px] sm:text-sm">Rp {item.price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 bg-brand-bg rounded-lg sm:rounded-xl p-1 shrink-0">
                    <button onClick={() => updateQty(item.name, -1)} className="h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-brand-ink transition-all">
                      <Minus size={12} />
                    </button>
                    <span className="w-5 sm:w-6 text-center font-bold text-[11px] sm:text-sm text-brand-ink">{item.qty}</span>
                    <button onClick={() => updateQty(item.name, 1)} className="h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-brand-ink transition-all">
                      <Plus size={12} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 sm:p-6 bg-brand-bg border-t border-black/[0.05] space-y-3 sm:space-y-4">
          <div className="flex justify-between text-[10px] sm:text-sm text-gray-400 font-bold uppercase tracking-wider">
            <span>Sub Total</span>
            <span className="text-brand-ink">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-[10px] sm:text-sm text-gray-400 font-bold uppercase tracking-wider">
            <span>Tax (12%)</span>
            <span className="text-brand-ink">Rp {tax.toLocaleString('id-ID')}</span>
          </div>
          <div className="pt-2 sm:pt-3 border-t border-black/[0.05] flex justify-between items-center mb-2 sm:mb-4">
            <span className="font-bold text-brand-asphalt uppercase tracking-widest text-[10px] sm:text-xs">Total Payment</span>
            <span className="text-base sm:text-2xl font-black text-brand-asphalt underline decoration-brand-sandstone decoration-2 sm:decoration-4 underline-offset-4">Rp {total.toLocaleString('id-ID')}</span>
          </div>

          {!isAdmin && (
            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-asphalt/40 block ml-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Cash', label: 'Cash (Kasir)' },
                  { id: 'QRIS', label: 'QRIS' },
                  { id: 'Transfer', label: 'Transfer' },
                  { id: 'Points', label: 'Pake Poin' }
                ].map((method) => (
                  <button
                    key={method.id}
                    disabled={method.id === 'Points' && points < total}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === method.id 
                        ? 'border-brand-asphalt bg-brand-asphalt text-white shadow-lg' 
                        : 'border-brand-sandstone/10 bg-white text-brand-asphalt hover:border-brand-sandstone/30'
                    } ${method.id === 'Points' && points < total ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                  >
                    {method.id === 'Points' ? (
                      <Star size={14} fill={paymentMethod === 'Points' ? "currentColor" : "none"} className={paymentMethod === 'Points' ? 'text-orange-400' : 'text-gray-400'} />
                    ) : (
                      <Check size={14} className={paymentMethod === method.id ? 'opacity-100' : 'opacity-0'} />
                    )}
                    <span>{method.label}</span>
                    {method.id === 'Points' && (
                      <span className="text-[8px] opacity-60">({points.toLocaleString()} pts)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <button 
            disabled={cart.length === 0 || checkoutLoading}
            onClick={handleCheckout}
            className="w-full bg-brand-asphalt text-white py-4 rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
          >
            {checkoutLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Bayar Sekarang'
            )}
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
  )}

  {/* Mobile Cart FAB - only for non-admin */}
  {!isAdmin && (
  <button 
    onClick={() => setIsCartOpen(true)}
    className="lg:hidden fixed bottom-6 right-6 z-40 bg-brand-asphalt text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-3 transition-transform active:scale-95 border-2 border-white/20"
  >
    <div className="relative">
      <ShoppingBag size={18} className="sm:w-6 sm:h-6" />
      {cart.length > 0 && (
        <span className="absolute -top-2 -right-2 bg-brand-accent text-white text-[8px] sm:text-[10px] font-black h-4 w-4 sm:h-5 sm:w-5 rounded-full flex items-center justify-center">
          {cart.reduce((acc, i) => acc + i.qty, 0)}
        </span>
      )}
    </div>
    <span className="font-bold text-[10px] sm:text-sm">Rp {total.toLocaleString('id-ID')}</span>
  </button>
  )}

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-brand-asphalt/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-black/[0.05] flex items-center justify-between bg-brand-bg/30">
                <div className="flex flex-col">
                   <h2 className="text-2xl font-black text-brand-asphalt">{editingItem ? 'Edit Produk' : 'Produk Baru'}</h2>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Manajemen Katalog Menu</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-brand-bg rounded-xl transition-colors">
                  <X size={24} className="text-brand-asphalt" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-asphalt/40 block mb-2">Nama Menu</label>
                  <input 
                    type="text" 
                    value={editingItem ? editingItem.name : newItem.name}
                    onChange={(e) => editingItem ? setEditingItem({...editingItem, name: e.target.value}) : setNewItem({...newItem, name: e.target.value})}
                    className="w-full bg-brand-bg border-none rounded-2xl px-6 py-4 font-bold text-brand-asphalt focus:ring-2 focus:ring-brand-asphalt outline-none"
                    placeholder="Contoh: Caramel Macchiato"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-asphalt/40 block mb-2">Harga (Rp)</label>
                    <input 
                      type="number" 
                      value={editingItem ? editingItem.price : newItem.price}
                      onChange={(e) => editingItem ? setEditingItem({...editingItem, price: parseInt(e.target.value) || 0}) : setNewItem({...newItem, price: parseInt(e.target.value) || 0})}
                      className="w-full bg-brand-bg border-none rounded-2xl px-6 py-4 font-bold text-brand-asphalt focus:ring-2 focus:ring-brand-asphalt outline-none"
                      placeholder="Contoh: 25000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-asphalt/40 block mb-2">Kategori</label>
                      <select 
                        value={editingItem ? editingItem.category : newItem.category}
                        onChange={(e) => editingItem ? setEditingItem({...editingItem, category: e.target.value}) : setNewItem({...newItem, category: e.target.value})}
                        className="w-full bg-brand-bg border-none rounded-2xl px-6 py-4 font-bold text-brand-asphalt focus:ring-2 focus:ring-brand-asphalt outline-none appearance-none"
                      >
                        {CATEGORIES.filter(c => !['All', 'Best Seller', 'New Menu', 'Combo'].includes(c)).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-asphalt/40 block mb-2">Tag Special</label>
                      <select 
                        value={editingItem ? (editingItem.tag || '') : (newItem.tag || '')}
                        onChange={(e) => editingItem ? setEditingItem({...editingItem, tag: e.target.value || null}) : setNewItem({...newItem, tag: e.target.value || null})}
                        className="w-full bg-brand-bg border-none rounded-2xl px-6 py-4 font-bold text-brand-asphalt focus:ring-2 focus:ring-brand-asphalt outline-none appearance-none"
                      >
                        <option value="">- Tanpa Tag -</option>
                        <option value="Best Seller">Best Seller</option>
                        <option value="New Menu">New Menu</option>
                        <option value="Combo">Combo</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-asphalt/40 block mb-2">Pilih Foto atau Masukkan URL</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="relative group/upload h-14 bg-brand-bg rounded-2xl flex items-center border border-dashed border-black/10 hover:border-black/30 transition-all cursor-pointer overflow-hidden">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center gap-3 px-6 w-full">
                          <div className={`p-2 rounded-lg bg-white shadow-sm text-brand-asphalt ${isUploading ? 'animate-bounce' : ''}`}>
                            <Upload size={16} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-brand-asphalt/60 truncate">
                            {isUploading ? 'Mengunggah...' : 'Upload dari HP/Laptop'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="h-[1px] flex-1 bg-black/[0.05]" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-asphalt/20">Atau</span>
                        <div className="h-[1px] flex-1 bg-black/[0.05]" />
                      </div>

                      <input 
                        type="text" 
                        value={editingItem ? editingItem.img : newItem.img}
                        onChange={(e) => editingItem ? setEditingItem({...editingItem, img: e.target.value}) : setNewItem({...newItem, img: e.target.value})}
                        className="w-full bg-brand-bg border-none rounded-2xl px-6 py-4 font-bold text-brand-asphalt focus:ring-2 focus:ring-brand-asphalt outline-none text-xs"
                        placeholder="Tempel link foto (https://...)"
                      />
                    </div>

                    <div className="h-32 sm:h-auto sm:w-32 aspect-square rounded-2xl bg-brand-bg flex items-center justify-center overflow-hidden border border-black/[0.05] shadow-inner shrink-0 self-center sm:self-auto">
                      { (editingItem ? editingItem.img : newItem.img) ? (
                        <img src={(editingItem ? editingItem.img : newItem.img) || undefined} className="w-full h-full object-cover"  referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-20">
                          <ImageIcon size={32} />
                          <span className="text-[8px] font-black uppercase tracking-wider">No Preview</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-brand-bg border-t border-black/[0.05] flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-4 bg-white text-brand-asphalt border border-black/[0.05] rounded-2xl font-black hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveItem}
                  className="flex-1 px-8 py-4 bg-brand-asphalt text-white rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  <span>Simpan Menu</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
