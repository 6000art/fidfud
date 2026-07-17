import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  Clock, 
  Truck, 
  ShoppingBag, 
  ShieldCheck, 
  Copy, 
  Sparkles, 
  Coins, 
  Award, 
  Gift, 
  Check 
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Order, Restaurant } from '../types';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface OrdersHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  user?: any;
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
}

const REWARDS_CATALOG = [
  {
    id: 'free-delivery',
    title: 'Frais de Service Offerts',
    cost: 60,
    description: 'Supprime les 0,99 € de frais sur votre panier en cours.',
    icon: '🛵'
  },
  {
    id: 'free-drink',
    title: 'Une Boisson Offerte',
    cost: 80,
    description: 'Une boisson fraîche au choix offerte par le restaurant.',
    icon: '🥤'
  },
  {
    id: '10-percent',
    title: 'Remise Spéciale -10%',
    cost: 100,
    description: 'Bénéficiez de 10% de réduction sur tout votre panier.',
    icon: '⚡'
  },
  {
    id: 'free-dessert',
    title: 'Un Dessert Offert',
    cost: 150,
    description: 'Un délicieux dessert sucré de votre choix offert.',
    icon: '🍰'
  }
];

const OrderStepTracker = ({ status, deliveryType }: { status: string; deliveryType: string }) => {
  const stepsList = [
    { label: 'Reçue', desc: 'Commande placée', icon: '📝', key: 'pending' },
    { label: 'Cuisine', desc: 'Préparation', icon: '🍳', key: 'preparing' },
    { 
      label: deliveryType === 'click_and_collect' ? 'Prêt' : 'En route', 
      desc: deliveryType === 'click_and_collect' ? 'À récupérer' : 'En chemin', 
      icon: deliveryType === 'click_and_collect' ? '📦' : '🛵', 
      key: 'ready' 
    },
    { label: 'Livrée', desc: 'Dégustez !', icon: '✨', key: 'delivered' }
  ];

  const getActiveStepIndex = () => {
    switch (status) {
      case 'pending': return 0;
      case 'preparing': return 1;
      case 'ready': return 2;
      case 'delivered': return 3;
      default: return -1;
    }
  };

  const activeIndex = getActiveStepIndex();

  return (
    <div className="py-2 px-1 bg-zinc-950/45 rounded-xl border border-white/5 space-y-2.5">
      <p className="text-[8.5px] text-zinc-500 uppercase tracking-widest font-black font-sans px-1">Progression de la commande</p>
      
      <div className="relative flex justify-between items-start px-1.5">
        {/* Horizontal background bar */}
        <div className="absolute top-3.5 left-4 right-4 h-[1.5px] bg-zinc-800 z-0" />
        
        {/* Horizontal fill bar */}
        <div 
          className="absolute top-3.5 left-4 h-[1.5px] bg-[#FF5C00] z-0 transition-all duration-1000"
          style={{ 
            width: activeIndex === -1 ? '0%' : `${(activeIndex / (stepsList.length - 1)) * 90}%` 
          }}
        />

        {stepsList.map((step, idx) => {
          const isCompleted = idx <= activeIndex;
          const isActive = idx === activeIndex;
          
          return (
            <div key={idx} className="flex flex-col items-center text-center z-10 relative w-1/4">
              {/* Outer Indicator circle */}
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center border text-[11px] transition-all duration-300 ${
                  isActive 
                    ? 'bg-[#FF5C00] border-[#FF5C00] text-white scale-110 shadow-[0_0_8px_rgba(255,92,0,0.5)] font-bold' 
                    : isCompleted 
                      ? 'bg-zinc-900 border-[#FF5C00] text-[#FF5C00]' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                }`}
              >
                {step.icon}
              </div>
              
              {/* Text label */}
              <span className={`text-[7.5px] font-black uppercase mt-1 tracking-wider ${
                isActive ? 'text-[#FF5C00]' : isCompleted ? 'text-zinc-300' : 'text-zinc-600'
              }`}>
                {step.label}
              </span>
              
              {/* Desc */}
              <span className="text-[6px] text-zinc-500 font-sans truncate max-w-full block">
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function Polyline({ path }: { path: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).google) return;
    const polyline = new (window as any).google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#FF5C00',
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });
    polyline.setMap(map);
    return () => polyline.setMap(null);
  }, [map, path]);
  return null;
}

function MapController({ 
  restCoords, 
  userCoords, 
  courierCoords 
}: { 
  restCoords: { lat: number; lng: number }; 
  userCoords: { lat: number; lng: number }; 
  courierCoords?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || typeof window === 'undefined' || !(window as any).google) return;
    const bounds = new (window as any).google.maps.LatLngBounds();
    bounds.extend(restCoords);
    bounds.extend(userCoords);
    if (courierCoords) {
      bounds.extend(courierCoords);
    }
    map.fitBounds(bounds);
    
    const listener = (window as any).google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom > 15) {
        map.setZoom(15);
      }
    });
    return () => {
      if ((window as any).google) {
        (window as any).google.maps.event.removeListener(listener);
      }
    };
  }, [map, restCoords, userCoords, courierCoords?.lat, courierCoords?.lng]);
  return null;
}

const MapRoutePreview = ({ 
  order, 
  restaurants, 
  userLocation 
}: { 
  order: Order; 
  restaurants: Restaurant[]; 
  userLocation?: { lat: number; lng: number } | null;
}) => {
  const [liveOrder, setLiveOrder] = useState<Order>(order);
  const [courierDetails, setCourierDetails] = useState<{ vehicle?: string; rating?: string; phone?: string } | null>(null);
  const [courierProgress, setCourierProgress] = useState(15);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  // Synchronize liveOrder state with any incoming updates from props
  useEffect(() => {
    setLiveOrder(order);
  }, [order]);

  // Periodically poll for updates on this specific order to enable live GPS tracking updates
  useEffect(() => {
    if (order.status === 'delivered' || order.status === 'cancelled') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders`);
        if (res.ok) {
          const allOrders: Order[] = await res.json();
          const updated = allOrders.find(o => o.id === order.id);
          if (updated) {
            setLiveOrder(updated);
          }
        }
      } catch (err) {
        console.error('Error polling active order tracking:', err);
      }
    }, 3000); // Check every 3 seconds for active delivery positioning

    return () => clearInterval(interval);
  }, [order.id, order.status]);

  // Fetch further Courier details (vehicle, rating) when a courier is assigned
  useEffect(() => {
    if (!liveOrder.courierId) {
      setCourierDetails(null);
      return;
    }

    const fetchCourierInfo = async () => {
      try {
        const res = await fetch('/api/couriers');
        if (res.ok) {
          const couriers: any[] = await res.json();
          const matched = couriers.find(c => c.id === liveOrder.courierId);
          if (matched) {
            setCourierDetails({
              vehicle: matched.vehicle,
              rating: matched.rating || '4.9',
              phone: matched.phone || '06 12 34 56 78'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching courier info details:', err);
      }
    };

    fetchCourierInfo();
  }, [liveOrder.courierId]);

  // Progress simulation fallback only for click & collect
  useEffect(() => {
    if (order.deliveryType !== 'click_and_collect') return;

    const timer = setInterval(() => {
      setCourierProgress(prev => {
        if (prev >= 95) return 15;
        return prev + 1;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [order.deliveryType]);

  const restaurant = restaurants.find(r => r.id === order.restaurantId);
  const isClickCollect = order.deliveryType === 'click_and_collect';

  const restLat = restaurant?.latitude || 48.8566;
  const restLng = restaurant?.longitude || 2.3522;

  const userLat = userLocation?.lat || (restLat + 0.005);
  const userLng = userLocation?.lng || (restLng + 0.007);

  const hasCourierAssigned = !isClickCollect && liveOrder.courierId;
  const hasCourierPosition = hasCourierAssigned && liveOrder.courierLat !== undefined && liveOrder.courierLng !== undefined;

  let courierLat = restLat;
  let courierLng = restLng;

  if (hasCourierPosition) {
    courierLat = liveOrder.courierLat!;
    courierLng = liveOrder.courierLng!;
  } else if (isClickCollect) {
    courierLat = restLat + (userLat - restLat) * (courierProgress / 100);
    courierLng = restLng + (userLng - restLng) * (courierProgress / 100);
  }

  const path = [
    { lat: restLat, lng: restLng },
    { lat: userLat, lng: userLng }
  ];

  const courierCoordsForMap = hasCourierPosition || isClickCollect ? { lat: courierLat, lng: courierLng } : null;

  let statusText = "En attente";
  let statusDescription = "Votre commande attend d'être validée par l'établissement.";

  if (liveOrder.status === 'preparing') {
    statusText = "En cuisine";
    statusDescription = "Le chef prépare vos succulents plats avec soin !";
  } else if (liveOrder.status === 'ready') {
    statusText = isClickCollect ? "À retirer !" : "Livraison en cours";
    statusDescription = isClickCollect 
      ? "Votre commande est prête à être récupérée au restaurant." 
      : "Le livreur a récupéré votre commande et se hâte vers vous !";
  } else if (liveOrder.status === 'delivered') {
    statusText = "Arrivé";
    statusDescription = "Commande livrée avec succès ! Profitez bien de votre repas.";
  }

  // Refine text descriptions based on courier-specific live updates
  if (!isClickCollect && liveOrder.courierId) {
    if (liveOrder.courierStatus === 'assigned') {
      statusText = "Livreur assigné";
      statusDescription = `${liveOrder.courierName} se dirige vers l'établissement pour récupérer votre commande.`;
    } else if (liveOrder.courierStatus === 'at_restaurant') {
      statusText = "Livreur au restaurant";
      statusDescription = `${liveOrder.courierName} est arrivé au restaurant et attend que vos plats soient prêts.`;
    } else if (liveOrder.courierStatus === 'en_route') {
      statusText = "En route chez vous !";
      statusDescription = `${liveOrder.courierName} a récupéré votre commande bien chaude et se dirige vers votre domicile.`;
    } else if (liveOrder.courierStatus === 'delivered') {
      statusText = "Livré";
      statusDescription = "Commande remise en main propre. Bon appétit de la part de l'équipe Fidfud !";
    }
  }

  const getVehicleEmoji = (v?: string) => {
    if (v === 'Velo') return '🚴';
    if (v === 'Scooter') return '🛵';
    if (v === 'Voiture') return '🚗';
    return '🛵';
  };

  const getVehicleLabel = (v?: string) => {
    if (v === 'Velo') return 'Vélo Électrique';
    if (v === 'Scooter') return 'Scooter';
    if (v === 'Voiture') return 'Voiture Hybride';
    return 'Coursier Partenaire';
  };

  const handleSimulateCall = () => {
    if (!liveOrder.courierName) return;
    const phone = courierDetails?.phone || '06 12 34 56 78';
    
    const callToast = document.createElement('div');
    callToast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-zinc-950 text-white px-5 py-4 rounded-2xl font-sans text-xs tracking-wide shadow-2xl flex flex-col gap-2 border border-green-500/30 animate-fadeIn w-80 max-w-[90%]';
    callToast.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 animate-pulse text-lg">📞</div>
        <div>
          <p class="font-black text-white uppercase text-[10px]">Appel Sortant (Simulation)</p>
          <p class="text-zinc-400 text-[9px] font-mono mt-0.5">${liveOrder.courierName} • ${phone}</p>
        </div>
      </div>
      <p class="text-[9.5px] text-zinc-400 leading-relaxed mt-1">« Allô ? Oui bonjour, c'est votre livreur Fidfud ! Je suis actuellement en chemin avec votre commande bien chaude et j'arrive d'ici quelques minutes ! »</p>
      <button id="btn-mock-call-hangup" class="mt-1.5 w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase rounded-lg tracking-wider transition-colors" onclick="this.parentElement.remove()">Raccrocher</button>
    `;
    document.body.appendChild(callToast);
  };

  if (!hasValidKey) {
    // Compute progress % between 25% and 80% on our SVG line
    const totalLatDiff = userLat - restLat;
    const totalLngDiff = userLng - restLng;
    let computedProgress = 25;
    if (liveOrder.courierStatus === 'at_restaurant') {
      computedProgress = 25;
    } else if (liveOrder.courierStatus === 'en_route') {
      if (Math.abs(totalLatDiff) > 0.0001 || Math.abs(totalLngDiff) > 0.0001) {
        const courierLatDiff = (liveOrder.courierLat || restLat) - restLat;
        const courierLngDiff = (liveOrder.courierLng || restLng) - restLng;
        const dotProduct = (courierLatDiff * totalLatDiff) + (courierLngDiff * totalLngDiff);
        const pathLenSq = (totalLatDiff * totalLatDiff) + (totalLngDiff * totalLngDiff);
        computedProgress = Math.max(25, Math.min(80, 25 + Math.round((dotProduct / pathLenSq) * 55)));
      } else {
        computedProgress = 25 + (courierProgress * 0.55);
      }
    } else if (liveOrder.courierStatus === 'delivered' || liveOrder.status === 'delivered') {
      computedProgress = 80;
    }

    const estimatedRemainingDist = liveOrder.status === 'delivered' ? '0.0 km' : `${Math.max(0, parseFloat((2.4 * (1 - (computedProgress - 25) / 55)).toFixed(1)))} km`;
    const estimatedTimeLeft = liveOrder.status === 'delivered' ? '0 min' : `${Math.max(0, Math.ceil(8 * (1 - (computedProgress - 25) / 55)))} min`;

    return (
      <div className="bg-zinc-950/80 border border-white/5 rounded-xl overflow-hidden p-2.5 space-y-2.5">
        <div className="flex items-center justify-between text-[8px] font-sans">
          <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
            📍 Suivi temps réel (Simulateur Virtuel)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetupInstructions(!showSetupInstructions)}
              className="text-zinc-400 hover:text-[#FF5C00] font-bold uppercase tracking-widest text-[7.5px] cursor-pointer"
            >
              {showSetupInstructions ? "Voir le traceur radar 📡" : "🔑 Clé Google Maps ?"}
            </button>
            <span className="text-[#FF5C00] font-black font-mono animate-pulse uppercase">
              {statusText}
            </span>
          </div>
        </div>

        {showSetupInstructions ? (
          <div className="bg-zinc-950/95 border border-[#FF5C00]/25 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-500 font-black uppercase tracking-wider text-[10px]">
              ⚠️ Google Maps API Key Requis
            </div>
            <p className="text-zinc-400 text-[10px] leading-relaxed">
              Le suivi de livraison en direct sur une vraie carte interactive nécessite une clé API Google Maps configurée dans AI Studio.
            </p>
            <div className="bg-[#050505] p-2.5 rounded-lg border border-white/5 space-y-1 text-[9px] text-zinc-500 leading-relaxed font-mono">
              <p><strong>Étape 1 :</strong> Récupérez une clé sur Google Cloud Console.</p>
              <p><strong>Étape 2 :</strong> Allez dans <strong>Settings</strong> (⚙️ en haut à droite) &rarr; <strong>Secrets</strong> &rarr; ajoutez <code>GOOGLE_MAPS_PLATFORM_KEY</code>.</p>
            </div>
            <button
              onClick={() => setShowSetupInstructions(false)}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-zinc-300 cursor-pointer"
            >
              Retour au traceur radar
            </button>
          </div>
        ) : (
          <div className="relative h-44 bg-[#0a0a0c] border border-white/5 rounded-lg overflow-hidden flex flex-col justify-between p-3 select-none">
            {/* SVG Interactive radar map with moving courier emoji */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_14px]"></div>
            
            {/* Ambient circular pulse */}
            {liveOrder.courierStatus === 'en_route' && (
              <div 
                className="absolute w-24 h-24 rounded-full bg-[#FF5C00]/5 border border-[#FF5C00]/10 animate-ping"
                style={{
                  left: `calc(${computedProgress}% - 40px)`,
                  top: '30px',
                  animationDuration: '3s'
                }}
              ></div>
            )}

            <div className="relative w-full h-full flex flex-col justify-center">
              {/* Connection vector path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Dashed line */}
                <line 
                  x1="15%" 
                  y1="50%" 
                  x2="85%" 
                  y2="50%" 
                  stroke="rgba(255,92,0,0.15)" 
                  strokeWidth="3" 
                />
                <line 
                  x1="15%" 
                  y1="50%" 
                  x2={`${computedProgress}%`} 
                  y2="50%" 
                  stroke="#FF5C00" 
                  strokeWidth="3" 
                  strokeDasharray="4 3"
                  className="animate-pulse"
                />
              </svg>

              {/* Markers */}
              <div className="absolute left-[15%] -translate-x-1/2 flex flex-col items-center">
                <span className="text-xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-pulse">🏪</span>
                <span className="text-[7px] font-black uppercase text-zinc-500 tracking-wider font-mono mt-1">Resto</span>
              </div>

              {/* Courier emoji moving */}
              {liveOrder.status !== 'delivered' && (
                <div 
                  className="absolute -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ease-in-out"
                  style={{ left: `${computedProgress}%` }}
                >
                  <span className="text-2xl filter drop-shadow-[0_4px_12px_rgba(255,92,0,0.55)] animate-bounce">
                    {liveOrder.status === 'ready' ? '🏃‍♂️' : getVehicleEmoji(courierDetails?.vehicle)}
                  </span>
                  <span className="text-[7.5px] font-black text-[#FF5C00] font-mono mt-0.5 whitespace-nowrap bg-zinc-950/90 px-1 py-0.5 rounded border border-white/5 uppercase tracking-wide">
                    {liveOrder.courierName || 'Livreur'}
                  </span>
                </div>
              )}

              <div className="absolute left-[85%] -translate-x-1/2 flex flex-col items-center">
                <span className="text-xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">🏠</span>
                <span className="text-[7px] font-black uppercase text-zinc-500 tracking-wider font-mono mt-1">Client</span>
              </div>
            </div>

            {/* Bottom HUD bar */}
            <div className="relative z-10 flex justify-between items-center bg-zinc-950/90 border border-white/5 rounded-lg px-2.5 py-1.5 text-[8.5px] font-mono text-zinc-400">
              <div className="flex items-center gap-1">
                <span className="text-[#FF5C00]">📏 Distance:</span>
                <span className="text-white font-bold">{estimatedRemainingDist}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#FF5C00]">⏱️ Temps:</span>
                <span className="text-white font-bold">{estimatedTimeLeft}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">Traceur virtuel actif</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/80 border border-white/5 rounded-xl overflow-hidden p-2.5 space-y-2.5">
      <div className="flex items-center justify-between text-[8px] font-sans">
        <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
          📍 {isClickCollect ? "Itinéraire Click & Collect" : "Suivi de livraison en direct"}
        </span>
        <span className="text-[#FF5C00] font-black font-mono animate-pulse uppercase">
          {statusText}
        </span>
      </div>

      <div className="relative h-44 bg-[#0a0a0c] border border-white/5 rounded-lg overflow-hidden">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={{ lat: (restLat + userLat) / 2, lng: (restLng + userLng) / 2 }}
            defaultZoom={14}
            mapId="DEMO_MAP_ID"
            gestureHandling="greedy"
            disableDefaultUI={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <AdvancedMarker position={{ lat: restLat, lng: restLng }} title={order.restaurantName || "Restaurant"}>
              <div 
                className="w-8 h-8 flex items-center justify-center bg-black border-2 border-[#FF5C00] rounded-full shadow-lg text-sm select-none"
                style={{ width: '32px', height: '32px' }}
              >
                🏪
              </div>
            </AdvancedMarker>

            <AdvancedMarker position={{ lat: userLat, lng: userLng }} title="Votre adresse">
              <div 
                className="w-8 h-8 flex items-center justify-center bg-black border-2 border-blue-500 rounded-full shadow-lg text-sm select-none"
                style={{ width: '32px', height: '32px' }}
              >
                🏠
              </div>
            </AdvancedMarker>

            {(hasCourierPosition || isClickCollect) && liveOrder.status !== 'delivered' && (
              <AdvancedMarker position={{ lat: courierLat, lng: courierLng }} title={isClickCollect ? "Votre trajet" : "Livreur en route"}>
                <div 
                  className="w-8 h-8 flex items-center justify-center bg-[#FF5C00] border-2 border-white rounded-full shadow-lg text-sm animate-bounce select-none"
                  style={{ width: '32px', height: '32px' }}
                >
                  {isClickCollect ? "🏃‍♂️" : getVehicleEmoji(courierDetails?.vehicle)}
                </div>
              </AdvancedMarker>
            )}

            <Polyline path={path} />
            <MapController 
              restCoords={{ lat: restLat, lng: restLng }} 
              userCoords={{ lat: userLat, lng: userLng }} 
              courierCoords={courierCoordsForMap}
            />
          </Map>
        </APIProvider>

        <div className="absolute bottom-1 right-1 bg-black/85 px-1.5 py-0.5 rounded border border-white/5 text-[7px] font-bold font-mono text-zinc-400 z-10">
          ⏱️ {liveOrder.status === 'delivered' ? 'Livré' : liveOrder.status === 'ready' ? 'Prêt pour retrait' : hasCourierPosition ? 'GPS Actif' : `ETA: ~10 min (Progression: ${courierProgress}%)`}
        </div>
      </div>

      {/* Courier details and quick actions bar */}
      {!isClickCollect && liveOrder.courierId && (
        <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-2.5 space-y-2.5 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF5C00]/20 to-[#FF5C00]/5 flex items-center justify-center border border-[#FF5C00]/25 text-base select-none">
                👨‍✈️
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-white uppercase">{liveOrder.courierName}</span>
                  <span className="text-[7.5px] bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold px-1 rounded font-mono">
                    ★ {courierDetails?.rating || '4.9'}
                  </span>
                </div>
                <p className="text-[8px] text-zinc-500 font-bold uppercase">
                  {getVehicleEmoji(courierDetails?.vehicle)} {getVehicleLabel(courierDetails?.vehicle)}
                </p>
              </div>
            </div>

            <button
              onClick={handleSimulateCall}
              className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white text-[8px] font-black uppercase rounded-lg tracking-wider transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-md"
            >
              <span>📞 Appeler</span>
            </button>
          </div>

          <div className="border-t border-white/5 pt-2 space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-zinc-400 font-black uppercase tracking-wider flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                Suivi GPS en direct
              </span>
              {hasCourierPosition && (
                <span className="text-zinc-600 font-mono text-[8px]">
                  Coords: {courierLat.toFixed(4)}, {courierLng.toFixed(4)}
                </span>
              )}
            </div>
            <p className="text-[9px] text-zinc-400 leading-relaxed italic">
              « {statusDescription} »
            </p>
          </div>
        </div>
      )}

      {/* When no courier is assigned yet */}
      {!isClickCollect && !liveOrder.courierId && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-2.5 space-y-1 font-sans text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">
              🛵 Attribution du Livreur
            </span>
            <span className="text-[#FF5C00] font-bold text-[8px] uppercase tracking-wide animate-pulse">
              {statusText}
            </span>
          </div>
          <p className="text-zinc-500 text-[9px] leading-relaxed">
            Nous recherchons actuellement le coursier Fidfud le plus proche de l'établissement pour prendre en charge vos plats.
          </p>
        </div>
      )}
    </div>
  );
};


const OrderReviewForm = ({ order, user, onReviewSubmitted }: { order: Order; user: any; onReviewSubmitted: (orderId: string, rating: number, text: string) => void }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${order.restaurantId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating,
          text: comment.trim(),
          userName: user?.name || user?.email?.split('@')[0] || "Gourmet Fidfud"
        })
      });

      if (res.ok) {
        onReviewSubmitted(order.id, rating, comment.trim());
      } else {
        const data = await res.json();
        setError(data.error || "Impossible d'envoyer l'avis.");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2.5 p-2.5 bg-zinc-950/60 border border-[#FF5C00]/15 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-zinc-300 font-extrabold uppercase tracking-wider flex items-center gap-1">
          🌟 Donner mon avis sur {order.restaurantName}
        </span>
        <span className="text-[7.5px] text-zinc-500 font-mono">Achat vérifié</span>
      </div>

      {/* Star Selector */}
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="p-0.5 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            <svg 
              className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        <span className="text-[8.5px] text-zinc-400 font-bold ml-1 uppercase">
          {rating === 5 ? 'Excellent ! 😍' : rating === 4 ? 'Très bon 🙂' : rating === 3 ? 'Correct 😐' : rating === 2 ? 'Décevant 🙁' : 'Mauvais 😡'}
        </span>
      </div>

      {/* Feedback text area */}
      <div className="space-y-1">
        <textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Rédigez votre commentaire culinaire ici..."
          className="w-full text-[10px] bg-zinc-900 border border-white/5 rounded-lg px-2 py-1.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]/40 transition-colors resize-none"
          required
        />
      </div>

      {error && <p className="text-[8px] text-red-500 font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || !comment.trim()}
        className="w-full py-1 bg-[#FF5C00] hover:bg-[#FF5C00]/90 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-[8.5px] font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.98] cursor-pointer"
      >
        {isSubmitting ? 'Publication...' : 'Publier mon avis'}
      </button>
    </form>
  );
};

export default function OrdersHistory({ isOpen, onClose, orders, user, restaurants, userLocation }: OrdersHistoryProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'loyalty'>('orders');
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [rewardClaims, setRewardClaims] = useState<any[]>([]);
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [submittedReviews, setSubmittedReviews] = useState<Record<string, { rating: number; text: string }>>({});

  // Sync state on open & user change
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchPoints();
      fetchClaims();
    }
  }, [isOpen, user?.id]);

  const fetchPoints = async () => {
    try {
      const res = await fetch(`/api/users/${user?.id}/points`);
      if (res.ok) {
        const data = await res.json();
        setPointsBalance(data.points);
      }
    } catch (err) {
      console.error('Failed to fetch points balance:', err);
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch(`/api/users/${user?.id}/rewards`);
      if (res.ok) {
        const data = await res.json();
        setRewardClaims(data);
      }
    } catch (err) {
      console.error('Failed to fetch reward claims:', err);
    }
  };

  const handleRedeemReward = async (rewardId: string, cost: number) => {
    if (pointsBalance < cost) {
      alert("Votre solde de points fidélité est insuffisant pour débloquer ce cadeau ! Regardez d'autres vidéos gourmandes pour accumuler des points.");
      return;
    }
    
    setIsRedeeming(true);
    try {
      const res = await fetch(`/api/users/${user?.id}/rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId })
      });
      if (res.ok) {
        const result = await res.json();
        
        // Custom interactive success notification
        const successToast = document.createElement('div');
        successToast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-5 py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-wider shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce';
        successToast.innerHTML = `🎁 Cadeau débloqué ! Utilisez le code: <strong>${result.claim.code}</strong>`;
        document.body.appendChild(successToast);
        setTimeout(() => successToast.remove(), 4000);

        fetchPoints();
        fetchClaims();
      } else {
        const errData = await res.json();
        alert(errData.error || "Erreur lors de l'échange de points.");
      }
    } catch (err) {
      console.error('Failed to redeem reward:', err);
      alert("Impossible de joindre le serveur de fidélité Fidfud.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  // Filter orders relevant to this user if logged in
  const userOrders = user 
    ? orders.filter(o => o.userId === user.id) 
    : orders; // fallback to all for simplicity or testing

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/85 backdrop-blur-sm transition-opacity duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Panel Container */}
      <div className="relative w-full max-w-md h-full bg-[#0D0D0E]/95 backdrop-blur-md border-l border-white/5 shadow-2xl flex flex-col z-10 transition-transform duration-300 transform translate-x-0">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#050505]">
          <div className="flex items-center space-x-2">
            <Clock size={18} className="text-[#FF5C00]" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Espace Client</h3>
          </div>
          <button 
            id="btn-close-orders-history"
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dual Tab Switcher */}
        <div className="grid grid-cols-2 bg-[#050505] border-b border-white/5 p-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
              activeTab === 'orders' 
                ? 'bg-zinc-900 text-[#FF5C00] shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🛍️ Mes Commandes
          </button>
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`py-3 text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'loyalty' 
                ? 'bg-zinc-900 text-amber-400 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles size={11} className={activeTab === 'loyalty' ? 'text-amber-400' : 'text-zinc-500'} />
            <span>Club Fidélité</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: ORDERS LIST */}
          {activeTab === 'orders' && (
            userOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="p-4 rounded-full bg-zinc-900/60 text-zinc-500 mb-4 border border-white/5">
                  <ShoppingBag size={36} className="stroke-[1.5]" />
                </div>
                <h4 className="text-white font-black uppercase text-sm mb-1 italic">Aucune commande en cours</h4>
                <p className="text-zinc-500 text-xs max-w-xs leading-relaxed font-sans">
                  Vous n'avez pas encore passé de commande culinaire. Ouvrez les détails d'un plat sur le feed pour commander !
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map(order => {
                  const isPending = order.status === 'pending';
                  const isPreparing = order.status === 'preparing';
                  const isReady = order.status === 'ready';
                  const isDelivered = order.status === 'delivered';
                  const isCancelled = order.status === 'cancelled';

                  // Status Badge styling
                  let statusText = 'En attente d’acceptation';
                  let statusColor = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
                  if (isPreparing) {
                    statusText = 'En préparation en cuisine 🍳';
                    statusColor = 'text-[#FF5C00] bg-[#FF5C00]/10 border-[#FF5C00]/20';
                  } else if (isReady) {
                    statusText = order.deliveryType === 'click_and_collect' ? 'Prêt pour retrait express ! 🏃‍♂️' : 'Prêt ! En cours de livraison 🛵';
                    statusColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
                  } else if (isDelivered) {
                    statusText = 'Commande livrée / récupérée ✔';
                    statusColor = 'text-green-500 bg-green-500/10 border-green-500/20';
                  } else if (isCancelled) {
                    statusText = 'Commande annulée';
                    statusColor = 'text-red-500 bg-red-500/10 border-red-500/20';
                  }

                  return (
                    <div key={order.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3.5 hover:border-white/10 transition-colors">
                      
                      {/* Header bar of order */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black font-sans">Restaurant</p>
                          <p className="text-sm font-black text-white uppercase italic">{order.restaurantName}</p>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500 font-bold">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className={`p-2 rounded-xl text-xs font-black border text-center uppercase tracking-wide ${statusColor}`}>
                        {statusText}
                      </div>

                      {/* Step-based Progress Tracker */}
                      {!isCancelled && (
                        <OrderStepTracker status={order.status} deliveryType={order.deliveryType} />
                      )}

                      {/* Map preview with estimated route (Active orders only) */}
                      {!isCancelled && !isDelivered && (
                        <MapRoutePreview 
                          order={order}
                          restaurants={restaurants}
                          userLocation={userLocation}
                        />
                      )}

                      {/* Order items listing */}
                      <div className="divide-y divide-zinc-900/50 pt-2 space-y-1">
                        {order.items?.map(item => (
                          <div key={item.id} className="flex justify-between text-xs text-zinc-400 py-1">
                            <span>
                              <strong className="text-zinc-200 font-bold">x{item.quantity}</strong> {item.dishName}
                            </span>
                            <span className="font-mono text-zinc-500">{(item.price * item.quantity).toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>

                      {/* Total financial sum */}
                      <div className="border-t border-zinc-900 pt-2.5 flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-medium">Total payé (Stripe)</span>
                        <span className="text-white font-extrabold text-sm">{order.totalAmount.toFixed(2)} €</span>
                      </div>

                      {/* Feedback Rating & Comment (Only for delivered/completed orders) */}
                      {isDelivered && (
                        submittedReviews[order.id] ? (
                          <div className="mt-2.5 p-2.5 bg-green-500/5 border border-green-500/10 rounded-xl text-[10px] space-y-1.5 animate-fadeIn">
                            <div className="flex items-center justify-between text-green-400 font-extrabold uppercase text-[9px] tracking-wider">
                              <span>✓ Avis envoyé avec succès</span>
                              <span className="text-zinc-500 text-[8px] font-mono font-normal">Achat vérifié</span>
                            </div>
                            <p className="text-zinc-300 italic font-sans">"{submittedReviews[order.id].text}"</p>
                            <div className="flex items-center space-x-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg 
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < submittedReviews[order.id].rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-800'}`} 
                                  viewBox="0 0 20 20" 
                                  fill="currentColor"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <OrderReviewForm 
                            order={order} 
                            user={user} 
                            onReviewSubmitted={(orderId, rat, txt) => {
                              setSubmittedReviews(prev => ({
                                ...prev,
                                [orderId]: { rating: rat, text: txt }
                              }));
                            }} 
                          />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: LOYALTY CLUB & REWARDS */}
          {activeTab === 'loyalty' && (
            !user ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <div className="p-4 rounded-full bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/20">
                  <Award size={36} className="stroke-[1.5]" />
                </div>
                <h4 className="text-white font-black uppercase text-sm mb-1 italic">Mode Invité</h4>
                <p className="text-zinc-500 text-xs max-w-xs leading-relaxed font-sans mb-4">
                  Connectez-vous ou créez un compte Fidfud pour accéder à notre Club Fidélité exclusif, accumuler des points en regardant des vidéos, et gagner des cadeaux !
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Points Balance Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#16161a] to-[#251f18] border border-amber-500/20 p-5 space-y-2 shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-zinc-400 text-[10px] font-black uppercase tracking-wider font-mono">
                      <Coins size={12} className="text-amber-400 animate-bounce" />
                      <span>Points Accumulés</span>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold px-2 py-0.5 rounded-full">
                      Club Gourmet
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-amber-400 font-sans tracking-tight">
                      {pointsBalance}
                    </span>
                    <span className="text-zinc-400 text-xs font-semibold">Points Fidfud</span>
                  </div>

                  <p className="text-zinc-500 text-[11px] font-sans leading-relaxed">
                    ✨ Regardez des vidéos culinaires pendant au moins 5 secondes pour réclamer <strong>+15 points</strong> à chaque visionnage !
                  </p>
                </div>

                {/* Redeemable Rewards Catalog */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5 font-mono">
                    <Gift size={13} className="text-[#FF5C00]" />
                    <span>Échanger mes Points Fidélité</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-2.5">
                    {REWARDS_CATALOG.map(item => {
                      const canAfford = pointsBalance >= item.cost;
                      return (
                        <div 
                          key={item.id} 
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                            canAfford 
                              ? 'bg-zinc-900/60 border-white/5 hover:border-white/10' 
                              : 'bg-zinc-900/20 border-white/2 opacity-60'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-2xl mt-0.5 filter drop-shadow-md">{item.icon}</span>
                            <div>
                              <p className="text-xs font-black text-white">{item.title}</p>
                              <p className="text-[10px] text-zinc-500 font-sans mt-0.5 max-w-[200px] leading-tight">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <button
                            disabled={!canAfford || isRedeeming}
                            onClick={() => handleRedeemReward(item.id, item.cost)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                              canAfford 
                                ? 'bg-amber-400 hover:bg-amber-500 text-zinc-950 shadow-md active:scale-95' 
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                          >
                            <span>{item.cost} Pts</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active claimed Coupon Codes */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5 font-mono">
                    <Award size={13} className="text-green-500" />
                    <span>Mes Bons Disponibles ({rewardClaims.filter(c => !c.isUsed).length})</span>
                  </h4>

                  {rewardClaims.filter(c => !c.isUsed).length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-white/5 bg-zinc-900/20 text-center text-[11px] text-zinc-600 italic font-sans">
                      Aucun code de réduction actif. Convertissez vos points ci-dessus pour générer un code promo !
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rewardClaims.filter(c => !c.isUsed).map(claim => {
                        const isCopied = copiedCode === claim.code;
                        const catalogItem = REWARDS_CATALOG.find(rc => claim.rewardId.includes(rc.id));
                        
                        return (
                          <div 
                            key={claim.id} 
                            className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-black text-zinc-200">
                                {catalogItem?.title || 'Cadeau Fidélité'}
                              </p>
                              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                                Obtenu le {new Date(claim.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <button
                              onClick={() => handleCopyCode(claim.code)}
                              className="flex items-center space-x-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs text-white font-extrabold px-3 py-1.5 rounded-lg font-mono transition-all cursor-pointer hover:border-[#FF5C00]"
                              title="Copier le code de réduction"
                            >
                              <span className="text-zinc-300 tracking-wide text-[10px]">{claim.code}</span>
                              {isCopied ? (
                                <Check size={11} className="text-green-500" />
                              ) : (
                                <Copy size={11} className="text-zinc-500" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Used historic claims */}
                {rewardClaims.filter(c => c.isUsed).length > 0 && (
                  <div className="space-y-2 pt-2 opacity-50">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider font-mono">Historique des cadeaux utilisés ({rewardClaims.filter(c => c.isUsed).length})</p>
                    <div className="space-y-1.5">
                      {rewardClaims.filter(c => c.isUsed).map(claim => (
                        <div key={claim.id} className="text-[10px] text-zinc-500 flex justify-between font-mono bg-zinc-950 p-2 rounded-lg border border-white/2">
                          <span>{REWARDS_CATALOG.find(rc => claim.rewardId.includes(rc.id))?.title || 'Avantage utilisé'}</span>
                          <span className="line-through">{claim.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
}
