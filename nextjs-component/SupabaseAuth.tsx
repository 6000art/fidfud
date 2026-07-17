"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  UserCheck, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

// Initialize Supabase Client lazily or read from env. Standard public keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SupabaseAuth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  const [role, setRole] = useState<'client' | 'restaurant'>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    // Get current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !email.includes('@')) {
      setErrorMsg('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    if (mode !== 'forgot_password' && password.length < 6) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
            },
          },
        });
        
        if (error) throw error;
        
        if (data.session) {
          setSuccessMsg('Compte créé et connecté avec succès ! 🚀');
        } else {
          setSuccessMsg('Veuillez vérifier votre boîte de réception pour confirmer votre inscription ! 📧');
        }
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        setSuccessMsg('Connexion réussie ! Bienvenue sur Fidfud 🍔');
      } else if (mode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) throw error;
        setSuccessMsg('Lien de réinitialisation envoyé ! Vérifiez vos emails.');
      }
    } catch (err: any) {
      console.error('Supabase auth error:', err);
      setErrorMsg(err.message || 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    setSuccessMsg('Déconnexion réussie !');
  };

  if (sessionUser) {
    const userRole = sessionUser.user_metadata?.role || 'client';
    return (
      <div className="w-full max-w-md mx-auto bg-[#09090B]/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-[#FF5C00]/10 border border-[#FF5C00]/25 rounded-2xl flex items-center justify-center mx-auto">
          <UserCheck className="text-[#FF5C00]" size={28} />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Profil Connecté</h2>
          <p className="text-xs text-zinc-400 mt-1">{sessionUser.email}</p>
        </div>
        
        <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/80 text-left space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500 uppercase font-bold tracking-wider">Rôle de l'utilisateur</span>
            <span className="text-[#FF5C00] font-black uppercase italic tracking-wide">{userRole}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500 uppercase font-bold tracking-wider">ID Utilisateur</span>
            <span className="font-mono text-zinc-400 text-[10px] select-all">{sessionUser.id}</span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl border border-zinc-800 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="animate-spin" size={14} /> : 'Se déconnecter'}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-[#09090B]/90 backdrop-blur-xl border border-zinc-800/80 rounded-[32px] p-8 shadow-[0_25px_50px_-12px_rgba(255,92,0,0.15)] flex flex-col justify-center">
      {/* Auth Mode Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1.5 bg-zinc-950 rounded-2xl mb-8 border border-zinc-800/80 text-xs font-black uppercase tracking-wider">
        <button
          onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`py-2.5 rounded-xl transition-all cursor-pointer text-center ${
            mode === 'login' ? 'bg-[#FF5C00] text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Connexion
        </button>
        <button
          onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
          className={`py-2.5 rounded-xl transition-all cursor-pointer text-center ${
            mode === 'signup' ? 'bg-[#FF5C00] text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Inscription
        </button>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">
          {mode === 'login' && 'Bon retour sur Fidfud'}
          {mode === 'signup' && 'Rejoindre Fidfud'}
          {mode === 'forgot_password' && 'Mot de passe oublié'}
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          {mode === 'login' && 'Entrez vos identifiants pour continuer.'}
          {mode === 'signup' && 'Créez votre compte client ou restaurant.'}
          {mode === 'forgot_password' && 'Indiquez votre adresse email pour recevoir le lien.'}
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-2xl flex items-start gap-2.5 mb-5 text-xs">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3.5 rounded-2xl flex items-start gap-2.5 mb-5 text-xs">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleAuthSubmit} className="space-y-4">
        {/* Role Picker ONLY during sign up */}
        {mode === 'signup' && (
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Choisissez votre profil</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center ${
                  role === 'client' 
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-white shadow-sm' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                }`}
              >
                😋 Gourmet (Client)
              </button>
              <button
                type="button"
                onClick={() => setRole('restaurant')}
                className={`py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center ${
                  role === 'restaurant' 
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-white shadow-sm' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                }`}
              >
                🍳 Restaurateur (Partner)
              </button>
            </div>
          </div>
        )}

        {/* Email Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Adresse E-mail</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-zinc-500">
              <Mail size={16} />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre-email@exemple.com"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#FF5C00] transition-colors"
            />
          </div>
        </div>

        {/* Password Input (Omitted in forgot_password mode) */}
        {mode !== 'forgot_password' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Mot de Passe</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot_password')}
                  className="text-[10px] font-bold text-[#FF5C00] hover:underline uppercase tracking-wider"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-zinc-500">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-12 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#FF5C00] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FF5C00] hover:bg-[#FF7A00] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg shadow-[#FF5C00]/10 hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw className="animate-spin" size={14} />
          ) : (
            <>
              <span>
                {mode === 'login' && 'Se connecter'}
                {mode === 'signup' && "S'inscrire"}
                {mode === 'forgot_password' && 'Réinitialiser'}
              </span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      {/* Footer / Switch link in forgot_password mode */}
      {mode === 'forgot_password' && (
        <div className="text-center mt-6">
          <button
            onClick={() => setMode('login')}
            className="text-[10px] font-black uppercase text-zinc-500 hover:text-white tracking-wider"
          >
            ← Retourner à la connexion
          </button>
        </div>
      )}
    </div>
  );
}
