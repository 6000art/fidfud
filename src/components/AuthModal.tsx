import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, ShieldAlert, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import { getFirebaseAuth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: { id: string; email: string; role: 'client' | 'restaurant' | 'admin' }) => void;
  initialMode?: 'login' | 'signup' | 'forgot_password';
  designSettings?: any;
}

type AuthMode = 'login' | 'signup' | 'forgot_password';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login', designSettings }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'restaurant'>('client');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic Validation
    if (!email || !email.includes('@')) {
      setErrorMsg('Veuillez saisir une adresse email valide.');
      return;
    }
    if (mode !== 'forgot_password' && password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsSubmitting(true);

    try {
      let endpoint = '/api/auth/login';
      let payload: any = { email, password };

      if (mode === 'signup') {
        endpoint = '/api/auth/signup';
        payload = { email, password, role };
      } else if (mode === 'forgot_password') {
        endpoint = '/api/auth/reset-password';
        payload = { email };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue lors de l’authentification.');
      }

      if (mode === 'forgot_password') {
        setSuccessMsg('Un email de réinitialisation fictif a été envoyé à votre adresse !');
        setEmail('');
      } else {
        // Login or Sign up success
        onAuthSuccess(data.user);
        setSuccessMsg(mode === 'signup' ? 'Compte créé avec succès ! Session ouverte.' : 'Connexion réussie !');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'La connexion au serveur a échoué.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Le service Firebase Auth n'a pas pu être initialisé.");
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!googleUser || !googleUser.email) {
        throw new Error("L'authentification Google a échoué (adresse email manquante).");
      }

      // Sync user session to server
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleUser.email,
          role: role
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la synchronisation de la session Google.');
      }

      onAuthSuccess(data.user);
      setSuccessMsg('Connexion Google réussie !');
      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error("Google Auth error:", err);
      let errorDesc = err.message || 'Une erreur est survenue lors de la connexion Google.';
      if (err.code === 'auth/popup-closed-by-user') {
        errorDesc = 'La fenêtre de connexion Google a été fermée avant la fin de l’authentification.';
      }
      setErrorMsg(errorDesc);
    } finally {
      setIsSubmitting(false);
    }
  };

  const appName = designSettings?.appName || 'FIDFUD';
  const loginBgColor = designSettings?.loginBgColor || '#0D0D0E';
  const loginBgImage = designSettings?.loginBgImage || '';
  const loginAccentColor = designSettings?.loginAccentColor || designSettings?.accentColor || '#FF5C00';
  const loginLogoUrl = designSettings?.loginLogoUrl || '';
  const loginTitle = mode === 'login' 
    ? (designSettings?.loginTitle || 'Connexion') 
    : mode === 'signup' 
      ? 'Créer un compte' 
      : 'Mot de passe oublié';
  const loginSubtitle = mode === 'login' 
    ? (designSettings?.loginSubtitle || 'Accédez à vos commandes et favoris gourmands.') 
    : mode === 'signup' 
      ? 'Rejoignez la révolution de la vidéo culinaire.' 
      : 'Entrez votre email pour réinitialiser.';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      {/* Background click handler */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main card */}
      <div 
        className="relative w-full max-w-md border border-white/5 rounded-[32px] overflow-hidden p-8 shadow-[0_25px_50px_-12px_rgba(255,92,0,0.15)] z-10 transition-all duration-300"
        style={{ backgroundColor: loginBgColor }}
      >
        {/* Custom background image */}
        {loginBgImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-overlay pointer-events-none" 
            style={{ backgroundImage: `url(${loginBgImage})` }} 
          />
        )}
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/5 transition-colors cursor-pointer z-20"
        >
          <X size={16} />
        </button>

        {/* Brand Logo Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center gap-2 mb-2">
            {loginLogoUrl ? (
              <img src={loginLogoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover border border-white/10" />
            ) : (
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,92,0,0.4)]"
                style={{ backgroundColor: loginAccentColor }}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/>
                </svg>
              </div>
            )}
            <span className="text-xl font-black tracking-tighter italic text-white">{appName}</span>
          </div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono">
            {designSettings?.loginLogoSubtitle || "Studio Photo & Fast Food Virtuel"}
          </p>
        </div>

        {/* Mode Title */}
        <div className="mb-6 relative z-10">
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
            {loginTitle}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            {loginSubtitle}
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-start gap-2.5 text-xs mb-5 animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl flex items-start gap-2.5 text-xs mb-5">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Adresse Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                <Mail size={15} />
              </span>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com" 
                className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
              />
            </div>
          </div>

          {/* Password field */}
          {mode !== 'forgot_password' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Mot de passe</label>
                {mode === 'login' && (
                  <button 
                    type="button" 
                    onClick={() => setMode('forgot_password')}
                    className="text-[10px] text-[#FF5C00] hover:underline font-semibold font-sans focus:outline-none"
                  >
                    Oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Lock size={15} />
                </span>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caractères" 
                  className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Role selector field for sign up */}
          {mode === 'signup' && (
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Votre Rôle sur la Plateforme</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`py-3.5 px-4 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    role === 'client' 
                      ? 'text-white shadow-[0_0_15px_rgba(255,92,0,0.15)]' 
                      : 'bg-zinc-950/40 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                  style={role === 'client' ? { backgroundColor: `${loginAccentColor}15`, borderColor: loginAccentColor } : {}}
                >
                  <User size={16} style={{ color: role === 'client' ? loginAccentColor : undefined }} />
                  <span>Client Gourmand</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('restaurant')}
                  className={`py-3.5 px-4 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    role === 'restaurant' 
                      ? 'text-white shadow-[0_0_15px_rgba(255,92,0,0.15)]' 
                      : 'bg-zinc-950/40 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                  style={role === 'restaurant' ? { backgroundColor: `${loginAccentColor}15`, borderColor: loginAccentColor } : {}}
                >
                  <ShieldAlert size={16} style={{ color: role === 'restaurant' ? loginAccentColor : undefined }} />
                  <span>Restaurateur Partenaire</span>
                </button>
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white font-black text-sm uppercase py-4 rounded-2xl transition-all shadow-[0_15px_30px_rgba(255,92,0,0.2)] active:scale-[0.98] mt-4 flex items-center justify-center gap-2 cursor-pointer relative z-10"
            style={{ backgroundColor: loginAccentColor }}
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <KeyRound size={16} />
                <span>
                  {mode === 'login' && 'Se connecter'}
                  {mode === 'signup' && 'S’enregistrer'}
                  {mode === 'forgot_password' && 'Envoyer l’email'}
                </span>
              </>
            )}
          </button>
        </form>

        {designSettings?.loginShowGoogle !== false && (
          <>
            {/* OR divider line */}
            <div className="relative my-6 z-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span 
                  className="px-3 text-zinc-500 font-bold font-mono tracking-widest"
                  style={{ backgroundColor: loginBgColor }}
                >
                  OU CONTINUER AVEC
                </span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full bg-zinc-950/80 hover:bg-zinc-900/80 text-white font-bold text-xs uppercase py-3.5 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg active:scale-[0.98] relative z-10"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Se connecter avec Google</span>
            </button>
          </>
        )}

        {/* Navigation toggles between modes */}
        <div className="mt-6 pt-5 border-t border-white/5 text-center text-xs relative z-10">
          {mode === 'login' ? (
            <p className="text-zinc-500 font-sans">
              Nouveau sur {appName} ?{' '}
              <button 
                type="button" 
                onClick={() => setMode('signup')}
                className="font-bold hover:underline focus:outline-none"
                style={{ color: loginAccentColor }}
              >
                Créer un compte
              </button>
            </p>
          ) : mode === 'signup' ? (
            <p className="text-zinc-500 font-sans">
              Déjà inscrit ?{' '}
              <button 
                type="button" 
                onClick={() => setMode('login')}
                className="font-bold hover:underline focus:outline-none"
                style={{ color: loginAccentColor }}
              >
                Se connecter
              </button>
            </p>
          ) : (
            <p className="text-zinc-500 font-sans">
              Vous vous en rappelez ?{' '}
              <button 
                type="button" 
                onClick={() => setMode('login')}
                className="font-bold hover:underline focus:outline-none"
                style={{ color: loginAccentColor }}
              >
                Retour à la connexion
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
