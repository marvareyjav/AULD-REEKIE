import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { motion } from 'motion/react';
import { SupabaseService } from '../services/supabaseService';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleResendConfirmation = async () => {
    if (resendCountdown > 0) return;
    try {
      setLoading(true);
      await SupabaseService.resendConfirmation(username);
      alert('Konfirmasi telah dikirim ulang.');
      setResendCountdown(60); // 1 minute cooldown
      const timer = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.message?.includes('rate limit exceeded')) {
        alert('Terlalu cepat! Harap tunggu sebentar sebelum mencoba mengirim ulang lagi.');
      } else {
        alert('Gagal mengirim ulang email: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackLogin = async (usernameToUse: string, forceRole?: string) => {
    // Fallback to localStorage logic
    console.warn('Using LocalStorage fallback');
    const fakeEmail = SupabaseService.toAuthEmail(usernameToUse);
    
    // Determine role: use forceRole if provided, otherwise check existing profile first
    let role = forceRole || 'user';
    if (!forceRole) {
      const existingProfile = await SupabaseService.getProfile(fakeEmail);
      if (existingProfile) {
        role = existingProfile.role || 'user';
      } else {
        // Only assign admin if firstAdminEmail was already set and matches
        const firstAdmin = localStorage.getItem('firstAdminEmail');
        role = (firstAdmin && firstAdmin === fakeEmail) ? 'admin' : 'user';
      }
    }
    
    // Use the unified service to ensure registry sync
    const profile = await SupabaseService.upsertProfile({
      email: fakeEmail,
      username: usernameToUse,
      role,
      status: 'Active',
      points: 0
    });

    localStorage.setItem('currentUserEmail', fakeEmail);
    localStorage.setItem('currentUserName', profile.username || usernameToUse);
    localStorage.setItem('currentUserRole', profile.role || 'user');
    
    navigate('/app/dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    
    // Safety timeout for login
    const loginTimeout = setTimeout(() => {
      setLoading(false);
    }, 30000); // 30 seconds
    
    // Check if Supabase is configured
    const isSupabaseConfigured = SupabaseService.isConfigured();
    const fakeEmail = SupabaseService.toAuthEmail(username);

    try {
      const firstAdmin = localStorage.getItem('firstAdminEmail');
      
      if (isSupabaseConfigured) {
        try {
          if (isSignUp) {
            // === SIGN UP FLOW ===
            try {
              await SupabaseService.signUp(username, password);
            } catch (signupErr: any) {
              if (signupErr.message?.includes('already registered') || signupErr.message?.includes('User already registered')) {
                setErrorMessage('Username sudah terdaftar. Silakan login.');
                clearTimeout(loginTimeout);
                setLoading(false);
                return;
              }
              console.warn('Signup issue:', signupErr);
            }

            // After signup, try to sign in immediately to get a session
            try {
              const { user } = await SupabaseService.signIn(username, password);
              if (user) {
                // New signup always gets 'user' role, never admin
                const profile = await SupabaseService.upsertProfile({
                  email: fakeEmail,
                  username: username,
                  photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                  role: 'user',
                  status: 'Active',
                  points: 0
                });

                localStorage.setItem('currentUserEmail', fakeEmail);
                localStorage.setItem('currentUserName', profile?.username || username);
                localStorage.setItem('currentUserRole', 'user');
                clearTimeout(loginTimeout);
                navigate('/app/dashboard');
                return;
              }
            } catch (signInAfterSignup: any) {
              // If sign-in fails after signup (e.g. email confirmation required), use fallback
              console.warn('Sign-in after signup failed, using fallback:', signInAfterSignup.message);
              await handleFallbackLogin(username, 'user');
              clearTimeout(loginTimeout);
              return;
            }

            // Fallback if signIn didn't return a user
            await handleFallbackLogin(username, 'user');
            clearTimeout(loginTimeout);
            return;
          } else {
            // === SIGN IN FLOW ===
            try {
              const { user } = await SupabaseService.signIn(username, password);
              if (user) {
                let profile = await SupabaseService.getProfile(fakeEmail);
                
                if (profile && profile.status === 'Blocked') {
                  setErrorMessage('Akun kamu diblokir oleh admin.');
                  await SupabaseService.signOut();
                  clearTimeout(loginTimeout);
                  setLoading(false);
                  return;
                }

                if (!profile) {
                  // Existing auth user but no profile — check if they're the first admin
                  const role = (firstAdmin && firstAdmin === fakeEmail) ? 'admin' : 'user';

                  profile = await SupabaseService.upsertProfile({
                    email: fakeEmail,
                    username: username,
                    photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                    role,
                    status: 'Active',
                    points: 0
                  });
                }

                localStorage.setItem('currentUserEmail', fakeEmail);
                localStorage.setItem('currentUserName', profile?.username || username);
                localStorage.setItem('currentUserRole', profile?.role || 'user');
                clearTimeout(loginTimeout);
                navigate('/app/dashboard');
                return;
              }
            } catch (signInErr: any) {
              if (signInErr.message?.includes('Invalid login credentials')) {
                setErrorMessage('Username atau password salah.');
                clearTimeout(loginTimeout);
                setLoading(false);
                return;
              }
              const isConfirmationError = signInErr.message?.includes('Email not confirmed') || signInErr.message?.includes('confirmation') || signInErr.status === 400;
              if (isConfirmationError) {
                 console.warn('Confirmation required, bypassing via fallback...');
                 await handleFallbackLogin(username);
                 clearTimeout(loginTimeout);
                 return;
              }
              throw signInErr;
            }
          }
        } catch (err: any) {
          console.error('Auth error, using fallback:', err.message);
          await handleFallbackLogin(username);
          clearTimeout(loginTimeout);
          return;
        }
      }

      await handleFallbackLogin(username);
      clearTimeout(loginTimeout);
    } catch (err) {
      console.error(err);
      clearTimeout(loginTimeout);
      alert('Gagal login. Periksa username/password atau konfigurasi server.');
    } finally {
      clearTimeout(loginTimeout);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 text-brand-ink">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-black/[0.03]"
      >
        <div className="p-8 text-center bg-brand-bg">
          <div className="h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-black/[0.05]">
            <Coffee size={32} className="text-brand-asphalt" />
          </div>
          <h2 className="text-2xl font-bold font-sans">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400 mt-1 font-medium italic">
            {isSignUp ? 'Join the Auld Reekie community' : 'Order your favorite Auld Reekie roast'}
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl"
            >
              <p className="text-xs font-bold text-red-700 leading-relaxed text-center">
                {errorMessage}
              </p>
              {showResend && (
                <button 
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendCountdown > 0}
                  className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-800 underline block mx-auto"
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Kirim Ulang Email Konfirmasi'}
                </button>
              )}
            </motion.div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-bold text-brand-ink/60 ml-1 uppercase tracking-widest text-[10px]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-brand-bg focus:bg-white focus:border-brand-asphalt focus:ring-2 focus:ring-brand-asphalt/10 outline-none transition-all"
              placeholder="Masukkan username"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-bold text-brand-ink/60 ml-1 uppercase tracking-widest text-[10px]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-brand-bg focus:bg-white focus:border-brand-asphalt focus:ring-2 focus:ring-brand-asphalt/10 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-asphalt text-white py-4 rounded-xl font-bold shadow-xl hover:opacity-90 transform hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>

          <div className="text-center space-y-4">
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="text-sm text-brand-asphalt font-bold hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
            <br />
            <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-gray-600">
              Return to Home
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
