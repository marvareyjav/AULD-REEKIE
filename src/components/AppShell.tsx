import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Coffee, Clock, Users, MessageSquare, LogOut, Menu as MenuIcon, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SupabaseService } from '../services/supabaseService';

export default function AppShell() {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const currentUserEmail = localStorage.getItem('currentUserEmail');
  const firstAdminEmail = localStorage.getItem('firstAdminEmail');
  const currentUserName = localStorage.getItem('currentUserName') || 'User';
  
  // Admin state — read from Supabase profile role, not just localStorage
  const [isAdmin, setIsAdmin] = useState(() => {
    // Initial guess from localStorage while we fetch from DB
    return currentUserEmail === firstAdminEmail;
  });

  const menuItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Menu', path: '/app/menu', icon: Coffee },
    { name: 'History/Recap', path: '/app/orders', icon: Clock },
    { name: 'Complaints', path: '/app/complaints', icon: MessageSquare },
  ];

  if (!isAdmin) {
    menuItems.push({ name: 'Profile', path: '/app/profile', icon: UserCircle });
  }

  if (isAdmin) {
    menuItems.push({ name: 'User Management', path: '/app/users', icon: Users });
  }

  // Get user profile photo
  const [profilePhoto, setProfilePhoto] = useState(`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserName}`);

  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUserEmail) {
        try {
          const profile = await SupabaseService.getProfile(currentUserEmail);
          
          if (!profile) {
            // No profile yet, create one
            const fallbackAdmin = currentUserEmail === firstAdminEmail;
            await SupabaseService.upsertProfile({
              email: currentUserEmail,
              username: currentUserName,
              role: fallbackAdmin ? 'admin' : 'user',
              status: 'Active',
              points: 0
            });
            setIsAdmin(fallbackAdmin);
            localStorage.setItem('currentUserRole', fallbackAdmin ? 'admin' : 'user');
            const updated = await SupabaseService.getProfile(currentUserEmail);
            if (updated?.photo) setProfilePhoto(updated.photo);
          } else {
            // Read role directly from database profile
            setIsAdmin(profile.role === 'admin');
            localStorage.setItem('currentUserRole', profile.role);
            if (profile.photo) setProfilePhoto(profile.photo);
            
            // Sync points to local
            const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
            const userIdx = usersRegistry.findIndex((u: any) => u.email === currentUserEmail);
            if (userIdx >= 0 && usersRegistry[userIdx].points !== profile.points) {
              usersRegistry[userIdx].points = profile.points;
              localStorage.setItem('users_registry', JSON.stringify(usersRegistry));
            }
          }
        } catch (err) {
          console.error('AppShell profile sync failed:', err);
        }
      }
    };
    fetchProfile();
  }, [currentUserEmail, firstAdminEmail, currentUserName]);

  const handleLogout = async () => {
    try {
      if (SupabaseService.isConfigured()) {
        await SupabaseService.signOut();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('currentUserEmail');
      localStorage.removeItem('currentUserName');
      navigate('/login');
    }
  };

  const handleResetData = () => {
    if (confirm('Ini bakal hapus semua data Admin dan Menu yang abang tambah. Yakin?')) {
      localStorage.clear();
      navigate('/login');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-brand-asphalt/40 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            drag={isMobile ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (isMobile && info.offset.x < -50) {
                setSidebarOpen(false);
              }
            }}
            initial={{ x: isMobile ? -280 : 0 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`${
              isMobile ? 'fixed inset-y-0 left-0 z-40 shadow-2xl' : 'relative'
            } w-64 bg-white border-r border-black/[0.05] flex flex-col shadow-sm`}
          >
            <div className="p-8">
              <Link to="/app/dashboard" className="text-xl font-black tracking-tighter text-brand-asphalt flex items-center gap-2 !no-underline">
                <span className="text-2xl drop-shadow-sm">☕</span>
                <span>AULD REEKIE</span>
              </Link>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-black !no-underline ${
                      isActive 
                        ? 'bg-brand-asphalt !text-white shadow-xl shadow-brand-asphalt/20' 
                        : 'text-brand-asphalt/70 hover:bg-brand-asphalt/5 hover:text-brand-asphalt'
                    }`}
                  >
                    <item.icon size={18} className={isActive ? '!text-white' : 'opacity-60'} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-6 mt-auto border-t border-black/[0.03]">
              <div className="text-[10px] uppercase tracking-widest text-brand-asphalt/30 mb-4 px-4 font-black">
                AULD REEKIE
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full px-4 py-3 text-brand-asphalt font-black text-sm hover:bg-red-50 hover:!text-red-600 rounded-xl transition-all"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="h-16 sm:h-20 bg-white border-b border-black/[0.05] flex items-center justify-between px-4 sm:px-10 shrink-0 z-10">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg mr-2 lg:hidden"
          >
            <MenuIcon size={18} className="text-brand-asphalt" />
          </button>
          
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-brand-asphalt/60">
              {isAdmin ? 'System Administrator' : 'Coffee Enthusiast'}
            </span>
            <span className="font-black text-brand-asphalt text-base sm:text-lg -mt-1 capitalize truncate max-w-[120px] sm:max-w-none">
              {currentUserName}
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-6 ml-auto">
            {isAdmin ? (
               <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-brand-asphalt flex items-center justify-center text-white font-black border-2 border-white shadow-lg overflow-hidden text-xs sm:text-base">
                A
              </div>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-brand-sandstone flex items-center justify-center text-white font-bold border-2 border-white shadow-sm overflow-hidden">
                  <img src={profilePhoto || undefined} alt="avatar" />
                </div>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="bg-brand-asphalt text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg font-black text-[10px] sm:text-sm hover:opacity-90 transition-all shadow-sm uppercase tracking-widest active:scale-95"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
