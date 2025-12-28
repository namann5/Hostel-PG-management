'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'ADMIN' | 'STUDENT') => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

    const fetchProfile = async (userId: string) => {
      console.log('Fetching profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
      }
      
      if (!error && data) {
        console.log('Profile found:', data);
        setProfile(data);
      }
      return data;
    };

    useEffect(() => {
      const initAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session initialized:', session);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
        setLoading(false);
      };

      initAuth();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      });

    return () => subscription.unsubscribe();
  }, [router]);

    const signUp = async (email: string, password: string, name: string, role: 'ADMIN' | 'STUDENT') => {
      console.log('Signing up:', email, name, role);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('SignUp error:', error);
        return { error: error.message };
      }

      console.log('SignUp successful, user:', data.user);

      if (data.user) {
        console.log('Creating profile for:', data.user.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name,
            email,
            role,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return { error: profileError.message };
        }

        if (role === 'STUDENT') {
          console.log('Creating student record for:', data.user.id);
          const { error: studentError } = await supabase
            .from('students')
            .insert({
              user_id: data.user.id,
              join_date: new Date().toISOString().split('T')[0],
            });

          if (studentError) {
            console.error('Student creation error:', studentError);
            return { error: studentError.message };
          }
        }

        await fetchProfile(data.user.id);
        router.push('/dashboard');
      }

      return { error: null };
    };

    const signIn = async (email: string, password: string) => {
      console.log('Signing in:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('SignIn error:', error);
        return { error: error.message };
      }

      console.log('SignIn successful, user:', data.user);

      if (data.user) {
        await fetchProfile(data.user.id);
        router.push('/dashboard');
      }

      return { error: null };
    };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
