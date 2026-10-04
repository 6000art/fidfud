import React, { useState, useEffect } from 'react';
import LazyImage from './LazyImage';
import { 
  Search, MapPin, X, Flame, Compass, UtensilsCrossed, Store, ArrowRight, 
  Map, Sliders, Mic, Sparkles, Globe, RefreshCw, Check, Navigation, AlertCircle, Zap, Clock, Leaf, ChefHat, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import { CATEGORY_LIST } from '../constants/categories';
import { geolocationService } from '../services/GeolocationService';
import { DIETARY_OPTIONS, checkRestaurantMatchesDietaryTag } from '../utils/dietaryUtils';
import { notify } from '../utils/notify';

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
  feedSortOrder?: 'taste_profile' | 'recommended' | 'recent' | 'oldest' | 'likes' | 'distance';
  setFeedSortOrder?: (val: 'taste_profile' | 'recommended' | 'recent' | 'oldest' | 'likes' | 'distance') => void;
  onOpenTasteProfileModal?: () => void;
  proximityRadius?: number;
  setProximityRadius?: (radius: number) => void;
  isFastLane?: boolean;
  setIsFastLane?: (val: boolean) => void;
  maxPrepTimeMinutes?: number;
  setMaxPrepTimeMinutes?: (minutes: number) => void;
  selectedDietaryTags?: string[];
  setSelectedDietaryTags?: (tags: string[]) => void;
  onSelectDish?: (dishId: string) => void;
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

const SPECIALTIES = CATEGORY_LIST.map(c => ({ id: c.id, label: c.label, emoji: c.emoji }));

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

const PANTRY_QUICK_CHIPS = [
  { label: 'Œufs', emoji: '🥚' },
  { label: 'Fromage', emoji: '🧀' },
  { label: 'Tomates', emoji: '🍅' },
  { label: 'Pâtes', emoji: '🍝' },
  { label: 'Riz', emoji: '🍚' },
  { label: 'Poulet', emoji: '🍗' },
  { label: 'Ail & Oignons', emoji: '🧄' },
  { label: 'Pommes de terre', emoji: '🥔' },
  { label: 'Avocat', emoji: '🥑' },
  { label: 'Pain', emoji: '🥖' },
  { label: 'Lardons / Jambon', emoji: '🥓' },
  { label: 'Thon en boîte', emoji: '🐟' },
  { label: 'Crème fraîche', emoji: '🥛' },
  { label: 'Champignons', emoji: '🍄' },
  { label: 'Citron', emoji: '🍋' },
  { label: 'Chocolat / Sucre', emoji: '🍫' }
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
  feedSortOrder = 'recommended',
  setFeedSortOrder,
  onOpenTasteProfileModal,
  proximityRadius = 5,
  setProximityRadius,
  isFastLane = false,
  setIsFastLane,
  maxPrepTimeMinutes = 20,
  setMaxPrepTimeMinutes,
  selectedDietaryTags = [],
  setSelectedDietaryTags,
  onSelectDish
}: SearchDrawerProps) {
  // Navigation Tabs inside Search Drawer
  const [activeTab, setActiveTab] = useState<'classic' | 'gemini' | 'pantry'>('classic');
  const [localRadius, setLocalRadius] = useState<number>(proximityRadius);
  const [localFastLane, setLocalFastLane] = useState<boolean>(isFastLane);
  const [localMaxPrepTime, setLocalMaxPrepTime] = useState<number>(maxPrepTimeMinutes);
  const [localDietaryTags, setLocalDietaryTags] = useState<string[]>(selectedDietaryTags);

  // Pantry AI Recipe Generator States
  const [pantryItems, setPantryItems] = useState<string[]>(['Œufs', 'Fromage', 'Tomates']);
  const [pantryNotes, setPantryNotes] = useState<string>('');
  const [isPantryAiLoading, setIsPantryAiLoading] = useState<boolean>(false);
  const [pantryAiError, setPantryAiError] = useState<string | null>(null);
  const [pantryRecipes, setPantryRecipes] = useState<any[]>([]);
  const [pantryAiComment, setPantryAiComment] = useState<string | null>(null);
  const [expandedRecipeIndex, setExpandedRecipeIndex] = useState<number | null>(0);
  const [isListeningPantry, setIsListeningPantry] = useState<boolean>(false);

  const togglePantryChip = (label: string) => {
    if (pantryItems.includes(label)) {
      setPantryItems(pantryItems.filter(i => i !== label));
    } else {
      setPantryItems([...pantryItems, label]);
    }
  };

  const handleListenPantry = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (isListeningPantry) {
      setIsListeningPantry(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'fr-FR';

      recognition.onstart = () => {
        setIsListeningPantry(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setPantryNotes(prev => prev ? `${prev}, ${transcript}` : transcript);
        }
      };

      recognition.onerror = () => {
        setIsListeningPantry(false);
      };

      recognition.onend = () => {
        setIsListeningPantry(false);
      };

      recognition.start();
    } catch {
      setIsListeningPantry(false);
    }
  };

  const handlePantrySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pantryItems.length === 0 && !pantryNotes.trim()) {
      setPantryAiError("Veuillez sélectionner ou saisir au moins un ingrédient !");
      return;
    }

    setIsPantryAiLoading(true);
    setPantryAiError(null);
    setPantryRecipes([]);
    setPantryAiComment(null);

    try {
      const response = await fetch('/api/ai/pantry-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: pantryItems,
          customNotes: pantryNotes,
          dietaryTags: currentDietaryTags
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur de génération des recettes par l'IA.");
      }

      setPantryRecipes(data.recipes || []);
      setPantryAiComment(data.aiComment || null);
      setExpandedRecipeIndex(0); // expand first recipe by default
    } catch (err: any) {
      console.error("[Pantry AI Submit ERROR]", err);
      setPantryAiError(err.message || "Erreur lors du calcul des recettes.");
    } finally {
      setIsPantryAiLoading(false);
    }
  };

  const currentRadius = proximityRadius !== undefined ? proximityRadius : localRadius;
  const isFastLaneState = isFastLane !== undefined ? isFastLane : localFastLane;
  const currentMaxPrepTime = maxPrepTimeMinutes !== undefined ? maxPrepTimeMinutes : localMaxPrepTime;
  const currentDietaryTags = selectedDietaryTags !== undefined ? selectedDietaryTags : localDietaryTags;

  const handleRadiusChange = (newRadius: number) => {
    setLocalRadius(newRadius);
    if (setProximityRadius) {
      setProximityRadius(newRadius);
    }
  };

  const handleFastLaneToggle = (val: boolean) => {
    setLocalFastLane(val);
    if (val && (!localMaxPrepTime || localMaxPrepTime > 10)) {
      setLocalMaxPrepTime(10);
      if (setMaxPrepTimeMinutes) {
        setMaxPrepTimeMinutes(10);
      }
    }
    if (setIsFastLane) {
      setIsFastLane(val);
    }
  };

  const handlePrepTimeChange = (val: number) => {
    setLocalMaxPrepTime(val);
    if (setMaxPrepTimeMinutes) {
      setMaxPrepTimeMinutes(val);
    }
    if (!localFastLane && setIsFastLane) {
      setLocalFastLane(true);
      setIsFastLane(true);
    }
  };

  const handleToggleDietaryTag = (tagId: string) => {
    const isAdding = !currentDietaryTags.includes(tagId);
    const updated = isAdding
      ? [...currentDietaryTags, tagId]
      : currentDietaryTags.filter(t => t !== tagId);
    setLocalDietaryTags(updated);
    if (setSelectedDietaryTags) {
      setSelectedDietaryTags(updated);
    }
    const tagObj = DIETARY_OPTIONS.find(o => o.id === tagId);
    const tagName = tagObj ? tagObj.label : tagId;
    if (isAdding) {
      notify("🔍 FILTRE D'ALIMENTATION", `Filtre "${tagName}" activé`, "info");
    } else {
      notify("🔍 FILTRE RETIRÉ", `Filtre "${tagName}" désactivé`, "info");
    }
  };
  
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

  // Helper to calculate or retrieve average preparation time for a restaurant
  const getRestaurantPrepTime = (r: any): number => {
    if (r.avgPreparationTimeMinutes !== undefined && r.avgPreparationTimeMinutes > 0) return r.avgPreparationTimeMinutes;
    if (r.preparationTimeMinutes !== undefined && r.preparationTimeMinutes > 0) return r.preparationTimeMinutes;
    
    // Check dishes if available
    if (dishes && dishes.length > 0) {
      const restDishes = dishes.filter(d => d.restaurantId === r.id);
      const validTimes = restDishes
        .map(d => d.preparationTimeMinutes)
        .filter((t): t is number => typeof t === 'number' && t > 0);
      if (validTimes.length > 0) {
        return Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length);
      }
    }

    // Deterministic realistic fallback (10 to 24 mins)
    const code = (r.id || r.name || '0').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);
    return 10 + (code % 15);
  };

  if (!isOpen) return null;

  // Filter restaurants by chosen city, category, text, proximity, and fast lane prep time
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

    // Radius proximity filter (when user location or proximity mode is active)
    let radiusMatch = true;
    if ((userLocation || isProximityFirst) && userLocation && r.latitude && r.longitude) {
      const dist = geolocationService.calculateDistanceKm(
        userLocation.lat,
        userLocation.lng,
        r.latitude,
        r.longitude
      );
      radiusMatch = dist <= currentRadius;
    }

    // Fast Lane preparation time filter
    let fastLaneMatch = true;
    if (isFastLaneState) {
      const prepTime = getRestaurantPrepTime(r);
      fastLaneMatch = prepTime <= currentMaxPrepTime;
    }

    // Dietary preferences filter
    let dietaryMatch = true;
    if (currentDietaryTags.length > 0) {
      dietaryMatch = currentDietaryTags.every(tag => checkRestaurantMatchesDietaryTag(r, tag, dishes));
    }

    return cityMatch && categoryMatch && textMatch && radiusMatch && fastLaneMatch && dietaryMatch;
  });

  // Sort by closest distance if proximity is active
  if ((userLocation || isProximityFirst) && userLocation) {
    filteredRestaurants.sort((a, b) => {
      const distA = (a.latitude && a.longitude) ? geolocationService.calculateDistanceKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude) : 999;
      const distB = (b.latitude && b.longitude) ? geolocationService.calculateDistanceKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude) : 999;
      return distA - distB;
    });
  }

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
    <div className="fixed inset-0 z-[100] flex flex-col justify-start">
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

        {/* Dynamic Nav Tabs - To toggle classic map/filters, AI search, and Pantry recipes */}
        <div className="grid grid-cols-3 gap-1.5 mb-4 p-1 bg-zinc-950 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('classic')}
            className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'classic'
                ? 'bg-[#FF5C00] text-white shadow-lg shadow-[#FF5C00]/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders size={11} />
            <span>Classique</span>
          </button>
          <button
            onClick={() => setActiveTab('gemini')}
            className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'gemini'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-[#FF5C00] text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles size={11} className="animate-spin-slow" />
            <span>Recherche IA</span>
          </button>
          <button
            onClick={() => setActiveTab('pantry')}
            className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'pantry'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 text-black font-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ChefHat size={11} className={activeTab === 'pantry' ? 'text-black' : 'text-amber-400'} />
            <span>Recettes Frigo</span>
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

            {/* 2.5 Dietary & Certification Badges Quick Filters */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span>☪️ Certifications & Régimes</span>
                </span>
                <span className="text-[9px] text-emerald-500/80 font-bold">Labels Officiels</span>
              </label>
              
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Halal Certifié', emoji: '☪️', tag: 'halal' },
                  { label: 'Fait Maison', emoji: '👨‍🍳', tag: 'fait maison' },
                  { label: 'Bio AB', emoji: '🌿', tag: 'bio' },
                  { label: 'Végan', emoji: '🌱', tag: 'végan' },
                  { label: 'Sans Gluten', emoji: '🌾', tag: 'gluten' },
                  { label: 'Kasher', emoji: '✡️', tag: 'kasher' }
                ].map((cert) => {
                  const isActive = searchQuery.toLowerCase().includes(cert.tag);
                  return (
                    <button
                      key={cert.tag}
                      onClick={() => {
                        if (isActive) {
                          setSearchQuery(searchQuery.replace(new RegExp(cert.tag, 'gi'), '').trim());
                        } else {
                          setSearchQuery((searchQuery ? `${searchQuery} ` : '') + cert.tag);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                          : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <span>{cert.emoji}</span>
                      <span>{cert.label}</span>
                    </button>
                  );
                })}
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
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Flame size={11} className="text-[#FF5C00]" />
                  <span>Plats & Produits Populaires</span>
                </span>
                <span className="text-[8px] text-zinc-500 font-mono">Cliquez pour filtrer ou voir la fiche</span>
              </label>
              
              <div className="flex flex-wrap gap-1.5">
                {popularDishes.map((dish: any, idx: number) => {
                  const isSelected = searchQuery.toLowerCase().includes(dish.name.toLowerCase());
                  const matchingDishId = dish.id || (dishes.find(d => d.name?.toLowerCase() === dish.name?.toLowerCase())?.id);
                  return (
                    <div
                      key={idx}
                      className={`inline-flex items-center rounded-lg text-[9px] font-semibold transition-all border ${
                        isSelected
                          ? 'bg-[#FF5C00]/10 border-[#FF5C00] text-[#FF5C00] font-black'
                          : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSearchQuery(dish.name);
                          if (dish.category) {
                            setSelectedCategory(dish.category);
                          }
                        }}
                        className="px-2 py-1 cursor-pointer hover:text-white"
                        title={`Filtrer les restaurants par ${dish.name}`}
                      >
                        🔥 {dish.name}
                      </button>

                      {matchingDishId && onSelectDish && (
                        <button
                          onClick={() => {
                            onSelectDish(matchingDishId);
                            onClose();
                          }}
                          className="px-1.5 py-1 border-l border-white/10 hover:bg-[#FF5C00]/20 hover:text-[#FF5C00] text-zinc-400 rounded-r-lg transition-colors cursor-pointer text-[8px] font-mono font-bold"
                          title="Voir la fiche détaillée du plat, photos & ingrédients"
                        >
                          👁️ Fiche
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5b. Algorithme de Classement du Feed & Recommandation IA */}
            <div className="bg-gradient-to-r from-purple-500/15 via-[#FF5C00]/10 to-transparent border border-purple-500/30 rounded-2xl p-3.5 space-y-3 shadow-lg">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <Sparkles size={13} className="text-[#FF5C00] fill-[#FF5C00]/20" />
                  Tri & Recommandations IA
                </span>
                <span className="text-[9px] font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 font-mono uppercase">
                  {feedSortOrder === 'taste_profile' ? '👅 Profil Gustatif' : feedSortOrder === 'recommended' ? '🧠 ML Actif' : feedSortOrder === 'distance' ? '📍 GPS' : feedSortOrder === 'likes' ? '❤️ Populaires' : '⏱️ Récents'}
                </span>
              </div>

              {/* Special Taste Profile Banner */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-purple-950/60 to-black/60 border border-purple-500/40 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFeedSortOrder && setFeedSortOrder('taste_profile')}
                  className={`flex-1 p-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    feedSortOrder === 'taste_profile'
                      ? 'bg-gradient-to-r from-[#FF5C00] to-purple-600 text-white shadow-lg shadow-[#FF5C00]/25'
                      : 'bg-purple-900/40 text-purple-200 hover:text-white hover:bg-purple-800/50'
                  }`}
                >
                  <span>👅 Profil Gustatif IA</span>
                  {feedSortOrder === 'taste_profile' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                </button>

                {onOpenTasteProfileModal && (
                  <button
                    type="button"
                    onClick={onOpenTasteProfileModal}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold uppercase tracking-wider border border-zinc-700 transition-all cursor-pointer shrink-0"
                    title="Voir et ajuster mon profil de saveurs"
                  >
                    ⚙️ Ajuster
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFeedSortOrder && setFeedSortOrder('recommended')}
                  className={`p-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    feedSortOrder === 'recommended'
                      ? 'bg-gradient-to-r from-purple-600 to-[#FF5C00] text-white border-purple-400 shadow-lg shadow-purple-500/20 scale-[1.02]'
                      : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-850'
                  }`}
                >
                  <span>🧠 Recommandé IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedSortOrder && setFeedSortOrder('recent')}
                  className={`p-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    feedSortOrder === 'recent'
                      ? 'bg-white/20 text-white border-white/40 shadow-md'
                      : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-850'
                  }`}
                >
                  <span>⏱️ Plus Récents</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedSortOrder && setFeedSortOrder('likes')}
                  className={`p-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    feedSortOrder === 'likes'
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-md'
                      : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-850'
                  }`}
                >
                  <span>❤️ Populaires</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (setFeedSortOrder) setFeedSortOrder('distance');
                    if (setIsProximityFirst) setIsProximityFirst(true);
                    onDetectLocation();
                  }}
                  className={`p-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    feedSortOrder === 'distance'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-md'
                      : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-850'
                  }`}
                >
                  <span>📍 Proximité</span>
                </button>
              </div>
            </div>

            {/* 6. GPS Proximity Sort & Range Slider Block */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                  <Navigation size={12} className="text-[#FF5C00]" />
                  Proximité & Rayon GPS
                </span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                  (userLocation || isProximityFirst)
                    ? 'text-green-400 bg-green-500/10 border-green-500/20'
                    : 'text-zinc-500 bg-zinc-900 border-white/5'
                }`}>
                  {(userLocation || isProximityFirst) ? `GPS Actif (${currentRadius} km)` : 'GPS Inactif'}
                </span>
              </div>
              
              {/* Toggle button */}
              <button
                onClick={() => {
                  if (userLocation || isProximityFirst) {
                    setUserLocation(null);
                    if (setIsProximityFirst) setIsProximityFirst(false);
                    if (setFeedSortOrder) setFeedSortOrder('recent');
                  } else {
                    if (setIsProximityFirst) setIsProximityFirst(true);
                    if (setFeedSortOrder) setFeedSortOrder('distance');
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

              {/* Range Slider for Proximity Filtering */}
              <div className="pt-1.5 space-y-2 border-t border-white/5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1">
                    <span>📏 Rayon de proximité</span>
                  </label>
                  <span className="text-[#FF5C00] font-black text-xs font-mono bg-[#FF5C00]/10 px-2 py-0.5 rounded-lg border border-[#FF5C00]/20">
                    {currentRadius} km
                  </span>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={currentRadius}
                    onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
                    className="w-full accent-[#FF5C00] cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold px-0.5">
                    <span>1 km</span>
                    <span>3 km</span>
                    <span>5 km</span>
                    <span>10 km</span>
                  </div>
                </div>

                {/* Quick preset pills */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[1, 3, 5, 10].map((rVal) => (
                    <button
                      key={rVal}
                      onClick={() => handleRadiusChange(rVal)}
                      className={`py-1 text-[9px] font-extrabold font-mono rounded-lg border transition-all cursor-pointer ${
                        currentRadius === rVal
                          ? 'bg-[#FF5C00] text-white border-[#FF5C00]'
                          : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      {rVal} km
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 6b. Fast Lane Toggle & Average Preparation Time Filter */}
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-3 shadow-lg shadow-amber-500/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <Zap size={13} className="text-amber-400 fill-amber-400" />
                  Mode Fast Lane (Ready to Grab)
                </span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isFastLaneState
                    ? 'text-amber-300 bg-amber-500/20 border-amber-500/40 shadow-sm animate-pulse'
                    : 'text-zinc-500 bg-zinc-900 border-white/5'
                }`}>
                  {isFastLaneState ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      <span>⚡ Ready to grab (≤ {currentMaxPrepTime} min)</span>
                    </>
                  ) : (
                    'Inactif'
                  )}
                </span>
              </div>

              <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                Trie et priorise immédiatement les plats cuisinés en moins de 10 minutes avec le badge visuel <strong className="text-amber-300">"Ready to grab"</strong> dans le feed.
              </p>
              
              {/* Toggle button */}
              <button
                onClick={() => handleFastLaneToggle(!isFastLaneState)}
                className={`w-full py-2.5 px-3 rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  isFastLaneState
                    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black border-amber-300 font-black scale-[1.01]' 
                    : 'bg-zinc-900 border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <Zap size={13} className={isFastLaneState ? 'fill-black text-black' : 'text-amber-400'} />
                <span>{isFastLaneState ? 'Désactiver le Mode Fast Lane' : '⚡ Activer Fast Lane (< 10 min Ready to grab)'}</span>
              </button>

              {/* Range Slider for Max Preparation Time Filtering */}
              {isFastLaneState && (
                <div className="pt-2 space-y-2 border-t border-amber-500/20">
                  <div className="flex justify-between items-center text-xs">
                    <label className="text-[10px] font-extrabold text-amber-200 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Clock size={11} className="text-amber-400" />
                      <span>Temps max de préparation</span>
                    </label>
                    <span className="text-amber-400 font-black text-xs font-mono bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                      ≤ {currentMaxPrepTime} min
                    </span>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="5"
                      value={currentMaxPrepTime}
                      onChange={(e) => handlePrepTimeChange(parseInt(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-amber-400/60 font-bold px-0.5">
                      <span>5 min</span>
                      <span>10 min (Express)</span>
                      <span>15 min</span>
                      <span>20 min</span>
                      <span>30 min</span>
                    </div>
                  </div>

                  {/* Quick preset pills */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[5, 10, 15, 20].map((timeVal) => (
                      <button
                        key={timeVal}
                        onClick={() => handlePrepTimeChange(timeVal)}
                        className={`py-1.5 text-[9px] font-extrabold font-mono rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
                          currentMaxPrepTime === timeVal
                            ? 'bg-amber-400 text-black border-amber-300 font-black shadow-sm'
                            : 'bg-zinc-900 border-amber-500/20 text-amber-300/80 hover:text-white hover:border-amber-500/40'
                        }`}
                      >
                        {timeVal <= 10 && <span>⚡</span>}
                        <span>≤ {timeVal}m</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 6c. Dietary Preferences & Specific Diets Filter Section */}
            <div className="bg-gradient-to-r from-emerald-500/5 via-green-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <Leaf size={13} className="text-emerald-400 fill-emerald-400/20" />
                  Préférences Alimentaires & Régimes
                </span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                  currentDietaryTags.length > 0
                    ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40 font-mono'
                    : 'text-zinc-500 bg-zinc-900 border-white/5 font-mono'
                }`}>
                  {currentDietaryTags.length > 0 ? `🌱 ${currentDietaryTags.length} Actif(s)` : 'Tous Régimes'}
                </span>
              </div>

              {/* Grid of dietary option pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5">
                {DIETARY_OPTIONS.map((option) => {
                  const isSelected = currentDietaryTags.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleToggleDietaryTag(option.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-md shadow-emerald-500/20 scale-[1.02]'
                          : 'bg-zinc-900/90 border-white/10 text-zinc-300 hover:border-emerald-500/40 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm">{option.emoji}</span>
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                            <Check size={10} className="text-emerald-400 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 group-hover:border-emerald-500/50" />
                        )}
                      </div>
                      <span className="text-[11px] font-black mt-1.5 font-sans leading-tight">{option.label}</span>
                      <span className={`text-[8px] line-clamp-1 mt-0.5 font-sans ${isSelected ? 'text-black/80 font-semibold' : 'text-zinc-500'}`}>
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {currentDietaryTags.length > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-emerald-500/15">
                  <span className="text-[9px] font-mono text-emerald-300/80">
                    {filteredRestaurants.length} établissement(s) compatible(s)
                  </span>
                  <button
                    onClick={() => {
                      setLocalDietaryTags([]);
                      if (setSelectedDietaryTags) setSelectedDietaryTags([]);
                    }}
                    className="text-[9px] font-mono font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    Réinitialiser les régimes ×
                  </button>
                </div>
              )}
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
                              <LazyImage 
                                src={r.logoUrl} 
                                alt={r.name} 
                                sizeType="avatar"
                                containerClassName="w-full h-full rounded-lg overflow-hidden"
                                className="w-full h-full object-cover" 
                              />
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
                              {userLocation && r.latitude && r.longitude && (
                                <span className="text-[9px] text-[#FF5C00] font-mono font-bold bg-[#FF5C00]/10 px-1.5 py-0.2 rounded border border-[#FF5C00]/20 shrink-0">
                                  📍 {geolocationService.calculateDistanceKm(userLocation.lat, userLocation.lng, r.latitude, r.longitude).toFixed(1)} km
                                </span>
                              )}
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 flex items-center gap-0.5 ${
                                getRestaurantPrepTime(r) <= 20
                                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                                  : 'text-zinc-400 bg-zinc-950 border-white/5'
                              }`}>
                                ⏱️ {getRestaurantPrepTime(r)} min
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
            {(userLocation || isProximityFirst || isFastLaneState || currentDietaryTags.length > 0 || searchQuery || selectedCategory || selectedCity !== 'Paris') && (
              <button
                onClick={() => {
                  setUserLocation(null);
                  setSearchQuery('');
                  setSelectedCategory('');
                  setSelectedCity('Paris');
                  setMapType('city');
                  if (setIsProximityFirst) setIsProximityFirst(false);
                  if (setFeedSortOrder) setFeedSortOrder('recent');
                  handleFastLaneToggle(false);
                  setLocalDietaryTags([]);
                  if (setSelectedDietaryTags) setSelectedDietaryTags([]);
                }}
                className="w-full mt-2 py-2 border border-red-500/20 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-red-500/20 transition-all cursor-pointer font-sans"
              >
                Réinitialiser tous les filtres ×
              </button>
            )}
          </div>
        ) : activeTab === 'gemini' ? (
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
                  {isFastLaneState && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-950 px-2 py-0.5 rounded border border-amber-500/30 text-amber-400">
                      ⚡ Fast Lane (≤ {currentMaxPrepTime} min)
                    </span>
                  )}
                  {currentDietaryTags.length > 0 && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-950 px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400">
                      🌱 Régimes : {currentDietaryTags.map(t => DIETARY_OPTIONS.find(o => o.id === t)?.label || t).join(', ')}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-zinc-500 font-bold animate-pulse pt-0.5 text-center">
                  Fermeture du volet et application du flux dans un instant...
                </p>
              </div>
            )}
          </div>
        ) : (
          /* TAB 3: AI-POWERED PANTRY RECIPE GENERATOR ("Que puis-je cuisiner ?") */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-950 border border-amber-500/20 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                    <ChefHat size={15} className="text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider font-mono block">
                      Chef IA Garde-Manger • Gemini 3.6
                    </span>
                    <h4 className="text-xs font-black text-white">Que puis-je cuisiner chez moi ?</h4>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full">
                  🍳 Anti-Gaspillage
                </span>
              </div>

              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Sélectionnez les ingrédients disponibles dans votre réfrigérateur ou placard. Gemini va vous proposer des recettes sur mesure gourmandes et rapides !
              </p>

              {/* Quick Ingredient Chip Selectors */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen size={11} className="text-amber-400" />
                    <span>Sélection rapide d'ingrédients :</span>
                  </span>
                  {pantryItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPantryItems([])}
                      className="text-zinc-500 hover:text-red-400 underline font-semibold transition-colors cursor-pointer"
                    >
                      Tout effacer ({pantryItems.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                  {PANTRY_QUICK_CHIPS.map((chip) => {
                    const isSelected = pantryItems.includes(chip.label);
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => togglePantryChip(chip.label)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md shadow-amber-500/20 scale-[1.02]'
                            : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:border-amber-500/40 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <span>{chip.emoji}</span>
                          <span className="truncate">{chip.label}</span>
                        </span>
                        {isSelected && <Check size={10} className="stroke-[3] shrink-0 text-black" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Ingredients / Notes input + Voice mic */}
              <div className="space-y-2 pt-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider font-mono block">
                  Autre(s) ingrédient(s) ou précision(s) :
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={pantryNotes}
                    onChange={(e) => setPantryNotes(e.target.value)}
                    placeholder="Ex: 2 gousses d'ail, restes de saucisse, pot de mascarpone..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 pr-10 text-xs text-white focus:outline-none focus:border-amber-500/80 placeholder-zinc-500 font-sans"
                  />
                  <button
                    type="button"
                    onClick={handleListenPantry}
                    className={`absolute right-2 top-2 p-1 rounded-lg transition-all cursor-pointer ${
                      isListeningPantry
                        ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 bg-white/2 border border-white/5'
                    }`}
                    title="Dictée vocale des ingrédients"
                  >
                    <Mic size={13} className={isListeningPantry ? "animate-pulse" : ""} />
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => handlePantrySubmit()}
                disabled={isPantryAiLoading || (pantryItems.length === 0 && !pantryNotes.trim())}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-500 via-orange-500 to-[#FF5C00] text-black hover:opacity-95 shadow-lg shadow-amber-500/20 ${
                  isPantryAiLoading || (pantryItems.length === 0 && !pantryNotes.trim()) ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isPantryAiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Création des recettes par Chef Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="fill-black/20 animate-pulse" />
                    <span>Calculer mes recettes ({pantryItems.length} ingrédient{pantryItems.length > 1 ? 's' : ''})</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {pantryAiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs font-semibold animate-fade-in">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{pantryAiError}</span>
              </div>
            )}

            {/* Generated Recipes List */}
            {pantryRecipes.length > 0 && (
              <div className="space-y-3 animate-fade-in">
                {pantryAiComment && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs font-semibold flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400 shrink-0" />
                    <span>{pantryAiComment}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  {pantryRecipes.map((recipe, idx) => {
                    const isExpanded = expandedRecipeIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="bg-zinc-900/90 border border-amber-500/20 rounded-2xl p-3.5 space-y-3 transition-all hover:border-amber-500/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase">
                                {recipe.category || 'Recette Express'}
                              </span>
                              <span className="text-[9px] font-mono font-bold bg-zinc-950 text-zinc-400 border border-white/5 px-2 py-0.5 rounded-full">
                                ⏱️ {recipe.prepTime}
                              </span>
                              <span className="text-[9px] font-mono font-bold bg-zinc-950 text-zinc-400 border border-white/5 px-2 py-0.5 rounded-full">
                                📊 {recipe.difficulty}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-white">{recipe.title}</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">{recipe.summary}</p>
                          </div>
                        </div>

                        {/* Ingredients Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] bg-zinc-950/80 p-2.5 rounded-xl border border-white/5 font-mono">
                          <div>
                            <span className="text-emerald-400 font-extrabold block mb-1">
                              ✅ Utilisés du garde-manger :
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {recipe.pantryIngredientsUsed?.map((ing: string, i: number) => (
                                <span key={i} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-zinc-400 font-extrabold block mb-1">
                              🛒 Condiments / Bases requis :
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {recipe.missingIngredientsNeeded?.map((ing: string, i: number) => (
                                <span key={i} className="bg-zinc-900 text-zinc-400 border border-white/10 px-1.5 py-0.5 rounded">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Step-by-Step Instructions */}
                        <div className="border-t border-white/5 pt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedRecipeIndex(isExpanded ? null : idx)}
                            className="w-full flex items-center justify-between text-xs font-extrabold text-amber-400 hover:text-amber-300 transition-colors py-1 cursor-pointer font-mono"
                          >
                            <span>👩‍🍳 Étapes de préparation ({recipe.instructions?.length || 0})</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {isExpanded && (
                            <div className="space-y-2 mt-2 pt-2 border-t border-white/5 text-xs text-zinc-300">
                              <ol className="space-y-1.5 list-decimal list-inside pl-1 leading-relaxed font-sans">
                                {recipe.instructions?.map((step: string, stepIdx: number) => (
                                  <li key={stepIdx} className="text-zinc-300">
                                    <span className="font-semibold">{step}</span>
                                  </li>
                                ))}
                              </ol>

                              {recipe.chefTip && (
                                <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
                                  <span className="text-sm">💡</span>
                                  <div>
                                    <span className="font-bold block text-amber-400 font-mono text-[9px] uppercase">
                                      Astuce du Chef :
                                    </span>
                                    <span>{recipe.chefTip}</span>
                                  </div>
                                </div>
                              )}

                              {/* Option to order similar dish if too tired to cook */}
                              {recipe.matchDishName && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchQuery(recipe.matchDishName);
                                    setActiveTab('classic');
                                  }}
                                  className="w-full mt-2 py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-white/10 hover:border-[#FF5C00]/40 text-[#FF5C00] text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
                                >
                                  <UtensilsCrossed size={12} />
                                  <span>Flemme de cuisiner ? Commander "{recipe.matchDishName}" sur FIDFUD</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
