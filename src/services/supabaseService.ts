import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export interface Profile {
  email: string;
  username: string;
  bio: string;
  photo: string;
  points: number;
  role: string;
  status: string;
  joined_at?: string;
}

export interface Order {
  id: string;
  user_email: string;
  user_name: string;
  menu: string;
  items: any[];
  date: string;
  total: string;
  status: string;
  payment_method: string;
}

export interface Complaint {
  id?: number;
  user_email: string;
  user_name: string;
  date: string;
  title: string;
  status: string;
  order_id: string;
}

export const SupabaseService = {
  isConfigured() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return !!(url && key && url !== 'placeholder' && key !== 'placeholder');
  },

  // Create a fresh client with NO auth session — guaranteed to work with anon key
  _freshClient() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  },

  toAuthEmail(username: string): string {
    return `${username.toLowerCase().trim()}@auld-reekie.local`;
  },

  async signUp(username: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: this.toAuthEmail(username),
      password,
    });
    if (error) throw error;
    return data;
  },

  async signIn(username: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: this.toAuthEmail(username),
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resendConfirmation(username: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: this.toAuthEmail(username),
    });
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getProfile(email: string) {
    try {
      if (this.isConfigured()) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        if (error) {
          console.warn('Supabase getProfile error:', error.message);
        } else if (data) {
          const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
          const idx = usersRegistry.findIndex((u: any) => u.email === email);
          if (idx >= 0) {
            usersRegistry[idx] = data;
          } else {
            usersRegistry.push(data);
          }
          localStorage.setItem('users_registry', JSON.stringify(usersRegistry));
          return data as Profile;
        }
      }
      
      const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
      return usersRegistry.find((u: any) => u.email === email) || null;
    } catch (err) {
      const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
      return usersRegistry.find((u: any) => u.email === email) || null;
    }
  },

  async upsertProfile(profile: Partial<Profile>) {
    try {
      if (!profile.email) return null;

      const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
      const userIdx = usersRegistry.findIndex((u: any) => u.email === profile.email);
      
      let mergedProfile = { ...profile };

      if (userIdx >= 0) {
        mergedProfile = { ...usersRegistry[userIdx], ...profile };
        usersRegistry[userIdx] = mergedProfile;
      } else {
        mergedProfile = {
          username: profile.email?.split('@')[0] || 'User',
          points: 0,
          role: 'user',
          status: 'Active',
          photo: '',
          bio: '',
          joined_at: new Date().toISOString(),
          ...profile
        };
        usersRegistry.push(mergedProfile);
      }
      localStorage.setItem('users_registry', JSON.stringify(usersRegistry));

      if (this.isConfigured()) {
        try {
          // Use a fresh client to avoid broken auth session issues
          const db = this._freshClient();

          const { data: existing, error: fetchError } = await db
            .from('profiles')
            .select('*')
            .eq('email', profile.email)
            .maybeSingle();

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Fetch existing profile error:', fetchError);
          }

          const sanitizedUpdate = Object.fromEntries(
            Object.entries(profile).filter(([_, v]) => v !== undefined)
          );

          const finalProfile = { 
            ...(existing || {}), 
            ...sanitizedUpdate 
          };
          
          const { data, error } = await db
            .from('profiles')
            .upsert(finalProfile, { onConflict: 'email' })
            .select()
            .single();

          if (error) {
            console.error('Supabase profile sync FAILED:', error.message, error.details, error.hint);
            return mergedProfile as Profile;
          }

          console.log('Profile synced to Supabase successfully:', data?.email);

          if (data) {
            const updatedRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
            const idx = updatedRegistry.findIndex((u: any) => u.email === data.email);
            if (idx >= 0) {
              updatedRegistry[idx] = data;
            } else {
              updatedRegistry.push(data);
            }
            localStorage.setItem('users_registry', JSON.stringify(updatedRegistry));
          }

          return data as Profile;
        } catch (dbErr) {
          console.error('Database interaction error:', dbErr);
          return mergedProfile as Profile;
        }
      }
      return mergedProfile as Profile;
    } catch (err) {
      console.error('Upsert profile error:', err);
      const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
      return usersRegistry.find((u: any) => u.email === profile.email) || profile as Profile;
    }
  },

  // Force sync a profile to Supabase — called from AppShell to ensure profiles are in DB
  async syncProfileToSupabase(email: string) {
    if (!this.isConfigured() || !email) return;
    try {
      const db = this._freshClient();
      const { data: existing } = await db
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();
      
      if (existing) return; // Already in Supabase

      // Not in Supabase — get from localStorage and sync
      const usersRegistry = JSON.parse(localStorage.getItem('users_registry') || '[]');
      const localProfile = usersRegistry.find((u: any) => u.email === email);
      if (!localProfile) return;

      const { error } = await db
        .from('profiles')
        .upsert({
          email: localProfile.email,
          username: localProfile.username || email.split('@')[0],
          bio: localProfile.bio || '',
          photo: localProfile.photo || '',
          points: localProfile.points || 0,
          role: localProfile.role || 'user',
          status: localProfile.status || 'Active',
        }, { onConflict: 'email' });
      
      if (error) {
        console.error('syncProfileToSupabase FAILED:', error.message);
      } else {
        console.log('Profile synced to Supabase via AppShell:', email);
      }
    } catch (err) {
      console.error('syncProfileToSupabase error:', err);
    }
  },

  async getAllProfiles() {
    try {
      const localUsers = JSON.parse(localStorage.getItem('users_registry') || '[]');
      const { data, error } = await supabase.from('profiles').select('*').order('joined_at', { ascending: false });
      
      if (error) {
        return localUsers;
      }
      
      const supabaseUsers = (data || []) as Profile[];
      const combined = [...supabaseUsers];
      
      localUsers.forEach((local: any) => {
        if (!combined.find(s => s.email === local.email)) {
          combined.push(local);
        }
      });

      return combined;
    } catch (err) {
      return JSON.parse(localStorage.getItem('users_registry') || '[]');
    }
  },

  async getOrders(email?: string) {
    try {
      const localOrders = JSON.parse(localStorage.getItem('orders_history') || '[]');
      
      if (this.isConfigured()) {
        let query = supabase.from('orders').select('*');
        if (email) {
          query = query.eq('user_email', email);
        }
        const { data, error } = await query.order('id', { ascending: false });
        
        if (error) {
          console.warn('Supabase getOrders error:', error.message);
          if (email) return localOrders.filter((o: any) => o.user_email === email);
          return localOrders;
        }

        if (data) {
          const supabaseOrders = (data || []) as any[];
          const otherUsersOrders = localOrders.filter((lo: any) => email ? lo.user_email !== email : false);
          const updatedHistory = [...otherUsersOrders, ...supabaseOrders];
          localStorage.setItem('orders_history', JSON.stringify(updatedHistory));
          return supabaseOrders;
        }
      }
      
      if (email) return localOrders.filter((o: any) => o.user_email === email);
      return localOrders;
    } catch (err) {
      console.error('getOrders exception:', err);
      const localOrders = JSON.parse(localStorage.getItem('orders_history') || '[]');
      if (email) return localOrders.filter((o: any) => o.user_email === email);
      return localOrders;
    }
  },

  async createOrder(order: any) {
    const localOrders = JSON.parse(localStorage.getItem('orders_history') || '[]');
    localOrders.push(order);
    localStorage.setItem('orders_history', JSON.stringify(localOrders));

    try {
      if (this.isConfigured()) {
        const dbOrder = {
          id: order.id,
          user_email: order.user_email,
          user_name: order.user_name,
          items: order.items || [],
          total: order.total,
          status: order.status,
          date: order.date || new Date().toISOString()
        };

        const { data, error } = await supabase.from('orders').insert(dbOrder).select().maybeSingle();
        if (error) {
          console.error('Supabase create order error:', error.message);
          return order;
        }
        return data || order;
      }
      return order;
    } catch (err) {
      console.error('Create order exception:', err);
      return order;
    }
  },

  async updateOrderStatus(id: string, status: string) {
    const localOrders = JSON.parse(localStorage.getItem('orders_history') || '[]');
    const idx = localOrders.findIndex((o: any) => o.id === id);
    if (idx >= 0) {
      localOrders[idx].status = status;
      localStorage.setItem('orders_history', JSON.stringify(localOrders));
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase updateOrderStatus error:', error.message, '| code:', error.code);
      throw new Error(`Gagal update status di database: ${error.message}`);
    }

    return data || { id, status };
  },

  async getComplaints(email?: string) {
    try {
      const localComplaints = JSON.parse(localStorage.getItem('complaints_history') || '[]');
      let query = supabase.from('complaints').select('*').order('id', { ascending: false });
      if (email) {
        query = query.eq('user_email', email);
      }
      const { data, error } = await query;
      if (error) {
        return localComplaints.filter((c: any) => !email || c.user_email === email);
      }
      
      const supabaseComplaints = (data || []) as Complaint[];
      const combined = [...supabaseComplaints];
      localComplaints.forEach((local: any) => {
        if (!combined.find(s => s.id === local.id)) {
           if (!email || local.user_email === email) combined.push(local);
        }
      });

      return combined;
    } catch (err) {
      const localComplaints = JSON.parse(localStorage.getItem('complaints_history') || '[]');
      return localComplaints.filter((c: any) => !email || c.user_email === email);
    }
  },

  async createComplaint(complaint: Complaint) {
    const localComplaints = JSON.parse(localStorage.getItem('complaints_history') || '[]');
    const newComp = { ...complaint, id: complaint.id || Date.now() };
    localComplaints.push(newComp);
    localStorage.setItem('complaints_history', JSON.stringify(localComplaints));

    try {
      const { data, error } = await supabase.from('complaints').insert(complaint).select().maybeSingle();
      if (error) return newComp;
      return data || newComp;
    } catch (err) {
      return newComp;
    }
  },

  async deleteComplaint(id: number) {
    const localComplaints = JSON.parse(localStorage.getItem('complaints_history') || '[]');
    localStorage.setItem('complaints_history', JSON.stringify(localComplaints.filter((c: any) => c.id !== id)));

    try {
      await supabase.from('complaints').delete().eq('id', id);
    } catch (err) {
      // Ignored
    }
  },

  async updateComplaintStatus(id: number, status: string) {
    const localComplaints = JSON.parse(localStorage.getItem('complaints_history') || '[]');
    const updated = localComplaints.map((c: any) => c.id === id ? { ...c, status } : c);
    localStorage.setItem('complaints_history', JSON.stringify(updated));

    try {
      await supabase.from('complaints').update({ status }).eq('id', id);
    } catch (err) {
      console.warn('Failed to update complaint status in Supabase:', err);
    }
  },

  async getMenuItems() {
    try {
      const { data, error } = await supabase
        .from('menu_catalog')
        .select('*')
        .order('id');
      
      if (error) {
        console.warn('Supabase getMenuItems error:', error.message);
        return JSON.parse(localStorage.getItem('menu_catalog') || '[]');
      }
      
      const supabaseMenu = (data || []) as any[];
      // Sync ke localStorage sebagai cache
      localStorage.setItem('menu_catalog', JSON.stringify(supabaseMenu));
      return supabaseMenu;
    } catch (err) {
      return JSON.parse(localStorage.getItem('menu_catalog') || '[]');
    }
  },

  async upsertMenuItem(item: any) {
    // Update localStorage cache dulu
    const localMenu = JSON.parse(localStorage.getItem('menu_catalog') || '[]');
    const idx = localMenu.findIndex((i: any) => i.id === item.id || i.name === item.name);
    if (idx >= 0) localMenu[idx] = { ...localMenu[idx], ...item };
    else localMenu.push(item);
    localStorage.setItem('menu_catalog', JSON.stringify(localMenu));

    try {
      const payload = {
        name: item.name,
        price: item.price,
        category: item.category,
        tag: item.tag || null,
        img: item.img || null,
      };

      // Kalau item punya id yang valid (dari Supabase), UPDATE
      if (item.id && typeof item.id === 'number') {
        const { data, error } = await supabase
          .from('menu_catalog')
          .update(payload)
          .eq('id', item.id)
          .select()
          .maybeSingle();

        if (error) {
          console.error('Update menu error:', error.message);
          return item;
        }
        return data || item;
      } else {
        // Item baru tanpa id — INSERT
        const { data, error } = await supabase
          .from('menu_catalog')
          .insert(payload)
          .select()
          .maybeSingle();

        if (error) {
          console.error('Insert menu error:', error.message);
          return item;
        }
        return data || item;
      }
    } catch (err) {
      console.error('upsertMenuItem exception:', err);
      return item;
    }
  },

  async deleteMenuItem(id: number) {
    const localMenu = JSON.parse(localStorage.getItem('menu_catalog') || '[]');
    localStorage.setItem('menu_catalog', JSON.stringify(localMenu.filter((i: any) => i.id !== id)));

    try {
      await supabase.from('menu_catalog').delete().eq('id', id);
    } catch (err) {
      // Ignored
    }
  }
};