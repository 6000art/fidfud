import React, { useState, useEffect } from 'react';
import { 
  Truck, Bike, Car, MapPin, Bell, User, Star, Check, 
  FileText, UploadCloud, TrendingUp, Navigation, AlertCircle, 
  ShoppingBag, ShieldCheck, Play, CheckCircle, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { Courier, Order } from '../types';

interface CourierDashboardProps {
  user: any;
  onRefreshData?: () => void;
  accentColor?: string;
}

export default function CourierDashboard({ 
  user, 
  onRefreshData,
  accentColor = '#FF5C00'
}: CourierDashboardProps) {
  
  // --- STATE MANAGEMENT ---
  const [currentCourier, setCurrentCourier] = useState<Courier | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Registration Form Fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regVehicle, setRegVehicle] = useState<'Velo' | 'Scooter' | 'Voiture'>('Velo');
  const [regSiret, setRegSiret] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [identityFileName, setIdentityFileName] = useState('');
  const [kbisFile, setKbisFile] = useState<File | null>(null);
  const [kbisFileName, setKbisFileName] = useState('');
  
  // Login Form Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // GPS Simulation variables
  const [gpsProgress, setGpsProgress] = useState(0); // 0 to 100%
  const [gpsIntervalId, setGpsIntervalId] = useState<any>(null);
  const [simulatedSpeed, setSimulatedSpeed] = useState(25); // km/h
  const [simulatedDistance, setSimulatedDistance] = useState(2.4); // km
  const [simulatedTimeLeft, setSimulatedTimeLeft] = useState(8); // minutes

  // Earnings Stats
  const [earningsStats, setEarningsStats] = useState({
    completedCount: 3,
    totalEarnings: 21.40,
    tipsEarned: 4.50
  });

  // --- ACTIONS & EFFECTS ---

  // Trigger brief alert toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Try loading active courier from session storage or default Karim
  useEffect(() => {
    const savedCourier = sessionStorage.getItem('active_courier');
    if (savedCourier) {
      try {
        setCurrentCourier(JSON.parse(savedCourier));
      } catch {
        // Fail silently
      }
    } else if (user) {
      // If user email matches karim/sarah/maxime, load them
      fetch('/api/couriers')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const matched = data.find(c => c.email?.toLowerCase() === user.email.toLowerCase());
            if (matched) {
              setCurrentCourier(matched);
              sessionStorage.setItem('active_courier', JSON.stringify(matched));
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Fetch available/active orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data: Order[] = await res.json();
        
        // Filter orders that need delivery and are pending or preparing and not assigned yet
        const available = data.filter(o => 
          o.deliveryType === 'restaurant_delivery' && 
          (o.status === 'pending' || o.status === 'preparing') && 
          !o.courierId
        );
        setAvailableOrders(available);

        // Find if this courier has an active delivery
        if (currentCourier) {
          const active = data.find(o => 
            o.courierId === currentCourier.id && 
            o.status !== 'delivered' && 
            o.status !== 'cancelled'
          );
          if (active) {
            setActiveDelivery(active);
            
            // Resume GPS simulation if en_route
            if (active.courierStatus === 'en_route') {
              startGpsInterval();
            }
          } else {
            setActiveDelivery(null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching delivery orders:', err);
    }
  };

  // Poll for orders every 5 seconds when online
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => {
      clearInterval(interval);
      if (gpsIntervalId) clearInterval(gpsIntervalId);
    };
  }, [currentCourier?.id]);

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPhone || !regPassword) {
      showToast('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/couriers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
          vehicle: regVehicle,
          siret: regSiret,
          drivingLicense: regLicense,
          identityDocUrl: identityFileName ? `/uploads/${identityFileName}` : undefined,
          kbisDocUrl: kbisFileName ? `/uploads/${kbisFileName}` : undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentCourier(data.courier);
        sessionStorage.setItem('active_courier', JSON.stringify(data.courier));
        showToast('✨ Compte livreur créé et vérifié ! Vous êtes prêt à livrer.', 'success');
        setIsRegistering(false);
        // Clear inputs
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegPassword('');
        setRegSiret('');
        setRegLicense('');
      } else {
        showToast(data.error || 'Erreur lors de l’inscription.', 'error');
      }
    } catch (err) {
      showToast('Une erreur réseau est survenue.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast('Email et mot de passe requis.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/couriers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentCourier(data.courier);
        sessionStorage.setItem('active_courier', JSON.stringify(data.courier));
        showToast(`Heureux de vous revoir, ${data.courier.name} ! 🛵`, 'success');
        // Put courier online automatically
        await updateCourierStatusOnServer(data.courier.id, 'available');
      } else {
        showToast(data.error || 'Identifiants incorrects.', 'error');
      }
    } catch (err) {
      showToast('Une erreur réseau est survenue.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update online status
  const toggleOnlineStatus = async () => {
    if (!currentCourier) return;
    const newStatus = currentCourier.status === 'offline' ? 'available' : 'offline';
    await updateCourierStatusOnServer(currentCourier.id, newStatus);
  };

  const updateCourierStatusOnServer = async (id: string, status: Courier['status']) => {
    try {
      const res = await fetch(`/api/couriers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentCourier(data.courier);
        sessionStorage.setItem('active_courier', JSON.stringify(data.courier));
        showToast(status === 'available' ? '🟢 Vous êtes en ligne ! À l’écoute des commandes.' : '🔴 Vous êtes hors-ligne.', 'success');
      }
    } catch {
      showToast('Impossible de modifier le statut.', 'error');
    }
  };

  // Accept a delivery offer
  const acceptDelivery = async (orderId: string) => {
    if (!currentCourier) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/assign-courier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierId: currentCourier.id })
      });
      
      const data = await res.json();
      if (res.ok) {
        setActiveDelivery(data.order);
        // Refresh local state
        const updatedCourier = { ...currentCourier, status: 'delivering' as const, assignedOrderId: orderId };
        setCurrentCourier(updatedCourier);
        sessionStorage.setItem('active_courier', JSON.stringify(updatedCourier));
        
        showToast('📦 Commande acceptée ! En route vers le restaurant.', 'success');
        if (onRefreshData) onRefreshData();
      } else {
        showToast(data.error || 'Impossible d’accepter la livraison.', 'error');
      }
    } catch {
      showToast('Erreur lors de la prise en charge.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Advance delivery status
  const advanceDeliveryStatus = async (nextStatus: 'at_restaurant' | 'en_route' | 'delivered') => {
    if (!activeDelivery) return;
    
    try {
      const res = await fetch(`/api/orders/${activeDelivery.id}/update-courier-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierStatus: nextStatus })
      });

      const data = await res.json();
      if (res.ok) {
        setActiveDelivery(data.order);
        
        if (nextStatus === 'at_restaurant') {
          showToast('🏪 Arrivé au restaurant. Récupérez les plats.', 'success');
        } else if (nextStatus === 'en_route') {
          showToast('🛵 Plats récupérés ! GPS activé vers l’adresse client.', 'success');
          setGpsProgress(0);
          startGpsInterval();
        } else if (nextStatus === 'delivered') {
          showToast('🎉 Commande livrée avec succès ! +5.90€ gagnés.', 'success');
          if (gpsIntervalId) {
            clearInterval(gpsIntervalId);
            setGpsIntervalId(null);
          }
          setActiveDelivery(null);
          setGpsProgress(0);
          
          // Update earnings stats
          setEarningsStats(prev => ({
            completedCount: prev.completedCount + 1,
            totalEarnings: Number((prev.totalEarnings + 5.90).toFixed(2)),
            tipsEarned: Number((prev.tipsEarned + (Math.random() > 0.5 ? 2.00 : 0)).toFixed(2))
          }));

          // Reset courier status locally
          if (currentCourier) {
            const fresh = { ...currentCourier, status: 'available' as const, assignedOrderId: undefined };
            setCurrentCourier(fresh);
            sessionStorage.setItem('active_courier', JSON.stringify(fresh));
          }
        }
        
        if (onRefreshData) onRefreshData();
      } else {
        showToast(data.error || 'Erreur lors de la mise à jour de livraison.', 'error');
      }
    } catch {
      showToast('Erreur réseau de mise à jour.', 'error');
    }
  };

  // GPS Simulation Loop
  const startGpsInterval = () => {
    if (gpsIntervalId) clearInterval(gpsIntervalId);
    setGpsProgress(0);
    setSimulatedDistance(2.4);
    setSimulatedTimeLeft(8);

    const interval = setInterval(() => {
      setGpsProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + 5;
        // Update distance & time remaining
        const remainingDist = Math.max(0, parseFloat((2.4 * (1 - next / 100)).toFixed(1)));
        const remainingTime = Math.max(0, Math.ceil(8 * (1 - next / 100)));
        setSimulatedDistance(remainingDist);
        setSimulatedTimeLeft(remainingTime);

        // Periodically push location coordinates back to server so customer tracks on map
        if (next % 15 === 0 && activeDelivery) {
          const simulatedLat = 48.8566 + (0.01 * (next / 100)); // Moves north
          const simulatedLng = 2.3522 + (0.015 * (next / 100)); // Moves east
          
          fetch(`/api/orders/${activeDelivery.id}/update-courier-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              courierStatus: 'en_route',
              latitude: simulatedLat,
              longitude: simulatedLng
            })
          }).catch(() => {});
        }

        return next;
      });
    }, 2000); // Advances 5% every 2s

    setGpsIntervalId(interval);
  };

  // Teleport/Cheat simulated delivery immediately to 100%
  const teleportDelivery = () => {
    if (!activeDelivery) return;
    setGpsProgress(100);
    setSimulatedDistance(0);
    setSimulatedTimeLeft(0);
    if (gpsIntervalId) {
      clearInterval(gpsIntervalId);
      setGpsIntervalId(null);
    }
    showToast('⚡ Téléportation réussie ! Vous êtes devant le client.', 'success');
  };

  // Simulated file drop handlers
  const handleFileDrop = (type: 'identity' | 'kbis', name: string) => {
    if (type === 'identity') {
      setIdentityFileName(name);
    } else {
      setKbisFileName(name);
    }
    showToast(`Fichier "${name}" chargé avec succès !`, 'success');
  };

  // Logout/Reset
  const handleLogout = () => {
    if (currentCourier) {
      updateCourierStatusOnServer(currentCourier.id, 'offline').then(() => {
        setCurrentCourier(null);
        sessionStorage.removeItem('active_courier');
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#050506] text-white p-4 pb-24 md:p-8 font-sans max-w-4xl mx-auto">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] border ${
          toast.type === 'success' 
            ? 'bg-zinc-900 text-green-400 border-green-500/30' 
            : 'bg-zinc-900 text-red-400 border-red-500/30'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-6 border-b border-white/5 mb-6">
        <div>
          <span className="text-[10px] bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-[#FF5C00] px-3 py-1 rounded-full uppercase tracking-widest font-black font-mono">
            Mode Coursier Uber-Eats Style
          </span>
          <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter mt-1 text-white">
            Portail Livreur Fidfud
          </h1>
        </div>
        {currentCourier && (
          <button 
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-all cursor-pointer"
          >
            Se déconnecter
          </button>
        )}
      </div>

      {/* SCENARIO 1: COURIER NOT LOGGED IN / SIGNUP FORM OR LOGIN CHANGER */}
      {!currentCourier ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Pitch Panel */}
          <div className="md:col-span-5 bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center">
              <Bike className="text-[#FF5C00]" size={24} />
            </div>
            <h3 className="text-lg font-black uppercase italic tracking-tight text-white">Devenez votre propre patron</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Inscrivez-vous sur FIDFUD en quelques clics. Livrez les plats délicieux des meilleurs chefs parisiens directement depuis les flux vidéo en direct, et profitez d'une rémunération attractive à la course.
            </p>

            <ul className="space-y-2 pt-2">
              <li className="flex items-center gap-2 text-[10px] text-zinc-300 font-bold uppercase">
                <Check className="text-green-500 shrink-0" size={12} />
                <span>Rémunération garantie (5.90€ / course)</span>
              </li>
              <li className="flex items-center gap-2 text-[10px] text-zinc-300 font-bold uppercase">
                <Check className="text-green-500 shrink-0" size={12} />
                <span>100% des pourboires pour vous</span>
              </li>
              <li className="flex items-center gap-2 text-[10px] text-zinc-300 font-bold uppercase">
                <Check className="text-green-500 shrink-0" size={12} />
                <span>Planning libre sans contraintes</span>
              </li>
            </ul>

            {/* Test Driver Accounts Panel for quick click */}
            <div className="pt-4 border-t border-white/5">
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2 font-mono">
                💡 Comptes Démo Express :
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    setLoginEmail('karim@fidfud.app');
                    setLoginPassword('demo123');
                    showToast('Comptes démo pré-rempli ! Cliquez sur Se Connecter.', 'success');
                  }}
                  className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-950 border border-white/5 hover:border-white/10 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-[10px] font-bold text-white uppercase">Karim (Scooter)</p>
                      <p className="text-[8px] text-zinc-500">karim@fidfud.app</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-zinc-900 text-[#FF5C00] font-black uppercase px-2 py-0.5 rounded border border-white/5 font-mono">SELECTIONNER</span>
                </button>
                <button
                  onClick={() => {
                    setLoginEmail('sarah@fidfud.app');
                    setLoginPassword('demo123');
                    showToast('Comptes démo pré-rempli ! Cliquez sur Se Connecter.', 'success');
                  }}
                  className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-950 border border-white/5 hover:border-white/10 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-[10px] font-bold text-white uppercase">Sarah (Vélo Élec)</p>
                      <p className="text-[8px] text-zinc-500">sarah@fidfud.app</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-zinc-900 text-[#FF5C00] font-black uppercase px-2 py-0.5 rounded border border-white/5 font-mono">SELECTIONNER</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form Switcher Column */}
          <div className="md:col-span-7 space-y-6">
            {!isRegistering ? (
              /* LOGIN FORM */
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase italic tracking-wider text-white">Connexion Espace Coursier</h3>
                  <button 
                    onClick={() => setIsRegistering(true)}
                    className="text-xs font-bold text-[#FF5C00] hover:underline cursor-pointer"
                  >
                    Créer un compte livreur →
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Adresse Email Professionnelle</label>
                    <input 
                      type="email" 
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:border-[#FF5C00]/50 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Mot de passe</label>
                    </div>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-950 border border-white/5 rounded-2xl pl-4 pr-10 py-3 text-xs text-white placeholder-zinc-600 focus:border-[#FF5C00]/50 focus:outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-[#FF5C00] hover:bg-[#FF7A00] disabled:bg-zinc-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_10px_20px_rgba(255,92,0,0.15)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="animate-spin" size={13} />
                    ) : (
                      <Play size={12} fill="currentColor" />
                    )}
                    <span>Se connecter & Se mettre en ligne</span>
                  </button>
                </form>
              </div>
            ) : (
              /* REGISTRATION & UBER-STYLE ONBOARDING FORM (WITH FORMALITIES) */
              <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase italic tracking-wider text-white">Dossier d'inscription Livreur</h3>
                  <button 
                    onClick={() => setIsRegistering(false)}
                    className="text-xs font-bold text-[#FF5C00] hover:underline cursor-pointer"
                  >
                    Déjà inscrit ? Connexion →
                  </button>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Basic Info Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Nom complet</label>
                      <input 
                        type="text" 
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Jean Dupont"
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-[#FF5C00]/50 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Numéro de Téléphone</label>
                      <input 
                        type="tel" 
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="06 12 34 56 78"
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-[#FF5C00]/50 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Adresse Email</label>
                      <input 
                        type="email" 
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="jean.dupont@email.com"
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-[#FF5C00]/50 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Mot de passe</label>
                      <input 
                        type="password" 
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-[#FF5C00]/50 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Vehicle selection */}
                  <div className="space-y-2">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Type de Véhicule de livraison</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'Velo', label: 'Vélo Électrique', icon: Bike },
                        { key: 'Scooter', label: 'Scooter', icon: Truck },
                        { key: 'Voiture', label: 'Voiture', icon: Car }
                      ].map((veh) => {
                        const Icon = veh.icon;
                        return (
                          <button
                            key={veh.key}
                            type="button"
                            onClick={() => setRegVehicle(veh.key as any)}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                              regVehicle === veh.key
                                ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-white'
                                : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                            }`}
                          >
                            <Icon size={16} className={regVehicle === veh.key ? 'text-[#FF5C00]' : ''} />
                            <span className="text-[9px] font-black uppercase tracking-wider">{veh.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Formalities Section - SIRET & PERMIS */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-4">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-[#FF5C00]" />
                      <span>Formalités Légales & Professionnelles</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Extrait SIRET Micro-entreprise</label>
                          <span className="text-[8px] text-[#FF5C00] font-bold font-mono">REQUIS (KBIS)</span>
                        </div>
                        <input 
                          type="text" 
                          required
                          value={regSiret}
                          onChange={(e) => setRegSiret(e.target.value)}
                          placeholder="834 891 024 00018"
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Numéro Permis de conduire</label>
                          <span className="text-[8px] text-zinc-500 font-mono">SI MOTORISÉ</span>
                        </div>
                        <input 
                          type="text" 
                          disabled={regVehicle === 'Velo'}
                          required={regVehicle !== 'Velo'}
                          value={regLicense}
                          onChange={(e) => setRegLicense(e.target.value)}
                          placeholder={regVehicle === 'Velo' ? 'Non requis pour vélo' : '12AB34567'}
                          className="w-full bg-zinc-900 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none font-mono disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Simulated Document Upload UI */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {/* Identity doc */}
                      <div className="relative group">
                        <div className="p-4 rounded-xl border border-dashed border-white/10 hover:border-[#FF5C00]/30 transition-all text-center bg-zinc-900 cursor-pointer">
                          <UploadCloud size={18} className="mx-auto text-zinc-500 group-hover:text-[#FF5C00] mb-1" />
                          <span className="block text-[8px] font-black uppercase text-zinc-400">Pièce d'identité (Recto/Verso)</span>
                          <span className="text-[7px] text-zinc-600 font-mono">Format PDF, PNG, JPG</span>
                          
                          {identityFileName ? (
                            <div className="mt-1 flex items-center justify-center gap-1 text-[8px] text-green-400 font-bold">
                              <Check size={10} />
                              <span className="truncate max-w-[100px]">{identityFileName}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleFileDrop('identity', 'id_passport_scan.pdf')}
                              className="mt-2 text-[8px] bg-zinc-950 hover:bg-[#FF5C00]/10 border border-white/5 text-[#FF5C00] font-black px-2 py-1 rounded transition-all uppercase"
                            >
                              Simuler l'envoi
                            </button>
                          )}
                        </div>
                      </div>

                      {/* KBIS doc */}
                      <div className="relative group">
                        <div className="p-4 rounded-xl border border-dashed border-white/10 hover:border-[#FF5C00]/30 transition-all text-center bg-zinc-900 cursor-pointer">
                          <UploadCloud size={18} className="mx-auto text-zinc-500 group-hover:text-[#FF5C00] mb-1" />
                          <span className="block text-[8px] font-black uppercase text-zinc-400">Attestation URSSAF / Extrait K-Bis</span>
                          <span className="text-[7px] text-zinc-600 font-mono">De moins de 3 mois</span>
                          
                          {kbisFileName ? (
                            <div className="mt-1 flex items-center justify-center gap-1 text-[8px] text-green-400 font-bold">
                              <Check size={10} />
                              <span className="truncate max-w-[100px]">{kbisFileName}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleFileDrop('kbis', 'attestation_urssaf_autoentrepreneur.pdf')}
                              className="mt-2 text-[8px] bg-zinc-950 hover:bg-[#FF5C00]/10 border border-white/5 text-[#FF5C00] font-black px-2 py-1 rounded transition-all uppercase"
                            >
                              Simuler l'envoi
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-[#FF5C00] hover:bg-[#FF7A00] disabled:bg-zinc-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="animate-spin" size={13} />
                    ) : (
                      <ShieldCheck size={14} />
                    )}
                    <span>Soumettre mon dossier & Devenir Livreur</span>
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      ) : (
        
        /* SCENARIO 2: COURIER IS AUTHENTICATED / ACTIVE HOME DASHBOARD */
        <div className="space-y-6">
          
          {/* Active Courier Quick Status Bar */}
          <div className="bg-[#0C0C0E] border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3.5 w-full md:w-auto">
              {/* Profile Image avatar */}
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center font-black text-lg text-white font-mono relative">
                {currentCourier.name.charAt(0)}
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0C0C0E] ${
                  currentCourier.status === 'offline' ? 'bg-zinc-500' : 'bg-green-500'
                }`}></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white">{currentCourier.name}</span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    <Star size={11} fill="currentColor" />
                    <span className="text-[10px] font-black font-mono">{currentCourier.rating || '5.0'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono uppercase font-bold mt-0.5">
                  <span>{currentCourier.vehicle === 'Velo' ? '🚴 Vélo Élec' : currentCourier.vehicle === 'Scooter' ? '🛵 Scooter' : '🚗 Voiture'}</span>
                  <span>•</span>
                  <span>SIRET: {currentCourier.siret?.slice(0, 14)}</span>
                </div>
              </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-3 gap-2.5 w-full md:w-auto flex-1 max-w-sm">
              <div className="bg-zinc-950 border border-white/5 rounded-2xl p-3 text-center">
                <span className="block text-[8px] text-zinc-500 font-black uppercase font-mono">Livrées</span>
                <span className="text-sm font-black font-mono text-white">{earningsStats.completedCount}</span>
              </div>
              <div className="bg-zinc-950 border border-white/5 rounded-2xl p-3 text-center">
                <span className="block text-[8px] text-zinc-500 font-black uppercase font-mono">Gains Course</span>
                <span className="text-sm font-black font-mono text-green-400">{(earningsStats.totalEarnings).toFixed(2)}€</span>
              </div>
              <div className="bg-zinc-950 border border-white/5 rounded-2xl p-3 text-center">
                <span className="block text-[8px] text-zinc-500 font-black uppercase font-mono">Pourboires</span>
                <span className="text-sm font-black font-mono text-green-400">{(earningsStats.tipsEarned).toFixed(2)}€</span>
              </div>
            </div>

            {/* Online / Offline switch */}
            <div className="w-full md:w-auto flex items-center justify-end">
              <button
                onClick={toggleOnlineStatus}
                className={`w-full md:w-auto px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  currentCourier.status === 'offline'
                    ? 'bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400'
                    : 'bg-green-500/10 border border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                }`}
              >
                {currentCourier.status === 'offline' ? 'Se mettre EN LIGNE' : '🟢 EN LIGNE (RECEVOIR)'}
              </button>
            </div>
          </div>

          {/* WARNING STATS IF OFFLINE */}
          {currentCourier.status === 'offline' && (
            <div className="bg-[#FF5C00]/5 border border-[#FF5C00]/25 rounded-3xl p-6 text-center space-y-2">
              <AlertCircle size={24} className="mx-auto text-[#FF5C00]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-[#FF5C00] font-mono">Vous êtes hors-ligne</h4>
              <p className="text-[11px] text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Passez en ligne pour recevoir des offres de livraison en temps réel émises par les clients qui achètent des plats en direct sur FIDFUD.
              </p>
            </div>
          )}

          {/* ACTIVE DISPATCHER & DELIVERY MANAGEMENT WORKFLOW */}
          {currentCourier.status !== 'offline' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* LEFT SIDE: AVAILABLE INCOMING ORDERS (DISPATCH RADAR) */}
              <div className="md:col-span-6 bg-[#0C0C0E] border border-white/5 rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-widest font-mono text-zinc-400 flex items-center gap-1.5">
                    <Bell size={13} className="text-[#FF5C00] animate-pulse" />
                    <span>Offres de courses de livraison</span>
                  </h3>
                  <span className="bg-[#FF5C00]/10 text-[#FF5C00] text-[8px] font-mono font-black px-2 py-0.5 rounded border border-[#FF5C00]/20 animate-pulse">
                    FidFud Radar Live
                  </span>
                </div>

                {availableOrders.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 mx-auto flex items-center justify-center">
                      <RefreshCw className="text-zinc-600 animate-spin" size={16} />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      En attente de commandes clients...
                    </p>
                    <p className="text-[9px] text-zinc-600 leading-normal max-w-[200px] mx-auto">
                      Simulez un achat côté Client (Foodie) en livraison pour recevoir l’alerte instantanément !
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableOrders.map((ord) => (
                      <div 
                        key={ord.id}
                        className="bg-zinc-950 border border-white/5 hover:border-white/10 rounded-2xl p-4.5 space-y-3 transition-all animate-bounce-subtle"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-mono text-zinc-500 font-bold">COMMANDE {ord.id}</span>
                            <h4 className="text-xs font-black text-white uppercase mt-0.5">{ord.restaurantName}</h4>
                          </div>
                          <span className="text-xs font-mono font-black text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                            +5,90 €
                          </span>
                        </div>

                        {/* Items count summary */}
                        <div className="text-[10px] text-zinc-400">
                          <span className="font-bold">Contenu : </span>
                          <span>
                            {ord.items?.map(i => `${i.quantity}x ${i.dishName}`).join(', ') || 'Plats cuisinés'}
                          </span>
                        </div>

                        {/* Addresses info details */}
                        <div className="space-y-1 text-[9px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[#FF5C00]">🏪 RETRAIT :</span>
                            <span className="text-zinc-300">14 Rue de Charonne, Paris</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[#FF5C00]">📍 LIVRAISON :</span>
                            <span className="text-zinc-300">Client Gourmand (Paris)</span>
                          </div>
                        </div>

                        <button
                          onClick={() => acceptDelivery(ord.id)}
                          className="w-full mt-2 py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                        >
                          <Play size={10} fill="currentColor" />
                          <span>Accepter la course</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT SIDE: CURRENT ACTIVE DELIVERY (UBER STEP BY STEP TRACKING) */}
              <div className="md:col-span-6 bg-[#0C0C0E] border border-white/5 rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-widest font-mono text-zinc-400 flex items-center gap-1.5">
                    <Navigation size={13} className="text-[#FF5C00]" />
                    <span>Course de livraison en cours</span>
                  </h3>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                    activeDelivery 
                      ? 'bg-[#FF5C00]/10 text-[#FF5C00] border-[#FF5C00]/20 animate-pulse'
                      : 'bg-zinc-900 text-zinc-600 border-white/5'
                  }`}>
                    {activeDelivery ? 'ACTIVE' : 'AUCUNE'}
                  </span>
                </div>

                {!activeDelivery ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 mx-auto flex items-center justify-center text-zinc-600">
                      <ShoppingBag size={18} />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Aucune livraison active.
                    </p>
                    <p className="text-[9px] text-zinc-600 max-w-[200px] mx-auto">
                      Acceptez une offre de course sur le panneau de gauche pour démarrer le simulateur de livraison.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Customer & Restaurant info card */}
                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-3.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-[#FF5C00] font-black uppercase">
                          SUIVI COMMANDE : {activeDelivery.id}
                        </span>
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold font-mono px-2 py-0.5 rounded border border-amber-500/20">
                          {activeDelivery.courierStatus === 'assigned' && 'Assignée'}
                          {activeDelivery.courierStatus === 'at_restaurant' && 'Arrivé au resto'}
                          {activeDelivery.courierStatus === 'en_route' && 'En Livraison'}
                        </span>
                      </div>

                      {/* Items details block */}
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 font-mono">Plats à récupérer :</p>
                        <div className="bg-zinc-900 border border-white/5 rounded-xl p-2.5 text-xs text-zinc-300 font-mono space-y-1">
                          {activeDelivery.items?.map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                              <span>• {item.dishName}</span>
                              <span className="text-zinc-500">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* step-by-step route summary */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-start gap-2 text-xs">
                          <div className="w-5 h-5 rounded-full bg-zinc-900 border border-white/10 text-[9px] font-bold text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">A</div>
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase font-mono">Restaurant (Départ)</p>
                            <p className="text-xs text-white font-bold">{activeDelivery.restaurantName}</p>
                            <p className="text-[9px] text-zinc-500 font-mono">14 Rue de Charonne, Paris 11e</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-xs">
                          <div className="w-5 h-5 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-[9px] font-bold text-[#FF5C00] flex items-center justify-center shrink-0 mt-0.5">B</div>
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase font-mono">Client (Arrivée)</p>
                            <p className="text-xs text-white font-bold">Utilisateur Fidfud (Foodie)</p>
                            <p className="text-[9px] text-zinc-500 font-mono">75 Avenue de la République, Paris 11e</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* INTERACTIVE WORKFLOW BUTTONS */}
                    <div className="space-y-2.5">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono">Étape de livraison (Avancement) :</p>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {/* Step 1: Arrive */}
                        <button
                          onClick={() => advanceDeliveryStatus('at_restaurant')}
                          disabled={activeDelivery.courierStatus !== 'assigned'}
                          className={`p-2.5 rounded-xl border text-center font-bold text-[9px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
                            activeDelivery.courierStatus === 'assigned'
                              ? 'bg-zinc-900 border-[#FF5C00] text-[#FF5C00] hover:bg-zinc-850 cursor-pointer'
                              : activeDelivery.courierStatus !== undefined
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-zinc-950 border-white/5 text-zinc-600 disabled:opacity-50'
                          }`}
                        >
                          <MapPin size={12} />
                          <span>1. Arrivé</span>
                        </button>

                        {/* Step 2: Pick up / Left */}
                        <button
                          onClick={() => advanceDeliveryStatus('en_route')}
                          disabled={activeDelivery.courierStatus !== 'at_restaurant'}
                          className={`p-2.5 rounded-xl border text-center font-bold text-[9px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
                            activeDelivery.courierStatus === 'at_restaurant'
                              ? 'bg-zinc-900 border-[#FF5C00] text-[#FF5C00] hover:bg-zinc-850 cursor-pointer'
                              : activeDelivery.courierStatus === 'en_route' || activeDelivery.courierStatus === 'delivered'
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-zinc-950 border-white/5 text-zinc-600 disabled:opacity-50'
                          }`}
                        >
                          <Bike size={12} />
                          <span>2. Récupéré</span>
                        </button>

                        {/* Step 3: Delivered */}
                        <button
                          onClick={() => advanceDeliveryStatus('delivered')}
                          disabled={activeDelivery.courierStatus !== 'en_route'}
                          className={`p-2.5 rounded-xl border text-center font-bold text-[9px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
                            activeDelivery.courierStatus === 'en_route'
                              ? 'bg-gradient-to-r from-green-600 to-green-500 border-green-400 text-white hover:opacity-90 cursor-pointer animate-pulse'
                              : 'bg-zinc-950 border-white/5 text-zinc-600 disabled:opacity-50'
                          }`}
                        >
                          <CheckCircle size={12} />
                          <span>3. Livré !</span>
                        </button>
                      </div>
                    </div>

                    {/* LIVE SIMULATED GPS GPS CONTAINER */}
                    {activeDelivery.courierStatus === 'en_route' && (
                      <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4.5 space-y-3.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-[#FF5C00] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                            <Navigation size={10} className="animate-bounce" />
                            <span>GPS Trajet Actif</span>
                          </span>
                          <span className="text-zinc-400">{simulatedDistance} km restants ({simulatedTimeLeft} min)</span>
                        </div>

                        {/* GPS Visual Road animation line wrapper */}
                        <div className="relative h-20 bg-zinc-900 border border-white/5 rounded-xl overflow-hidden flex items-center px-4">
                          
                          {/* Dotted pathway */}
                          <div className="absolute left-6 right-6 h-0.5 border-t-2 border-dashed border-white/20"></div>
                          
                          {/* Colored path progress */}
                          <div 
                            className="absolute left-6 h-0.5 bg-gradient-to-r from-[#FF5C00] to-[#FF7A00] transition-all duration-1000"
                            style={{ width: `calc(${gpsProgress}% - 12px)` }}
                          ></div>

                          {/* Pin A (Resto) */}
                          <div className="absolute left-6 z-10 -translate-x-1/2 flex flex-col items-center">
                            <span className="w-4 h-4 rounded-full bg-zinc-950 border-2 border-white text-[8px] font-bold text-zinc-400 flex items-center justify-center">A</span>
                            <span className="text-[7px] text-zinc-500 font-mono mt-1 font-black">Resto</span>
                          </div>

                          {/* Pin B (Client) */}
                          <div className="absolute right-6 z-10 translate-x-1/2 flex flex-col items-center">
                            <span className="w-4 h-4 rounded-full bg-zinc-950 border-2 border-[#FF5C00] text-[8px] font-bold text-[#FF5C00] flex items-center justify-center">B</span>
                            <span className="text-[7px] text-[#FF5C00] font-mono mt-1 font-black">Gourmet</span>
                          </div>

                          {/* Moving courier marker */}
                          <div 
                            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 top-1/2 transition-all duration-1000 flex flex-col items-center"
                            style={{ left: `calc(1.5rem + (100% - 3rem) * (${gpsProgress} / 100))` }}
                          >
                            <div className="p-1.5 rounded-full bg-[#FF5C00] border-2 border-white text-white shadow-lg animate-bounce">
                              <Bike size={11} />
                            </div>
                            <span className="text-[7px] text-green-400 font-bold font-mono mt-0.5 bg-[#FF5C00]/10 border border-[#FF5C00]/25 px-1 rounded">
                              {gpsProgress}%
                            </span>
                          </div>
                        </div>

                        {/* Teleport cheat button to save time on test-run */}
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[8px] text-zinc-600 font-mono">SIMULATION GPS : Vitesse moy. {simulatedSpeed} km/h</span>
                          <button
                            onClick={teleportDelivery}
                            className="text-[9px] bg-zinc-900 hover:bg-white/5 border border-white/5 text-[#FF5C00] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                            title="Arriver directement devant chez le client"
                          >
                            <span>⚡ Cheat : Téléporter</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
