import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  ExternalLink, 
  MapPin, 
  Utensils, 
  Film, 
  Copy, 
  RefreshCw, 
  Check,
  Search,
  Layers,
  ChevronRight,
  Eye,
  Store,
  Compass,
  ListPlus,
  Phone,
  Mail,
  Flame,
  CheckCheck
} from 'lucide-react';
import { Restaurant, Dish, Video } from '../types';
import { safeApiJson } from '../utils/apiHelpers';

interface ImportFromUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (restaurant: Restaurant, dishes: Dish[], videos?: Video[]) => void;
  onOpenRestaurantInCms?: (restaurant: Restaurant) => void;
  initialUrl?: string;
}

const PRESET_URLS = [
  { label: '🍕 Popolare (Italien)', url: 'https://popolare.bigmamma.fr', category: 'Italien & Pizza' },
  { label: '🍕 Peppe Pizzeria', url: 'https://peppepizzeria.fr', category: 'Pizzeria Championne du Monde' },
  { label: '🍔 Le Camion Qui Fume', url: 'https://lecamionquifume.com', category: 'Smash Burger & Street Food' },
  { label: '🍣 Sanukiya (Japonais & Ramen)', url: 'https://sanukiya-paris.fr', category: 'Japonais & Ramen' },
  { label: '🥐 Cédric Grolet (Pâtisserie)', url: 'https://cedricgrolet.com', category: 'Haute Pâtisserie & Café' },
  { label: '🇫🇷 L\'Avenue Paris', url: 'https://www.lavenue-paris.com', category: 'Gastronomie Française' }
];

const BULK_PRESETS = [
  'https://popolare.bigmamma.fr\nhttps://peppepizzeria.fr\nhttps://lecamionquifume.com\nhttps://sanukiya-paris.fr\nhttps://www.lavenue-paris.com'
];

const VERIFICATION_STEPS = [
  { id: 1, title: 'Analyse du Domaine & Métadonnées', desc: 'Scan HTML5, OpenGraph, Schema.org et protocoles web' },
  { id: 2, title: 'Extraction de l\'Identité Visuelle', desc: 'Logo HD, Bannière grand format, Slogan et Palette' },
  { id: 3, title: 'Numérisation du Menu & Tarifs', desc: 'Extraction des plats, descriptions, prix et visuels culinaires' },
  { id: 4, title: 'Géocodage GPS & Localisation', desc: 'Calcul précis de l\'adresse, arrondissement et coordonnées GPS' },
  { id: 5, title: 'Attribution Vidéos Immersives', desc: 'Couverture 100% avec capsules vidéo culinaires adaptées' },
  { id: 6, title: 'Persistance Firestore & Publication', desc: 'Synchronisation instantanée dans la base de données cloud' }
];

export default function ImportFromUrlModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenRestaurantInCms,
  initialUrl = ''
}: ImportFromUrlModalProps) {
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>('single');
  const [url, setUrl] = useState(initialUrl);
  const [bulkUrlsText, setBulkUrlsText] = useState('');
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  // Single URL result
  const [result, setResult] = useState<{
    restaurant: Restaurant;
    dishes: Dish[];
    videos?: Video[];
  } | null>(null);

  // Bulk results
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentUrl: string }>({
    current: 0,
    total: 0,
    currentUrl: ''
  });
  const [bulkResults, setBulkResults] = useState<{
    count: number;
    restaurants: Restaurant[];
    totalDishes: number;
    totalVideos: number;
    results: any[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialUrl) {
        setUrl(initialUrl);
        if (initialUrl.includes('\n')) {
          setActiveMode('bulk');
          setBulkUrlsText(initialUrl);
        }
      }
      setErrorText(null);
      if (!result && !bulkResults) {
        setCurrentStepIndex(0);
        setProgressPercent(0);
      }
    }
  }, [isOpen, initialUrl]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          if (activeMode === 'bulk' || text.includes('\n')) {
            setActiveMode('bulk');
            setBulkUrlsText(prev => prev ? prev + '\n' + text.trim() : text.trim());
          } else {
            setUrl(text.trim());
          }
          setErrorText(null);
        }
      }
    } catch {
      // Ignore clipboard read permission failures
    }
  };

  const handleStartExtraction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url || !url.trim()) {
      setErrorText('Veuillez saisir une URL de restaurant valide (ex: https://peppepizzeria.fr).');
      return;
    }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
      setUrl(normalizedUrl);
    }

    setIsExtracting(true);
    setErrorText(null);
    setResult(null);
    setCurrentStepIndex(0);
    setProgressPercent(10);
    setStatusText('🔍 Analyse du domaine et récupération des métadonnées du site...');

    const t1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setProgressPercent(30);
      setStatusText('🎨 Détection de la charte graphique, du logo et des bannières...');
    }, 600);

    const t2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setProgressPercent(55);
      setStatusText('🍽️ Numérisation du menu : plats signatures, tarifs, allergènes et photos...');
    }, 1400);

    const t3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setProgressPercent(75);
      setStatusText('📍 Géocodage de l\'adresse et calcul précis des coordonnées GPS...');
    }, 2200);

    const t4 = setTimeout(() => {
      setCurrentStepIndex(4);
      setProgressPercent(90);
      setStatusText('🎬 Sélection et attachement des capsules vidéo culinaires immersives...');
    }, 3000);

    try {
      const response = await fetch('/api/extract-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl })
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);

      const apiResult = await safeApiJson(
        response,
        'IA Scraper (/api/extract-website)'
      );

      if (!apiResult.ok) {
        setIsExtracting(false);
        setErrorText(apiResult.error || 'Erreur inconnue');
        return;
      }

      const data = apiResult.data;

      if (data && data.success && data.restaurant) {
        setCurrentStepIndex(5);
        setProgressPercent(100);
        setStatusText('✨ Vérification réussie ! Synchronisation Firestore et base locale terminée.');

        setTimeout(() => {
          setIsExtracting(false);
          setResult({
            restaurant: data.restaurant,
            dishes: data.dishes || [],
            videos: data.videos || []
          });
          onSuccess(data.restaurant, data.dishes || [], data.videos || []);
        }, 500);
      } else {
        setIsExtracting(false);
        const errMsg = (typeof data?.error === 'object' && data?.error?.message)
          ? data.error.message
          : (typeof data?.error === 'string' ? data.error : 'Impossible d\'extraire les données de cette URL. Veuillez vérifier le lien.');
        setErrorText(errMsg);
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setIsExtracting(false);
      setErrorText(`Erreur de connexion au serveur d'extraction : ${err.message}`);
    }
  };

  const handleStartBulkExtraction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const urls = bulkUrlsText
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 3 && (u.includes('.') || u.startsWith('http')));

    if (urls.length === 0) {
      setErrorText('Veuillez saisir au moins une URL de restaurant valide (une par ligne).');
      return;
    }

    setIsExtracting(true);
    setErrorText(null);
    setBulkResults(null);
    setBulkProgress({ current: 0, total: urls.length, currentUrl: urls[0] });

    try {
      const response = await fetch('/api/extract-websites-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });

      const apiResult = await safeApiJson(
        response,
        'IA Scraper (/api/extract-websites-bulk)'
      );

      if (!apiResult.ok) {
        setIsExtracting(false);
        setErrorText(apiResult.error || 'Erreur inconnue');
        return;
      }

      const data = apiResult.data;

      if (data && data.success) {
        setBulkResults({
          count: data.count,
          restaurants: data.restaurants || [],
          totalDishes: data.totalDishes || 0,
          totalVideos: data.totalVideos || 0,
          results: data.results || []
        });
        setIsExtracting(false);

        if (data.restaurants && data.restaurants.length > 0) {
          const firstRest = data.restaurants[0];
          const firstDishes = data.results[0]?.dishes || [];
          const firstVideos = data.results[0]?.videos || [];
          onSuccess(firstRest, firstDishes, firstVideos);
        }
      } else {
        setIsExtracting(false);
        const errMsg = (typeof data?.error === 'object' && data?.error?.message)
          ? data.error.message
          : (typeof data?.error === 'string' ? data.error : 'Erreur lors de l\'extraction en masse.');
        setErrorText(errMsg);
      }
    } catch (err: any) {
      setIsExtracting(false);
      setErrorText(`Erreur de communication avec le serveur d'extraction en masse : ${err.message}`);
    }
  };

  const handleReset = () => {
    setUrl('');
    setBulkUrlsText('');
    setResult(null);
    setBulkResults(null);
    setErrorText(null);
    setCurrentStepIndex(0);
    setProgressPercent(0);
    setIsExtracting(false);
  };

  const countUrlsInBulk = bulkUrlsText
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.length > 3 && (u.includes('.') || u.startsWith('http'))).length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl bg-[#0A0A0D] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
        id="import-from-url-dialog-container"
      >
        {/* Glowing top ambient border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 via-[#FF5C00] to-amber-400" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5C00]/15 border border-[#FF5C00]/30 flex items-center justify-center text-[#FF5C00] shadow-[0_0_20px_rgba(255,92,0,0.2)] shrink-0">
              <Globe size={20} className={isExtracting ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-sans">
                  IA Scraper de Restaurants
                </h3>
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold bg-[#FF5C00]/20 text-[#FF5C00] px-2 py-0.5 rounded-full border border-[#FF5C00]/30 flex items-center gap-1">
                  <Sparkles size={10} /> Mode Haute Fidélité
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Extraction complète : Images, Logos, Bannières, Vidéos, Tarifs, Téléphone, Email & Géolocalisation GPS
              </p>
            </div>
          </div>

          <button
            id="close-import-url-dialog-btn"
            onClick={onClose}
            disabled={isExtracting}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 shrink-0"
            title="Fermer la boîte de dialogue"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs (Single URL vs Bulk Multi-URLs) */}
        {!result && !bulkResults && (
          <div className="flex border-b border-white/5 bg-zinc-950/40 px-5 pt-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveMode('single');
                setErrorText(null);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
                activeMode === 'single'
                  ? 'bg-[#0A0A0D] text-white border-white/10 border-b-transparent shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent'
              }`}
            >
              <Globe size={13} className={activeMode === 'single' ? 'text-[#FF5C00]' : ''} />
              <span>URL Unique</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('bulk');
                setErrorText(null);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
                activeMode === 'bulk'
                  ? 'bg-[#0A0A0D] text-white border-white/10 border-b-transparent shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent'
              }`}
            >
              <ListPlus size={13} className={activeMode === 'bulk' ? 'text-[#FF5C00]' : ''} />
              <span>Import en Masse (Multi-URLs)</span>
              {countUrlsInBulk > 0 && (
                <span className="bg-[#FF5C00] text-black text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  {countUrlsInBulk}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* SINGLE URL MODE */}
          {activeMode === 'single' && !result && !bulkResults && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-300 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>URL du site internet du restaurant</span>
                  <span className="text-[10px] text-zinc-500 font-normal font-sans">
                    Site vitrine, menu en ligne, plateforme ou page officielle
                  </span>
                </label>

                <form onSubmit={handleStartExtraction} className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400 pointer-events-none">
                    <Globe size={16} />
                  </div>
                  <input
                    id="import-restaurant-url-input"
                    type="text"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (errorText) setErrorText(null);
                    }}
                    placeholder="https://peppepizzeria.fr ou https://popolare.bigmamma.fr"
                    disabled={isExtracting}
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl pl-10 pr-24 py-3.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/50 transition-all font-sans"
                    autoFocus
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {url && !isExtracting && (
                      <button
                        type="button"
                        onClick={() => setUrl('')}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 text-xs rounded-lg hover:bg-white/5 transition-all"
                        title="Effacer"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handlePaste}
                      disabled={isExtracting}
                      className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      title="Coller le lien copié"
                    >
                      <Copy size={11} />
                      <span>Coller</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Preset suggestion chips */}
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  Suggestions de sites pour tester l'import instantané :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_URLS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isExtracting}
                      onClick={() => {
                        setUrl(preset.url);
                        if (errorText) setErrorText(null);
                      }}
                      className={`text-[10px] px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        url === preset.url
                          ? 'bg-[#FF5C00]/20 border-[#FF5C00]/40 text-[#FF5C00] font-bold'
                          : 'bg-zinc-950 hover:bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Extraction Progress Animation */}
              {isExtracting && (
                <div className="bg-zinc-950/80 border border-[#FF5C00]/30 rounded-2xl p-5 space-y-4 shadow-[0_0_30px_rgba(255,92,0,0.1)] animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF5C00] animate-ping" />
                      <span className="text-xs font-black text-white uppercase tracking-wider font-sans">
                        Extraction IA en cours...
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#FF5C00]">
                      {progressPercent}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600 via-[#FF5C00] to-amber-400 transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <p className="text-xs text-orange-400 font-mono font-medium flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin shrink-0" />
                    <span>{statusText}</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    {VERIFICATION_STEPS.map((step, idx) => {
                      const isDone = currentStepIndex > idx;
                      const isCurrent = currentStepIndex === idx;
                      return (
                        <div 
                          key={step.id} 
                          className={`p-2 rounded-xl border flex items-start gap-2 text-[10px] transition-all ${
                            isDone 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                              : isCurrent 
                                ? 'bg-[#FF5C00]/10 border-[#FF5C00]/30 text-white shadow-[0_0_10px_rgba(255,92,0,0.1)]' 
                                : 'bg-zinc-950/40 border-white/5 text-zinc-600'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isDone ? (
                              <CheckCircle size={12} className="text-emerald-400" />
                            ) : isCurrent ? (
                              <div className="w-3 h-3 rounded-full border-2 border-[#FF5C00] border-t-transparent animate-spin" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-zinc-700" />
                            )}
                          </div>
                          <div>
                            <span className={`font-bold block ${isDone ? 'text-emerald-200' : isCurrent ? 'text-[#FF5C00]' : 'text-zinc-500'}`}>
                              {step.title}
                            </span>
                            <span className="text-[9px] text-zinc-500 leading-tight block font-sans">
                              {step.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BULK MULTI-URLS MODE */}
          {activeMode === 'bulk' && !result && !bulkResults && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-2">
                    <ListPlus size={14} className="text-[#FF5C00]" />
                    <span>Collez votre liste d'URLs de restaurants (une par ligne) :</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {countUrlsInBulk} URL{countUrlsInBulk > 1 ? 's' : ''} détectée{countUrlsInBulk > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={6}
                    value={bulkUrlsText}
                    onChange={(e) => {
                      setBulkUrlsText(e.target.value);
                      if (errorText) setErrorText(null);
                    }}
                    disabled={isExtracting}
                    placeholder={`https://popolare.bigmamma.fr\nhttps://peppepizzeria.fr\nhttps://lecamionquifume.com\nhttps://sanukiya-paris.fr`}
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/50 transition-all leading-relaxed"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePaste}
                      disabled={isExtracting}
                      className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={11} />
                      <span>Coller depuis le presse-papier</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk presets button */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Exemple rapide :
                </span>
                <button
                  type="button"
                  onClick={() => setBulkUrlsText(BULK_PRESETS[0])}
                  disabled={isExtracting}
                  className="text-[10px] px-3 py-1.5 rounded-xl border border-white/5 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={11} className="text-[#FF5C00]" />
                  <span>Charger 5 grands restaurants parisiens variés</span>
                </button>
              </div>

              {/* Bulk Extraction Live Indicator */}
              {isExtracting && (
                <div className="bg-zinc-950/80 border border-[#FF5C00]/30 rounded-2xl p-5 space-y-4 shadow-[0_0_30px_rgba(255,92,0,0.1)] animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF5C00] animate-ping" />
                      <span className="text-xs font-black text-white uppercase tracking-wider font-sans">
                        Extraction par lot en cours...
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#FF5C00]">
                      {countUrlsInBulk} restaurants en traitement
                    </span>
                  </div>

                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-orange-600 via-[#FF5C00] to-amber-400 w-full animate-pulse" />
                  </div>

                  <p className="text-xs text-orange-400 font-mono font-medium flex items-center gap-2">
                    <RefreshCw size={13} className="animate-spin shrink-0" />
                    <span>Scraping simultané des menus, tarifs, photos HD, logos, coordonnées GPS & vidéos...</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorText && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-xs text-red-300 animate-fade-in">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-200">Information d'extraction</p>
                <p className="text-zinc-300 leading-relaxed font-sans">{errorText}</p>
              </div>
            </div>
          )}

          {/* SINGLE RESULT CARD */}
          {result && (
            <div className="space-y-5 animate-fade-in">
              {/* Success Banner */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-sans">
                      Extraction Réussie & Synchronisée !
                    </h4>
                    <p className="text-[11px] text-emerald-400 font-sans">
                      Établissement, {result.dishes.length} plats (tarifs réels), coordonnées GPS géolocalisées et {result.videos?.length || 1} capsule vidéo ont été enregistrés.
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-md border border-emerald-500/30 hidden sm:inline-block">
                  SYNC FIRESTORE OK
                </span>
              </div>

              {/* Restaurant Preview Card */}
              <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                {/* Banner with Logo */}
                <div className="relative h-32 sm:h-40 bg-zinc-900 overflow-hidden">
                  {result.restaurant.bannerUrl ? (
                    <img 
                      src={result.restaurant.bannerUrl} 
                      alt={result.restaurant.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-zinc-900 to-zinc-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  
                  {/* Category & Rating */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-black uppercase text-white font-sans">
                      {result.restaurant.category}
                    </span>
                    <span className="px-2 py-1 bg-amber-500/90 text-black font-black text-[10px] rounded-lg">
                      ★ {result.restaurant.rating || 4.9}
                    </span>
                  </div>

                  {/* Logo and Name */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-900 border-2 border-white/20 overflow-hidden shadow-2xl shrink-0">
                      {result.restaurant.logoUrl ? (
                        <img 
                          src={result.restaurant.logoUrl} 
                          alt="Logo" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 font-black">
                          {result.restaurant.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 pb-0.5">
                      <h3 className="text-base sm:text-lg font-black text-white truncate tracking-tight font-sans">
                        {result.restaurant.name}
                      </h3>
                      {result.restaurant.slogan && (
                        <p className="text-[11px] text-zinc-300 truncate italic font-sans">
                          "{result.restaurant.slogan}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details & Metadata Grid */}
                <div className="p-4 space-y-3 bg-zinc-950">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-sans">
                    <div className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-white/5">
                      <MapPin size={12} className="text-[#FF5C00]" />
                      <span className="text-zinc-200 font-medium">{result.restaurant.address}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-white/5 font-mono text-[10px] text-zinc-400">
                      <span>GPS:</span>
                      <span className="text-[#FF5C00] font-bold">
                        {Number(result.restaurant.latitude).toFixed(4)}, {Number(result.restaurant.longitude).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-white/5 text-[10px] text-zinc-300">
                      <Store size={11} className="text-emerald-400" />
                      <span>{result.restaurant.dispositionShop || 'Paris'}</span>
                    </div>
                    {result.restaurant.phone && (
                      <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-white/5 text-[10px] text-zinc-300">
                        <Phone size={11} className="text-blue-400" />
                        <span>{result.restaurant.phone}</span>
                      </div>
                    )}
                    {result.restaurant.email && (
                      <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-white/5 text-[10px] text-zinc-300">
                        <Mail size={11} className="text-purple-400" />
                        <span>{result.restaurant.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Extracted Dishes Preview */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5 font-sans">
                        <Utensils size={12} className="text-[#FF5C00]" />
                        Menu & Tarifs Réels ({result.dishes.length} Plats)
                      </span>
                      <span className="text-[10px] text-zinc-500 font-sans">
                        Prêts pour le panier client & commande instantanée
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {result.dishes.map((dish) => (
                        <div 
                          key={dish.id} 
                          className="bg-zinc-900/60 border border-white/5 rounded-xl p-2.5 flex items-center gap-2.5 hover:border-white/10 transition-all"
                        >
                          <div className="w-11 h-11 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                            {dish.imageUrl ? (
                              <img 
                                src={dish.imageUrl} 
                                alt={dish.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                🍽️
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-white truncate font-sans">{dish.name}</h5>
                            <p className="text-[10px] text-zinc-400 truncate font-sans">{dish.category || 'Plat'}</p>
                          </div>
                          <span className="text-xs font-black text-[#FF5C00] font-mono shrink-0">
                            {Number(dish.price).toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Video Attachment Preview */}
                  {result.videos && result.videos.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5 font-sans">
                        <Film size={12} className="text-[#FF5C00]" />
                        Capsule Vidéo Immersive Associée (Feed 9:16)
                      </span>
                      <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs text-zinc-300">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                          <span className="truncate font-medium">{result.videos[0].title}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-2">Reel Vidéo HD</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BULK RESULTS GRID */}
          {bulkResults && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-sans">
                      Import en Masse Terminé avec Succès !
                    </h4>
                    <p className="text-[11px] text-emerald-400 font-sans">
                      {bulkResults.count} restaurants importés • {bulkResults.totalDishes} plats avec tarifs créés • {bulkResults.totalVideos} capsules vidéo associées
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/30">
                  {bulkResults.count} STORES
                </span>
              </div>

              {/* Grid of imported restaurants */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {bulkResults.restaurants.map((rest, idx) => (
                  <div 
                    key={rest.id || idx}
                    className="bg-zinc-950 border border-white/10 rounded-2xl p-3.5 space-y-2.5 hover:border-[#FF5C00]/40 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0">
                        {rest.logoUrl ? (
                          <img 
                            src={rest.logoUrl} 
                            alt={rest.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 font-black">
                            {rest.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-white truncate font-sans">{rest.name}</h4>
                          <span className="text-[9px] bg-amber-500/90 text-black px-1 rounded font-black shrink-0">
                            ★ {rest.rating || 4.9}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#FF5C00] font-bold uppercase truncate font-sans">{rest.category}</p>
                        <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1 mt-0.5 font-sans">
                          <MapPin size={10} className="shrink-0 text-zinc-500" />
                          <span>{rest.address}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-zinc-400 font-mono">
                      <span className="text-emerald-400 font-bold">GPS: {Number(rest.latitude).toFixed(4)}, {Number(rest.longitude).toFixed(4)}</span>
                      <span className="text-zinc-500">{rest.dispositionShop || 'Paris'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/80">
          {!result && !bulkResults ? (
            <>
              <p className="text-[10px] text-zinc-500 font-sans text-center sm:text-left">
                ⚡ L'IA extrait automatiquement logos, bannières, tarifs, adresses géocodées et capsules vidéo immersives.
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isExtracting}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/5 transition-all cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>

                {activeMode === 'single' ? (
                  <button
                    type="button"
                    onClick={() => handleStartExtraction()}
                    disabled={isExtracting || !url.trim()}
                    id="submit-extract-url-btn"
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-orange-600 via-[#FF5C00] to-amber-500 hover:opacity-95 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#FF5C00]/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 font-sans"
                  >
                    {isExtracting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Extraction...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Extraire par IA</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartBulkExtraction()}
                    disabled={isExtracting || countUrlsInBulk === 0}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-orange-600 via-[#FF5C00] to-amber-500 hover:opacity-95 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#FF5C00]/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 font-sans"
                  >
                    {isExtracting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Import en Masse ({countUrlsInBulk})...</span>
                      </>
                    ) : (
                      <>
                        <ListPlus size={14} />
                        <span>Lancer l'Import en Masse ({countUrlsInBulk})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={13} />
                <span>Importer d'autres sites</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/5 transition-all cursor-pointer"
                >
                  Fermer
                </button>
                {onOpenRestaurantInCms && result && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRestaurantInCms(result.restaurant);
                      onClose();
                    }}
                    className="flex-1 sm:flex-initial bg-[#FF5C00] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#FF5C00]/25 cursor-pointer flex items-center justify-center gap-2 font-sans"
                  >
                    <span>Éditer dans le CMS</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
