import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, ShieldAlert, KeyRound, AlertCircle, CheckCircle, ChefHat, Truck, ShieldCheck, Building, Phone, MapPin, FileText, Compass, Eye, EyeOff, Sparkles } from 'lucide-react';
import { getFirebaseAuth, getFirebaseDB, isFirestoreQuotaExhausted, handleQuotaExhausted, safeSetDoc, safeGetDoc } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc } from 'firebase/firestore';
import AddressAutocomplete from './AddressAutocomplete';
import { User as UserType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserType) => void;
  initialMode?: 'login' | 'signup' | 'forgot_password';
  designSettings?: any;
}

type AuthMode = 'login' | 'signup' | 'forgot_password';
type UserRole = 'client' | 'restaurant' | 'courier';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login', designSettings }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<UserRole>('client');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Common Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Client Specific
  const [address, setAddress] = useState('');

  // Restaurant Specific
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [siret, setSiret] = useState('');

  // Courier Specific
  const [vehicle, setVehicle] = useState<'Velo' | 'Scooter' | 'Voiture' | 'Trottinette'>('Velo');
  const [zone, setZone] = useState('Paris');

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

    if (mode === 'signup' && !fullName) {
      setErrorMsg('Veuillez remplir votre nom complet.');
      return;
    }

    setIsSubmitting(true);
    const auth = getFirebaseAuth();
    const db = getFirebaseDB();
    const lowerEmail = email.toLowerCase().trim();

    try {
      if (mode === 'signup') {
        const assignedRole: UserRole = role; // Strictly 'client' | 'restaurant' | 'courier'
        let firebaseUid = `usr-${Date.now()}`;

        // 1. Create user in Firebase Authentication
        if (auth) {
          try {
            const userCred = await createUserWithEmailAndPassword(auth, lowerEmail, password);
            firebaseUid = userCred.user.uid;
          } catch (authErr: any) {
            if (authErr.code === 'auth/email-already-in-use') {
              throw new Error('Cet email est déjà enregistré. Veuillez vous connecter.');
            } else if (authErr.code === 'auth/weak-password') {
              throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
            } else if (authErr.code === 'auth/invalid-email') {
              throw new Error('Format d’adresse email invalide.');
            }
            console.warn('[Firebase Auth] Sign up notice:', authErr?.message);
          }
        }

        // 2. Persist user profile to Firestore
        const now = new Date().toISOString();
        const verificationStatus = (assignedRole === 'client' ? 'verified' : 'pending') as 'pending' | 'verified' | 'rejected';
        const userProfile = {
          uid: firebaseUid,
          id: firebaseUid,
          email: lowerEmail,
          role: assignedRole,
          fullName: fullName || lowerEmail.split('@')[0],
          phone: phone || '',
          address: address || '',
          siret: siret || '',
          restaurantName: restaurantName || '',
          cuisineType: cuisineType || '',
          vehicle: vehicle || '',
          zone: zone || '',
          verificationStatus,
          createdAt: now,
          updatedAt: now
        };

        if (db && !isFirestoreQuotaExhausted()) {
          await safeSetDoc(doc(db, 'users', firebaseUid), userProfile);
        }

        // 3. Sync with backend API
        try {
          const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: lowerEmail, 
              role: assignedRole,
              fullName,
              phone,
              address,
              restaurantName,
              cuisineType,
              siret,
              vehicle,
              zone,
              uid: firebaseUid
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              userProfile.id = data.user.id || userProfile.id;
            }
          }
        } catch (apiErr) {
          console.warn('[Backend Auth Sync] Notice:', apiErr);
        }

        try {
          localStorage.setItem('fidfud_user', JSON.stringify(userProfile));
        } catch (e) {}

        onAuthSuccess(userProfile);
        setSuccessMsg(
          assignedRole === 'client' 
            ? 'Compte client créé avec succès ! Bienvenue sur Fidfud.' 
            : assignedRole === 'restaurant'
              ? 'Compte restaurateur créé avec succès ! Votre dossier est en attente de vérification.'
              : 'Compte livreur créé avec succès ! Votre dossier est en attente de vérification.'
        );
        setTimeout(() => onClose(), 1000);

      } else if (mode === 'login') {
        let firebaseUid = '';

        // 1. Authenticate with Firebase Authentication
        if (auth) {
          try {
            const userCred = await signInWithEmailAndPassword(auth, lowerEmail, password);
            firebaseUid = userCred.user.uid;
          } catch (authErr: any) {
            console.warn('[Firebase Auth] Sign in notice:', authErr?.message);
            if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
              throw new Error('Mot de passe incorrect ou compte introuvable.');
            } else if (authErr.code === 'auth/user-not-found') {
              throw new Error('Aucun compte trouvé avec cet email. Veuillez vous inscrire.');
            } else if (authErr.code === 'auth/too-many-requests') {
              throw new Error('Trop de tentatives. Veuillez patienter ou réinitialiser votre mot de passe.');
            }
          }
        }

        // 2. Load persistent profile from Firestore
        let userObj: any = null;
        if (firebaseUid && db && !isFirestoreQuotaExhausted()) {
          const uDoc = await safeGetDoc(doc(db, 'users', firebaseUid));
          if (uDoc && uDoc.exists()) {
            userObj = { id: firebaseUid, uid: firebaseUid, ...uDoc.data() };
          }
        }

        // 3. Sync with backend API
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: lowerEmail, password, uid: firebaseUid })
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              userObj = { ...data.user, ...(userObj || {}) };
            }
          } else if (!userObj) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Identifiants incorrects ou utilisateur introuvable.');
          }
        } catch (apiErr: any) {
          if (!userObj) throw apiErr;
        }

        if (!userObj) {
          userObj = {
            id: firebaseUid || `usr-${Date.now()}`,
            uid: firebaseUid || `usr-${Date.now()}`,
            email: lowerEmail,
            role: 'client',
            fullName: lowerEmail.split('@')[0]
          };
        }

        try {
          localStorage.setItem('fidfud_user', JSON.stringify(userObj));
        } catch (e) {}

        onAuthSuccess(userObj);
        setSuccessMsg('Connexion réussie !');
        setTimeout(() => onClose(), 1000);

      } else if (mode === 'forgot_password') {
        if (auth) {
          try {
            await sendPasswordResetEmail(auth, lowerEmail);
          } catch (resetErr: any) {
            console.warn('[Firebase Reset Password]:', resetErr?.message);
            if (resetErr.code === 'auth/user-not-found') {
              throw new Error('Aucun compte n’est associé à cette adresse email.');
            }
          }
        }

        await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: lowerEmail })
        }).catch(() => {});

        setSuccessMsg(`Un email de réinitialisation de mot de passe a été envoyé à ${lowerEmail} !`);
        setEmail('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'La connexion au serveur d’authentification a échoué.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      let googleUserEmail = '';
      let googleDisplayName = '';
      let googleUid = '';

      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Le service d'authentification n'est pas initialisé.");
      }

      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        if (result.user && result.user.email) {
          googleUserEmail = result.user.email;
          googleDisplayName = result.user.displayName || '';
          googleUid = result.user.uid;
        }
      } catch (popupErr: any) {
        console.warn("Firebase Google popup notice:", popupErr?.message || popupErr);
        if (popupErr.code === 'auth/popup-closed-by-user') {
          throw new Error("La fenêtre de connexion Google a été fermée.");
        } else if (popupErr.code === 'auth/popup-blocked') {
          throw new Error("La fenêtre Google a été bloquée par le navigateur. Veuillez autoriser les fenêtres pop-up.");
        } else {
          throw new Error(popupErr.message || "Erreur lors de la connexion Google.");
        }
      }

      if (!googleUserEmail || !googleUid) {
        throw new Error("Échec de la récupération des données de connexion Google.");
      }

      const lowerEmail = googleUserEmail.toLowerCase().trim();
      const db = getFirebaseDB();
      let resolvedUser: any = null;

      // 1. Check if user already exists in Firestore (preserve existing role)
      if (db && !isFirestoreQuotaExhausted()) {
        const uDoc = await safeGetDoc(doc(db, 'users', googleUid));
        if (uDoc && uDoc.exists()) {
          resolvedUser = { id: googleUid, uid: googleUid, ...uDoc.data() };
        }
      }

      // 2. If new user, create persistent profile in Firestore
      if (!resolvedUser) {
        const now = new Date().toISOString();
        const initialRole: UserRole = role; // 'client' | 'restaurant' | 'courier'
        resolvedUser = {
          id: googleUid,
          uid: googleUid,
          email: lowerEmail,
          role: initialRole,
          fullName: googleDisplayName || lowerEmail.split('@')[0],
          phone: '',
          address: '',
          siret: '',
          restaurantName: '',
          cuisineType: '',
          vehicle: '',
          zone: '',
          verificationStatus: (initialRole === 'client' ? 'verified' : 'pending') as 'pending' | 'verified' | 'rejected',
          createdAt: now,
          updatedAt: now
        };

        if (db && !isFirestoreQuotaExhausted()) {
          await safeSetDoc(doc(db, 'users', googleUid), resolvedUser);
        }
      }

      // 3. Sync user session to backend API
      try {
        await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: lowerEmail,
            fullName: resolvedUser.fullName,
            role: resolvedUser.role,
            uid: googleUid
          })
        });
      } catch (fetchErr) {
        console.warn('[Google Auth Sync] Server session notice:', fetchErr);
      }

      try {
        localStorage.setItem('fidfud_user', JSON.stringify(resolvedUser));
      } catch (e) {}

      onAuthSuccess(resolvedUser);
      setSuccessMsg(`Connexion Google réussie (${lowerEmail}) !`);
      setTimeout(() => {
        onClose();
      }, 700);

    } catch (err: any) {
      console.error("Google Auth error:", err);
      setErrorMsg(err.message || 'Une erreur est survenue lors de la connexion Google.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const appName = designSettings?.appName || 'FIDFUD';
  const loginBgColor = designSettings?.loginBgColor || '#0D0D0E';
  const loginAccentColor = designSettings?.loginAccentColor || designSettings?.accentColor || '#FF5C00';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
      {/* Background click handler */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main card */}
      <div 
        className="relative w-full max-w-lg border border-white/10 rounded-[32px] overflow-hidden p-6 sm:p-8 shadow-[0_25px_50px_-12px_rgba(255,92,0,0.2)] z-10 my-auto transition-all duration-300"
        style={{ backgroundColor: loginBgColor }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/5 transition-colors cursor-pointer z-20"
        >
          <X size={16} />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center gap-2 mb-1">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,92,0,0.4)]"
              style={{ backgroundColor: loginAccentColor }}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/>
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tighter italic text-white">{appName}</span>
          </div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-mono">
            Espace d'Authentification Sécurisé
          </p>
        </div>

        {/* Mode Title */}
        <div className="mb-5 relative z-10 text-center">
          <h3 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight">
            {mode === 'login' ? 'Connexion à votre espace' : mode === 'signup' ? 'Création de compte' : 'Réinitialisation'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            {mode === 'login' 
              ? 'Accédez à vos commandes, à votre restaurant ou à vos livraisons.' 
              : mode === 'signup' 
                ? 'Choisissez votre rôle et renseignez vos informations d’inscription.' 
                : 'Saisissez votre email pour recevoir les instructions.'}
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-2.5 text-xs mb-4">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl flex items-start gap-2.5 text-xs mb-4">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Signup Role Selector Tabs */}
        {mode === 'signup' && (
          <div className="mb-5 space-y-2 relative z-10">
            <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider font-mono">
              Sélectionnez votre Rôle :
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950/80 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  role === 'client'
                    ? 'bg-[#FF5C00] text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User size={14} />
                <span>Client</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('restaurant')}
                className={`py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  role === 'restaurant'
                    ? 'bg-[#FF5C00] text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ChefHat size={14} />
                <span>Restaurateur</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('courier')}
                className={`py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  role === 'courier'
                    ? 'bg-[#FF5C00] text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Truck size={14} />
                <span>Livreur</span>
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
          
          {/* Signup Specific Fields */}
          {mode === 'signup' && (
            <>
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                  <span>{role === 'restaurant' ? 'Nom du Gérant / Responsable' : 'Nom Complet & Prénom'} <span className="text-red-500 font-bold ml-0.5">*</span></span>
                  <span className="text-[9px] text-red-400/80 font-normal">Obligatoire</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <User size={14} />
                  </span>
                  <input 
                    type="text" 
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Dupont" 
                    className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                  <span>Numéro de Téléphone <span className="text-red-500 font-bold ml-0.5">*</span></span>
                  <span className="text-[9px] text-red-400/80 font-normal">Obligatoire</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <Phone size={14} />
                  </span>
                  <input 
                    type="tel" 
                    inputMode="tel"
                    required={designSettings?.requirePhone !== false}
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 12 34 56 78" 
                    className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
                  />
                </div>
              </div>

              {/* Role Tailored Inputs */}
              {role === 'client' && (
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                    <span>Adresse Principale de Livraison {designSettings?.requireAddress && <span className="text-red-500 font-bold ml-0.5">*</span>}</span>
                    <span className="text-[9px] text-zinc-500 font-normal">Géolocalisable</span>
                  </label>
                  <AddressAutocomplete
                    value={address}
                    onChange={setAddress}
                    showGeolocateButton={true}
                    placeholder="Tapez votre adresse ou cliquez sur GPS 📍"
                    autoComplete="street-address"
                    className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 pl-10 pr-24 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
                  />
                </div>
              )}

              {role === 'restaurant' && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                      <span>Nom de l'Établissement / Restaurant <span className="text-red-500 font-bold ml-0.5">*</span></span>
                      <span className="text-[9px] text-red-400/80 font-normal">Obligatoire</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                        <Building size={14} />
                      </span>
                      <input 
                        type="text" 
                        required
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        placeholder="Nonna Maria Trattoria" 
                        className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Culinary Specialties Multi-Category Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                      <span>Spécialités Culinaire(s) / Catégories</span>
                      <span className="text-[9px] text-zinc-500 font-normal">Sélection multiple</span>
                    </label>
                    
                    {/* Category Tags Cloud */}
                    <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-950/50 border border-white/5 rounded-2xl max-h-32 overflow-y-auto">
                      {[
                        'Italien & Pizza 🍕',
                        'Japonais & Ramen 🍜',
                        'Burgers & Street Food 🍔',
                        'Français & Traditionnel 🥩',
                        'Mexicain & Tacos 🌮',
                        'Café & Goûter 🥞',
                        'Salades & Healthy 🥗',
                        'Asiatique & Wok 🥢',
                        'Indien & Curry 🍛',
                        'Halal 🌙',
                        'Cascher ✡️',
                        'Bio & Végétalien 🌿',
                        'Brunch ☕',
                        'Tapas 🍷'
                      ].map((catName) => {
                        const isSelected = cuisineType.includes(catName);
                        return (
                          <button
                            key={catName}
                            type="button"
                            onClick={() => {
                              let list = cuisineType ? cuisineType.split(', ').filter(Boolean) : [];
                              if (isSelected) {
                                list = list.filter(item => item !== catName);
                              } else {
                                list.push(catName);
                              }
                              setCuisineType(list.join(', '));
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-[#FF5C00] text-white shadow-md font-bold'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5'
                            }`}
                          >
                            <span>{catName}</span>
                            {isSelected && <span className="text-[9px]">✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Category Input */}
                    <div className="flex gap-2 pt-1">
                      <input 
                        type="text" 
                        value={cuisineType}
                        onChange={(e) => setCuisineType(e.target.value)}
                        placeholder="Saisissez ou modifiez les spécialités (ex: Italienne, Pizzeria...)" 
                        className="w-full bg-zinc-950/70 border border-white/5 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* SIRET / Licence (Optional) */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                      <span>SIRET / Numéro de Licence {designSettings?.requireSiret && <span className="text-red-500 font-bold ml-0.5">*</span>}</span>
                      <span className="text-[9px] text-zinc-500 font-normal">(Optionnel)</span>
                    </label>
                    <input 
                      type="text" 
                      required={!!designSettings?.requireSiret}
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                      placeholder="800 123 456 00012 (Facultatif)" 
                      className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 px-3.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors font-mono"
                    />
                  </div>
                </div>
              )}

              {role === 'courier' && (
                <div className="space-y-3 pt-1 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans">Moyen de Transport <span className="text-red-500 font-bold ml-0.5">*</span></label>
                      <select 
                        value={vehicle}
                        onChange={(e) => setVehicle(e.target.value as any)}
                        className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#FF5C00]/50 transition-colors cursor-pointer"
                      >
                        <option value="Velo">🚲 Vélo Élégant</option>
                        <option value="Scooter">🛵 Scooter Électrique</option>
                        <option value="Voiture">🚗 Voiture Eco</option>
                        <option value="Trottinette">🛴 Trottinette Express</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans">Secteur / Ville <span className="text-red-500 font-bold ml-0.5">*</span></label>
                      <AddressAutocomplete
                        value={zone}
                        onChange={setZone}
                        showGeolocateButton={true}
                        placeholder="Secteur ou ville..."
                        className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 mt-2">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
                      <span>Numéro SIRET / Licence Livreur</span>
                      <span className="text-[9px] text-zinc-500 font-normal">(Optionnel)</span>
                    </label>
                    <input 
                      type="text" 
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                      placeholder="800 123 456 00012 (Facultatif)" 
                      className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 px-3.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors font-mono"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Email field */}
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans flex items-center justify-between">
              <span>Adresse Email <span className="text-red-500 font-bold ml-0.5">*</span></span>
              <span className="text-[9px] text-red-400/80 font-normal">Obligatoire</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                <Mail size={14} />
              </span>
              <input 
                type="email" 
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@email.com" 
                className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
              />
            </div>
          </div>

          {/* Password field */}
          {mode !== 'forgot_password' && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-sans">
                  Mot de passe <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
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
                  <Lock size={14} />
                </span>
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === 'signup' ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caractères" 
                  className="w-full bg-zinc-950/70 border border-white/5 rounded-2xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white font-black text-xs uppercase py-3.5 rounded-2xl transition-all shadow-[0_15px_30px_rgba(255,92,0,0.2)] active:scale-[0.98] mt-3 flex items-center justify-center gap-2 cursor-pointer relative z-10"
            style={{ backgroundColor: loginAccentColor }}
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <KeyRound size={15} />
                <span>
                  {mode === 'login' && 'Se connecter'}
                  {mode === 'signup' && `S’inscrire en tant que ${role === 'client' ? 'Client' : role === 'restaurant' ? 'Restaurateur' : 'Livreur'}`}
                  {mode === 'forgot_password' && 'Envoyer l’email'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Google Sign In Divider */}
        {designSettings?.loginShowGoogle !== false && (
          <>
            <div className="relative my-4 z-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase">
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
              className="w-full bg-zinc-950/80 hover:bg-zinc-900/80 text-white font-bold text-xs uppercase py-3 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg active:scale-[0.98] relative z-10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Se connecter avec Google</span>
            </button>
          </>
        )}

        {/* Navigation Toggles */}
        <div className="mt-5 pt-4 border-t border-white/5 text-center text-xs relative z-10">
          {mode === 'login' ? (
            <p className="text-zinc-500 font-sans">
              Nouveau sur {appName} ?{' '}
              <button 
                type="button" 
                onClick={() => setMode('signup')}
                className="font-bold hover:underline focus:outline-none text-[#FF5C00]"
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
                className="font-bold hover:underline focus:outline-none text-[#FF5C00]"
              >
                Se connecter
              </button>
            </p>
          ) : (
            <p className="text-zinc-500 font-sans">
              Rappeler le mot de passe ?{' '}
              <button 
                type="button" 
                onClick={() => setMode('login')}
                className="font-bold hover:underline focus:outline-none text-[#FF5C00]"
              >
                Retour connexion
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

