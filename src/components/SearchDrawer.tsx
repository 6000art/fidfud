import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, X, Flame, Compass, UtensilsCrossed, Store, ArrowRight, 
  Map, Sliders, Mic, Sparkles, Globe, RefreshCw, Check, Navigation, AlertCircle 
} from 'lucide-react';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  isLocating: boolean;
  onDetectLocation: () => void;
  restaurants?: any[];
  dishes?: any[];
  isProximityFirst?: boolean;
  setIsProximityFirst?: (val: boolean) => void;
  feedSortOrder?: 'recent' | 'oldest' | 'likes' | 'distance';
  setFeedSortOrder?: (val: 'recent' | 'oldest' | 'likes' | 'distance') => void;
}

const FRENCH_CITIES = [
  { name: 'Paris', region: 'Île-de-France', lat: 48.8566, lng: 2.3522 },
  { name: 'Lyon', region: 'Rhône-Alpes', lat: 45.7640, lng: 4.8357 },
  { name: 'Marseille', region: 'PACA', lat: 43.2965, lng: 5.3698 },
  { name: 'Bordeaux', region: 'Aquitaine', lat: 44.8378, lng: -0.5791 },
  { name: 'Nice', region: 'Côte d\'Azur', lat: 43.7102, lng: 7.2620 },
  { name: 'Lille', region: 'Nord', lat: 50.6292, lng: 3.0573 },
  { name: 'Toulouse', region: 'Occitanie', lat: 43.6047, lng: 1.4442 },
  { name: 'Nantes', region: 'Pays de la Loire', lat: 47.2184, lng: -1.5536 },
  { name: 'Strasbourg', region: 'Grand Est', lat: 48.5734, lng: 7.7521 },
  { name: 'Montpellier', region: 'Occitanie', lat: 43.6108, lng: 3.8767 },
  { name: 'Rennes', region: 'Bretagne', lat: 48.1173, lng: -1.6778 },
  { name: 'Reims', region: 'Grand Est', lat: 49.2583, lng: 4.0317 },
  { name: 'Grenoble', region: 'Rhône-Alpes', lat: 45.1885, lng: 5.7245 },
  { name: 'Rouen', region: 'Normandie', lat: 49.4431, lng: 1.0993 },
  { name: 'Toulon', region: 'PACA', lat: 43.1242, lng: 5.9280 }
];

const SPECIALTIES = [
  { id: 'Italien', label: 'Italien / Pizza', emoji: '🇮🇹' },
  { id: 'Japonais', label: 'Japonais / Sushi', emoji: '🇯🇵' },
  { id: 'Burgers', label: 'Burgers & Street', emoji: '🍔' },
  { id: 'Français', label: 'Français traditionnel', emoji: '🇫🇷' },
  { id: 'Café', label: 'Café / Brunch', emoji: '☕' },
  { id: 'Tex-Mex', label: 'Tex-Mex / Tacos', emoji: '🇲🇽' },
  { id: 'Indien', label: 'Indien / Curry', emoji: '🇮🇳' },
  { id: 'Vietnamien', label: 'Vietnamien / Phô', emoji: '🇻🇳' },
  { id: 'Libanais', label: 'Libanais / Mezze', emoji: '🇱🇧' },
  { id: 'Thaïlandais', label: 'Thaï / Pad Thaï', emoji: '🇹🇭' },
  { id: 'Sucré', label: 'Desserts / Sucré', emoji: '🧇' }
];

const FALLBACK_DISHES = [
  { name: 'Pizza Truffe & Stracciatella', category: 'Italien' },
  { name: 'California Fresh Salmon Roll', category: 'Japonais' },
  { name: 'Double Smash Beef Cheese', category: 'Burgers' },
  { name: 'Tonkotsu Ramen Onctueux', category: 'Japonais' },
  { name: 'Tacos de Pollo Asado', category: 'Tex-Mex' },
  { name: 'Pancakes Nutella & Banane', category: 'Sucré' },
  { name: 'Risotto aux Cèpes Sauvages', category: 'Italien' },
  { name: 'Croque-Monsieur à la Truffe', category: 'Français' }
];

export default function SearchDrawer({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  userLocation,
  setUserLocation,
  isLocating,
  onDetectLocation,
  restaurants = [],
  dishes = [],
  isProximityFirst = false,
  setIsProximityFirst,
  feedSortOrder = 'recent',
  setFeedSortOrder
}: SearchDrawerProps) {
  // Navigation Tabs inside Search Drawer
  const [activeTab, setActiveTab] = useState<'classic' | 'gemini'>('classic');
  
  // Sector States
  const [selectedCity, setSelectedCity] = useState<string>('Paris');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Map settings
  const [mapType, setMapType] = useState<'france' | 'city'>('city');

  // Gemini AI search prompt states
  const [geminiPrompt, setGeminiPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResultExplanation, setAiResultExplanation] = useState<string | null>(null);

  // Sync city selection when coordinates match a known city (or default to current)
  useEffect(() => {
    if (userLocation) {
      // Find closest city
      let minDistance = Infinity;
      let closestCity = 'Paris';
      FRENCH_CITIES.forEach(city => {
        const d = Math.sqrt(Math.pow(city.lat - userLocation.lat, 2) + Math.pow(city.lng - userLocation.lng, 2));
        if (d < minDistance) {
          minDistance = d;
          closestCity = city.name;
        }
      });
      setSelectedCity(closestCity);
    }
  }, [userLocation]);

  // Voice Search via Web Speech API
  const handleListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'fr-FR';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          if (activeTab === 'gemini') {
            setGeminiPrompt(transcript);
          } else {
            setSearchQuery(transcript);
          }
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setSpeechError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      console.warn('Speech recognition start failed:', e);
      setIsListening(false);
    }
  };

  // Submit search query to our server's Gemini AI search parser
  const handleAiSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!geminiPrompt.trim()) return;

    setIsAiLoading(true);
    setAiError(null);
    setAiResultExplanation(null);

    try {
      const response = await fetch('/api/ai/parse-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: geminiPrompt })
      });

      if (!response.ok) {
        throw new Error("L'assistant intelligent n'a pas pu traiter la demande.");
      }

      const data = await response.json();
      if (data.success) {
        // Apply parsed filters
        if (data.city) {
          setSelectedCity(data.city);
        }
        if (data.category !== undefined) {
          setSelectedCategory(data.category);
        }
        if (data.searchQuery !== undefined) {
          setSearchQuery(data.searchQuery);
        }
        
        // Handle proximity request
        if (data.isProximitySortActive) {
          if (setIsProximityFirst) setIsProximityFirst(true);
          if (setFeedSortOrder) setFeedSortOrder('distance');
          onDetectLocation();
        }

        setAiResultExplanation(data.explanation);
        
        // Auto-close after 3.5 seconds to let the user view the beautiful applied parameters
        setTimeout(() => {
          onClose();
        }, 3500);

      } else {
        throw new Error(data.error || "Une erreur inconnue est survenue.");
      }
    } catch (err: any) {
      console.error('[Gemini AI Search ERROR]', err);
      setAiError(err.message || "Impossible de se connecter à Gemini. Veuillez réessayer.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter restaurants by chosen city and chosen category
  const filteredRestaurants = restaurants.filter(r => {
    // City filter
    const restCity = (r.city || 'Paris').toLowerCase();
    const cityMatch = restCity.includes(selectedCity.toLowerCase()) || 
                      (selectedCity === 'Paris' && r.address?.toLowerCase().includes('paris'));
    
    // Category filter
    let categoryMatch = true;
    if (selectedCategory) {
      const restCategory = (r.category || '').toLowerCase();
      categoryMatch = restCategory.includes(selectedCategory.toLowerCase());
    }

    // Text search filter (if typed)
    let textMatch = true;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = (r.name || '').toLowerCase().includes(query);
      const descMatch = (r.description || '').toLowerCase().includes(query);
      textMatch = nameMatch || descMatch;
    }

    return cityMatch && categoryMatch && textMatch;
  });

  const handleSelectRestaurantInDrawer = (name: string, category: string) => {
    setSearchQuery(name);
    if (category) {
      setSelectedCategory(category);
    }
    onClose();
  };

  // Click on map helper
  const handleMapCityClick = (cityName: string) => {
    setSelectedCity(cityName);
    setMapType('city');
  };

  // List of unique dish names to show in the popular products section
  const popularDishes = dishes.length > 0 
    ? dishes.slice(0, 8) 
    : FALLBACK_DISHES;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-start">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-down Panel - Expanded and fully styled for visual premium design */}
      <div className="relative w-full max-w-lg mx-auto bg-[#0A0A0C]/95 backdrop-blur-2xl border-b border-white/10 p-5 pt-6 shadow-2xl animate-slide-down z-10 rounded-b-3xl max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
        
        {/* Header section with brand color and X close */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#FF5C00]/10 flex items-center justify-center border border-[#FF5C00]/30 animate-pulse">
              <Compass size={14} className="text-[#FF5C00]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Filtres & Secteurs de Livraison
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Dynamic Nav Tabs - To toggle classic map/filters and AI search */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-zinc-950 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('classic')}
            className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'classic'
                ? 'bg-[#FF5C00] text-white shadow-lg shadow-[#FF5C00]/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders size={12} />
            <span>Classique & Cartes</span>
          </button>
          <button
            onClick={() => setActiveTab('gemini')}
            className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'gemini'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-[#FF5C00] text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles size={12} className="animate-spin-slow" />
            <span>Recherche IA Gemini</span>
          </button>
        </div>

        {activeTab === 'classic' ? (
          /* TAB 1: CLASSIC MAPS AND ADVANCED CULINARY FILTERS DECK */
          <div className="space-y-4">
            
            {/* 1. Quick Select scrollable cities row + Dropdown */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <Globe size={11} className="text-[#FF5C00]" />
                  <span>Secteur de Livraison</span>
                </label>
                <span className="text-[9px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-white/5 font-bold">
                  France Métropolitaine
                </span>
              </div>
              
              {/* Scrollable grid layout for top metropolises */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {FRENCH_CITIES.slice(0, 7).map((city) => (
                  <button
                    key={city.name}
                    onClick={() => {
                      setSelectedCity(city.name);
                      setMapType('city');
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                      selectedCity.toLowerCase() === city.name.toLowerCase()
                        ? 'bg-[#FF5C00] border-[#FF5C00] text-white font-black'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                    }`}
                  >
                    📍 {city.name}
                  </button>
                ))}
              </div>

              {/* Complete dropdown list of all cities in France */}
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setMapType('city');
                }}
                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] font-sans font-medium"
              >
                {FRENCH_CITIES.map((city) => (
                  <option key={city.name} value={city.name}>
                    {city.name} ({city.region})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Visual Interactive Map Block with "Changer de carte" */}
            <div className="bg-zinc-950/80 rounded-2xl border border-white/5 p-3 space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <Map size={11} className="text-[#FF5C00]" />
                  <span>{mapType === 'france' ? 'Carte de France des Secteurs' : `Carte Locale : ${selectedCity}`}</span>
                </span>
                
                <button
                  onClick={() => setMapType(mapType === 'france' ? 'city' : 'france')}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-[9px] font-bold text-zinc-300 uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={9} />
                  <span>Changer de carte</span>
                </button>
              </div>

              {/* Visual simulated SVG map container */}
              <div className="h-[140px] bg-zinc-900/40 rounded-xl border border-white/5 relative flex items-center justify-center overflow-hidden">
                {/* Visual grid texture */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/10 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-[0.03] pointer-events-none">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border border-white" />
                  ))}
                </div>

                {mapType === 'france' ? (
                  /* SVG / Layout representation of France Map */
                  <div className="w-full h-full relative flex items-center justify-center">
                    {/* Simulated France Hexagon Outline */}
                    <div className="absolute w-[100px] h-[100px] border border-dashed border-white/10 rounded-full animate-spin-slow opacity-30" />
                    <svg className="absolute w-4/5 h-4/5 opacity-10 pointer-events-none text-white" viewBox="0 0 100 100">
                      <polygon points="50,10 85,25 85,65 50,90 15,65 15,25" fill="currentColor" />
                    </svg>
                    
                    <span className="absolute text-[8px] uppercase tracking-widest text-zinc-600 font-mono font-bold">Sélectionnez une Métropole</span>

                    {/* Glowing Metropolis Pins on France Map */}
                    {FRENCH_CITIES.slice(0, 8).map((city, idx) => {
                      const isSelected = city.name.toLowerCase() === selectedCity.toLowerCase();
                      // Map latitudes/longitudes approximately to visual positions
                      const x = 30 + ((city.lng + 2) * 6);
                      const y = 80 - ((city.lat - 42) * 7);
                      return (
                        <button
                          key={city.name}
                          onClick={() => handleMapCityClick(city.name)}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                        >
                          <span className={`absolute -inset-1.5 rounded-full animate-ping opacity-35 ${isSelected ? 'bg-[#FF5C00]' : 'bg-white'}`} />
                          <div className={`w-2.5 h-2.5 rounded-full border transition-all ${isSelected ? 'bg-[#FF5C00] border-white scale-125' : 'bg-zinc-800 border-zinc-600 group-hover:bg-[#FF5C00]'}`} />
                          
                          {/* Tooltip on hover */}
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black border border-white/10 px-1.5 py-0.5 rounded text-[8px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all font-mono">
                            {city.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Simulated City Map Mode with partner restaurant pins */
                  <div className="w-full h-full relative flex items-center justify-center">
                    {/* Simulated streets background */}
                    <div className="absolute inset-x-2 h-0.5 bg-white/5" style={{ top: '30%' }} />
                    <div className="absolute inset-x-2 h-0.5 bg-white/5" style={{ top: '70%' }} />
                    <div className="absolute inset-y-2 w-0.5 bg-white/5" style={{ left: '40%' }} />
                    <div className="absolute inset-y-2 w-0.5 bg-white/5" style={{ left: '80%' }} />
                    <div className="absolute w-12 h-12 rounded-full border border-white/5 bg-zinc-950/20" style={{ left: '35%', top: '25%' }} />

                    {/* City Center Icon */}
                    <div className="absolute flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/30 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-pulse" />
                      </div>
                      <span className="text-[8px] font-black uppercase text-zinc-500 font-sans tracking-wider mt-1">{selectedCity} Centre</span>
                    </div>

                    {/* Partner Restaurant Pins within selected city */}
                    {restaurants.filter(r => (r.city || 'Paris').toLowerCase() === selectedCity.toLowerCase() || (selectedCity === 'Paris' && r.address?.toLowerCase().includes('paris'))).map((rest, idx) => {
                      // Position randomly around center for visual simulation, but seed with ID to keep stable
                      const hash = rest.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                      const angle = (hash * 45) % 360;
                      const r = 25 + (hash % 20);
                      const x = 50 + r * Math.cos(angle * Math.PI / 180);
                      const y = 45 + r * Math.sin(angle * Math.PI / 180);

                      const isSelected = searchQuery.toLowerCase().trim() === rest.name.toLowerCase().trim();

                      return (
                        <button
                          key={rest.id}
                          onClick={() => handleSelectRestaurantInDrawer(rest.name, rest.category)}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                        >
                          <span className={`absolute -inset-2 rounded-full animate-pulse opacity-20 ${isSelected ? 'bg-orange-500' : 'bg-green-500'}`} />
                          <div className={`px-1.5 py-0.5 rounded-full border text-[8px] font-bold tracking-tight whitespace-nowrap transition-all shadow-md flex items-center gap-0.5 ${
                            isSelected 
                              ? 'bg-[#FF5C00] border-white text-white' 
                              : 'bg-zinc-900 border-zinc-700 text-green-400 hover:bg-green-500/10 hover:border-green-400'
                          }`}>
                            <Store size={8} />
                            <span>{rest.name}</span>
                          </div>
                        </button>
                      );
                    })}

                    {restaurants.filter(r => (r.city || 'Paris').toLowerCase() === selectedCity.toLowerCase()).length === 0 && (
                      <div className="text-center max-w-xs space-y-1 z-10 bg-[#0A0A0C]/80 p-2.5 rounded-xl border border-white/5">
                        <AlertCircle size={14} className="mx-auto text-zinc-500" />
                        <p className="text-[9px] text-zinc-400">Aucun restaurant pré-configuré sur la carte de {selectedCity}.</p>
                        <p className="text-[8px] text-zinc-600">Filtrez par mot-clé pour lancer une recherche textuelle globale !</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Visual Grid of Cuisine Specialties */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <UtensilsCrossed size={11} className="text-[#FF5C00]" />
                <span>Spécialités de Cuisine</span>
              </label>
              
              <div className="grid grid-cols-3 gap-1.5">
                {/* "Toutes spécialités" Reset Option */}
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border text-left cursor-pointer ${
                    !selectedCategory
                      ? 'bg-gradient-to-br from-[#FF5C00]/10 to-orange-500/5 border-[#FF5C00] text-[#FF5C00]'
                      : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  🍔 Toutes Spécialités
                </button>

                {SPECIALTIES.map((spec) => {
                  const isSelected = selectedCategory.toLowerCase() === spec.id.toLowerCase();
                  return (
                    <button
                      key={spec.id}
                      onClick={() => setSelectedCategory(spec.id)}
                      className={`py-2 px-2.5 rounded-xl text-[10px] font-bold tracking-tight transition-all border text-left flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#FF5C00]/10 to-orange-500/5 border-[#FF5C00] text-[#FF5C00] font-black'
                          : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs">{spec.emoji}</span>
                      <span className="line-clamp-1">{spec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Text Search Bar with Speech Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Search size={11} className="text-[#FF5C00]" />
                <span>Recherche Textuelle</span>
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Trattoria, Ramen, Double Cheese, Truffe..."
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-xl pl-9 pr-16 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]/80 placeholder-zinc-500 shadow-inner font-medium transition-all"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-zinc-400 hover:text-white text-sm cursor-pointer font-black px-1"
                    >
                      ×
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleListen}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      isListening 
                        ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 bg-white/2 border border-white/5'
                    }`}
                    title="Commande vocale (Web Speech API)"
                  >
                    <Mic size={13} className={isListening ? "animate-pulse" : ""} />
                  </button>
                </div>
              </div>
              {isListening && (
                <p className="text-[9px] text-[#FF5C00] font-black animate-pulse px-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                  🎙️ À l'écoute... parlez maintenant.
                </p>
              )}
            </div>

            {/* 5. Popular Products / Clickable Dishes List */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Flame size={11} className="text-[#FF5C00]" />
                <span>Plats & Produits Populaires</span>
              </label>
              
              <div className="flex flex-wrap gap-1.5">
                {popularDishes.map((dish: any, idx: number) => {
                  const isSelected = searchQuery.toLowerCase().includes(dish.name.toLowerCase());
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(dish.name);
                        if (dish.category) {
                          setSelectedCategory(dish.category);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00] font-black'
                          : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      🔥 {dish.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. GPS Proximity Sort Block (Fixed and Fully Working) */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                  <Navigation size={11} className="text-[#FF5C00]" />
                  Tri par Proximité & Distance
                </span>
                {(userLocation || isProximityFirst) && (
                  <span className="text-[8px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                    GPS Actif (Rayon 5km)
                  </span>
                )}
              </div>
              
              <button
                onClick={() => {
                  if (userLocation || isProximityFirst) {
                    // Reset
                    setUserLocation(null);
                    if (setIsProximityFirst) setIsProximityFirst(false);
                    if (setFeedSortOrder) setFeedSortOrder('recent');
                  } else {
                    onDetectLocation();
                  }
                }}
                className={`w-full py-2.5 px-3 rounded-xl border font-bold text-[10px] uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  (userLocation || isProximityFirst)
                    ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00]' 
                    : 'bg-zinc-900 border-white/10 text-white hover:bg-zinc-850'
                }`}
              >
                {isLocating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Recherche de votre position...</span>
                  </>
                ) : (
                  <>
                    <MapPin size={12} className={(userLocation || isProximityFirst) ? 'animate-bounce' : 'text-[#FF5C00]'} />
                    <span>{(userLocation || isProximityFirst) ? 'Désactiver le Tri par Proximité' : 'Activer le Tri par Proximité (GPS)'}</span>
                  </>
                )}
              </button>
            </div>

            {/* 7. Sector Results Display List */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono">
                  Restaurants trouvés ({filteredRestaurants.length})
                </label>
                <span className="text-[9px] text-[#FF5C00] font-black font-mono">
                  📍 {selectedCity} • {selectedCategory || 'Toutes Spécialités'}
                </span>
              </div>

              <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
                {filteredRestaurants.length > 0 ? (
                  filteredRestaurants.map((r) => {
                    const isSelected = searchQuery.toLowerCase().trim() === r.name.toLowerCase().trim();
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleSelectRestaurantInDrawer(r.name, r.category)}
                        className={`w-full text-left rounded-xl p-2.5 transition-all flex items-center justify-between group cursor-pointer border ${
                          isSelected 
                            ? 'bg-zinc-900 border-[#FF5C00]/60' 
                            : 'bg-zinc-900/50 hover:bg-zinc-900 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-white/10 flex items-center justify-center text-xs font-black shrink-0 text-[#FF5C00]">
                            {r.logoUrl ? (
                              <img src={r.logoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              r.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white group-hover:text-[#FF5C00] transition-colors line-clamp-1">{r.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-zinc-500 font-mono bg-zinc-950 px-1.5 py-0.2 rounded border border-white/5">
                                {r.category || 'Gourmet'}
                              </span>
                              <span className="text-[9px] text-zinc-400 line-clamp-1">
                                {r.district || r.city || 'Paris'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={12} className="text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 text-center border border-dashed border-white/5 rounded-2xl bg-zinc-900/20">
                    <Store size={18} className="mx-auto text-zinc-600 mb-1.5" />
                    <p className="text-[11px] text-zinc-500 font-medium">Aucun restaurant dans ce secteur.</p>
                    <p className="text-[9px] text-zinc-600 mt-0.5 font-mono">Veuillez modifier vos critères de recherche !</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reset All Filters Button */}
            {(userLocation || isProximityFirst || searchQuery || selectedCategory || selectedCity !== 'Paris') && (
              <button
                onClick={() => {
                  setUserLocation(null);
                  setSearchQuery('');
                  setSelectedCategory('');
                  setSelectedCity('Paris');
                  setMapType('city');
                  if (setIsProximityFirst) setIsProximityFirst(false);
                  if (setFeedSortOrder) setFeedSortOrder('recent');
                }}
                className="w-full mt-2 py-2 border border-red-500/20 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-red-500/20 transition-all cursor-pointer font-sans"
              >
                Réinitialiser tous les filtres ×
              </button>
            )}
          </div>
        ) : (
          /* TAB 2: GEMINI AI ASSISTANT FOR NATURAL LANGUAGE QUERIES */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400 animate-pulse" />
                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-wider font-mono">
                  Recherche Intelligente Gemini 3.5
                </span>
              </div>
              
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Décrivez simplement ce que vous voulez manger, dans quelle ville française ou à proximité, et Gemini configurera instantanément les filtres parfaits pour vous !
              </p>

              <form onSubmit={handleAiSearchSubmit} className="space-y-3">
                <div className="relative">
                  <textarea
                    value={geminiPrompt}
                    onChange={(e) => setGeminiPrompt(e.target.value)}
                    placeholder="Ex: Je cherche des sushis frais à Bordeaux, ou un délicieux smash burger à Marseille..."
                    className="w-full bg-zinc-900/90 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500/80 placeholder-zinc-500 shadow-inner min-h-[90px] font-sans resize-none pr-10"
                  />
                  
                  <button
                    type="button"
                    onClick={handleListen}
                    className={`absolute right-3.5 bottom-3.5 p-1.5 rounded-lg transition-all cursor-pointer ${
                      isListening 
                        ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 bg-white/2 border border-white/5'
                    }`}
                    title="Commande vocale (Web Speech API)"
                  >
                    <Mic size={13} className={isListening ? "animate-pulse" : ""} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isAiLoading || !geminiPrompt.trim()}
                  className={`w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-indigo-500 via-purple-500 to-[#FF5C00] text-white hover:opacity-90 ${
                    isAiLoading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {isAiLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Analyse de votre envie par Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} className="animate-pulse" />
                      <span>Analyser & Filtrer avec Gemini</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Suggestions clickable to trigger instant search */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono">
                Exemples de suggestions de tests :
              </span>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { text: 'Je veux manger de bonnes pizzas à Paris 🍕', prompt: 'Je veux manger de bonnes pizzas à Paris' },
                  { text: 'Trouve-moi des ramens bien chauds sur Lyon 🍜', prompt: 'Trouve-moi des ramens bien chauds sur Lyon' },
                  { text: 'Un smash burger dégoulinant à Marseille 🍔', prompt: 'Un smash burger dégoulinant à Marseille' },
                  { text: 'Un dessert sucré à Bordeaux pour ce soir 🧇', prompt: 'Un dessert sucré à Bordeaux pour ce soir' }
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setGeminiPrompt(sug.prompt);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-white/5 hover:border-white/10 transition-all text-[11px] text-zinc-300 hover:text-white flex items-center justify-between group cursor-pointer"
                  >
                    <span>{sug.text}</span>
                    <ArrowRight size={10} className="text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            {/* Error or Success notification badges */}
            {aiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs font-semibold animate-fade-in">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}

            {aiResultExplanation && (
              <div className="p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl space-y-2.5 animate-fade-in text-white text-xs">
                <div className="flex items-center gap-1.5 font-bold text-green-400">
                  <Check size={14} className="bg-green-500/20 rounded-full p-0.5" />
                  <span>Gemini a configuré vos filtres !</span>
                </div>
                <p className="text-zinc-300 font-medium leading-relaxed italic">
                  "{aiResultExplanation}"
                </p>
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-950 px-2 py-0.5 rounded border border-white/5 text-purple-400">
                    📍 {selectedCity}
                  </span>
                  {selectedCategory && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-950 px-2 py-0.5 rounded border border-white/5 text-orange-400">
                      Cuisine : {selectedCategory}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-950 px-2 py-0.5 rounded border border-white/5 text-blue-400">
                      Recherche : "{searchQuery}"
                    </span>
                  )}
                  {isProximityFirst && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-950 px-2 py-0.5 rounded border border-white/5 text-green-400">
                      ⚡ Proximité active
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-zinc-500 font-bold animate-pulse pt-0.5 text-center">
                  Fermeture du volet et application du flux dans un instant...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
