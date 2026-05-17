import { Link } from 'react-router-dom';
import { Coffee, Clock, Users, ArrowRight, Instagram, Twitter, Facebook, Search, ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES, MENU_ITEMS } from '../constants/menu';
import { SupabaseService } from '../services/supabaseService';

export default function LandingPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>(MENU_ITEMS);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const data = await SupabaseService.getMenuItems();
        const deletedNames: string[] = JSON.parse(localStorage.getItem('deleted_menu_names') || '[]');

        const merged = [...MENU_ITEMS];
        data.forEach((dbItem: any) => {
          const idx = merged.findIndex((m: any) => m.name === dbItem.name);
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...dbItem };
          } else {
            merged.push(dbItem);
          }
        });

        setMenuItems(merged.filter((item: any) => !deletedNames.includes(item.name)));
      } catch (err) {
        console.error('Failed to load menu on landing page:', err);
        // Tetap pakai MENU_ITEMS default
      }
    };
    loadMenu();
  }, []);

  const filteredMenu = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory === 'All') return true;
    if (['Best Seller', 'New Menu', 'Combo'].includes(activeCategory)) {
      return item.tag === activeCategory;
    }
    return item.category === activeCategory;
  });

  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-sandstone/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/[0.03]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tighter text-brand-asphalt flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <span>AULD REEKIE</span>
          </Link>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-sm font-black text-brand-mossy">
              <a href="#features" className="hover:text-brand-asphalt transition-colors">Experience</a>
              <a href="#menu" className="hover:text-brand-asphalt transition-colors">Our Menu</a>
            </div>
            <Link
              to="/login"
              className="px-6 py-2.5 bg-brand-asphalt text-white text-sm font-bold rounded-full shadow-lg hover:scale-105 transition-all"
            >
              Order Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left z-10">
            <div className="inline-block px-4 py-1.5 bg-brand-sandstone/10 border border-brand-sandstone/20 rounded-full text-brand-mossy text-xs font-black uppercase tracking-widest mb-6">
              Est. 2026 • Local Roast
            </div>
            <h1 className="text-5xl lg:text-8xl font-black text-brand-mossy leading-[1.1] mb-8 tracking-tighter">
              Authentic Coffee <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-asphalt to-brand-slate">For Real Lovers</span>
            </h1>
            <p className="text-lg lg:text-xl text-brand-asphalt/60 mb-10 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
              Experience the rich heritage of Auld Reekie in every cup. From bold single-origins to delicate pastries, we bring the soul of coffee culture to you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/login" className="px-10 py-5 bg-brand-asphalt !text-white rounded-2xl font-black flex items-center gap-3 shadow-2xl hover:bg-brand-mossy hover:translate-y-[-4px] transition-all group pointer-events-auto">
                <span className="!text-white">Place Order</span> <ArrowRight className="group-hover:translate-x-1 transition-transform !text-white" size={20} />
              </Link>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border-[12px] border-white rotate-2 hover:rotate-0 transition-transform duration-700">
              <img
                src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1200"
                alt="Coffee Art"
                className="w-full aspect-[4/5] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-brand-sandstone/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-brand-slate/10 rounded-full blur-3xl" />
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-sm font-black text-brand-sandstone uppercase tracking-[0.3em] mb-4">The Experience</h2>
            <p className="text-4xl lg:text-5xl font-black text-brand-mossy tracking-tighter">Why Auld Reekie?</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Coffee,
                title: 'Premium Roasts',
                desc: 'Sourced from high-altitude estates and roasted daily for unmatched complexity.',
                color: 'bg-brand-asphalt'
              },
              {
                icon: Clock,
                title: 'Express Setup',
                desc: 'Real-time ordering means your cup is waiting for you. No lines, no stress.',
                color: 'bg-brand-slate'
              },
              {
                icon: Users,
                title: 'Community First',
                desc: 'A space designed for gathering, working, and celebrating the art of slow living.',
                color: 'bg-brand-sandstone'
              },
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-[2.5rem] bg-brand-bg hover:bg-white border border-transparent hover:border-black/[0.05] hover:shadow-2xl transition-all duration-500">
                <div className={`w-16 h-16 ${feature.color} text-white rounded-2xl flex items-center justify-center mb-8 rotate-3 group-hover:rotate-0 transition-transform`}>
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-black text-brand-mossy mb-4">{feature.title}</h3>
                <p className="text-brand-asphalt/50 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Public Menu Section */}
      <section id="menu" className="py-24 bg-brand-bg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-sm font-black text-brand-sandstone uppercase tracking-[0.3em] mb-4">Our Menu</h2>
            <p className="text-4xl lg:text-5xl font-black text-brand-mossy tracking-tighter">Explore Our Roasts</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start mb-12">
            {/* Search & Categories */}
            <div className="w-full lg:w-64 space-y-6 shrink-0">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-asphalt/30 group-focus-within:text-brand-asphalt transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Cari kopi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-black/[0.05] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-asphalt transition-all font-bold text-sm"
                />
              </div>

              <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-3 rounded-xl whitespace-nowrap transition-all font-black text-xs uppercase tracking-widest text-left ${
                      activeCategory === cat
                        ? 'bg-brand-asphalt text-white shadow-xl'
                        : 'bg-white text-brand-asphalt/60 hover:bg-gray-100 border border-black/[0.03]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredMenu.map((item) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group bg-white p-4 rounded-[2.5rem] border border-black/[0.03] hover:shadow-2xl transition-all duration-500"
                  >
                    <div className="relative h-64 mb-6 overflow-hidden rounded-[2rem] bg-gray-50">
                      <img
                        src={item.img || undefined}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      {item.tag && (
                        <div className={`absolute top-6 left-6 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl ${
                          item.tag === 'Best Seller' ? 'bg-orange-500 text-white' :
                          item.tag === 'New Menu' ? 'bg-green-500 text-white' :
                          'bg-brand-asphalt text-white'
                        }`}>
                          {item.tag}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <Link
                          to="/login"
                          className="px-6 py-3 bg-white text-brand-asphalt rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
                        >
                          Log in to Order
                        </Link>
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <span className="inline-block px-3 py-1 bg-brand-bg text-[10px] font-black uppercase tracking-widest text-brand-sandstone rounded-full mb-3">
                        {item.category}
                      </span>
                      <h3 className="font-black text-brand-mossy text-xl mb-2 group-hover:text-brand-asphalt transition-colors">
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-between mt-auto">
                        <p className="text-2xl font-black text-brand-asphalt tracking-tight">
                          Rp {item.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Prompt to Order */}
          <div className="mt-20 p-12 bg-brand-asphalt rounded-[3rem] text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-6">Siap untuk menikmati kopi terbaik?</h2>
              <p className="text-white/60 font-medium mb-10 max-w-xl mx-auto">
                Buat akun atau masuk untuk mulai memesan. Kopi favoritmu hanya berjarak beberapa klik saja.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-brand-asphalt rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all group"
              >
                Mulai Memesan Sekarang <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-sandstone/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-asphalt text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
            <div className="max-w-sm">
              <Link to="/" className="text-2xl font-black tracking-tighter mb-8 block">
                AULD REEKIE
              </Link>
              <p className="text-white/50 font-medium leading-relaxed">
                Dedicated to the craft of exceptional coffee and the people who love it. Join us in our pursuit of the perfect roast.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-16">
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest mb-8 text-brand-sandstone">Menu</h4>
                <ul className="space-y-4 text-white/40 font-bold text-sm">
                  <li><a href="#" className="hover:text-white transition-all">Single Origin</a></li>
                  <li><a href="#" className="hover:text-white transition-all">Seasonal Brews</a></li>
                  <li><a href="#" className="hover:text-white transition-all">House Blends</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest mb-8 text-brand-sandstone">Company</h4>
                <ul className="space-y-4 text-white/40 font-bold text-sm">
                  <li><a href="#" className="hover:text-white transition-all">About Us</a></li>
                  <li><a href="#" className="hover:text-white transition-all">Locations</a></li>
                  <li><a href="#" className="hover:text-white transition-all">Careers</a></li>
                </ul>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <h4 className="font-black text-xs uppercase tracking-widest mb-8 text-brand-sandstone">Socials</h4>
                <div className="flex gap-4">
                  {[Instagram, Twitter, Facebook].map((Icon, i) => (
                    <a key={i} href="#" className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white hover:text-brand-asphalt transition-all">
                      <Icon size={20} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] font-black uppercase tracking-[0.2em] text-white/20">
            <p>© 2026 Auld Reekie Coffee Co.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}