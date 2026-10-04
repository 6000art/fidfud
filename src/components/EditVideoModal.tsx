import React, { useState, useEffect } from 'react';
import { 
  X, 
  Film, 
  Store, 
  Utensils, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Tag, 
  Eye, 
  Flame, 
  Globe 
} from 'lucide-react';
import { Video, Restaurant, Dish } from '../types';
import { getSafeVideoUrl, STABLE_CULINARY_FALLBACK_VIDEOS } from '../utils/videoUtils';
import UniversalVideoPlayer from './UniversalVideoPlayer';

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
  restaurants: Restaurant[];
  dishes: Dish[];
  onVideoUpdated: (updatedVideo: Video) => void;
  showFeedbackToast: (message: string, type?: 'success' | 'error') => void;
}

const PRESET_VIDEO_CATEGORIES = [
  'Dégustation 😋',
  'Préparation en Cuisine 👨‍🍳',
  'Spécialité Maison ⭐',
  'Ambiance & Cadre ✨',
  'Nouveauté Menu 🔥',
  'Offre Spéciale 🏷️',
  'Street Food 🌮',
  'Desserts & Sucré 🍰'
];

export default function EditVideoModal({
  isOpen,
  onClose,
  video,
  restaurants,
  dishes,
  onVideoUpdated,
  showFeedbackToast
}: EditVideoModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [associatedDishId, setAssociatedDishId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // Initialize or reset form on video change or open
  useEffect(() => {
    if (video && isOpen) {
      setTitle(video.title || '');
      setDescription(video.description || '');
      setRestaurantId(video.restaurantId || (restaurants[0]?.id || ''));
      setAssociatedDishId(video.associatedDishId || video.dishId || '');
      setVideoUrl(video.videoUrl || '');
      setThumbnailUrl(video.thumbnailUrl || '');
      setIsOnline(video.isOnline !== false);
      setCategories(video.categories && video.categories.length > 0 ? video.categories : ['Dégustation 😋']);
      setPreviewError(false);
    }
  }, [video, isOpen, restaurants]);

  if (!isOpen || !video) return null;

  // Filter dishes for selected restaurant
  const filteredDishes = dishes.filter(d => d.restaurantId === restaurantId);
  const selectedDish = dishes.find(d => d.id === associatedDishId);
  const selectedRestaurant = restaurants.find(r => r.id === restaurantId);

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter(c => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTag.trim()) return;
    const tag = customTag.trim();
    if (!categories.includes(tag)) {
      setCategories([...categories, tag]);
    }
    setCustomTag('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showFeedbackToast('Veuillez renseigner un titre pour la vidéo.', 'error');
      return;
    }
    if (!restaurantId) {
      showFeedbackToast('Veuillez sélectionner un restaurant associé.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Video> = {
        title: title.trim(),
        description: description.trim(),
        restaurantId,
        restaurantName: selectedRestaurant?.name,
        associatedDishId: associatedDishId || undefined,
        dishId: associatedDishId || undefined,
        videoUrl: videoUrl.trim() || video.videoUrl,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        isOnline,
        categories
      };

      if (selectedDish) {
        payload.dishName = selectedDish.name;
        payload.dishPrice = selectedDish.price;
      }

      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la mise à jour de la vidéo');
      }

      const updatedVideo: Video = await res.json();
      onVideoUpdated(updatedVideo);
      showFeedbackToast('✨ Détails de la vidéo et plat associé mis à jour avec succès !', 'success');
      onClose();
    } catch (err: any) {
      console.error('[EditVideoModal] Error updating video:', err);
      showFeedbackToast(err.message || 'Impossible d\'enregistrer les modifications.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-[#0C0C0E] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#0C0C0E] via-zinc-950 to-[#0C0C0E] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5C00] to-amber-500 flex items-center justify-center shadow-lg shadow-[#FF5C00]/20 text-white shrink-0">
              <Film size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                Modifier les Détails de la Vidéo
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                ID: <span className="text-[#FF5C00]">{video.id}</span> • {selectedRestaurant?.name || 'Restaurant'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 font-sans">
          
          {/* Top Grid: Video Preview & Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start bg-zinc-950/70 border border-white/5 rounded-2xl p-4">
            
            {/* Video Player Preview (Left 4 cols) */}
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="w-full aspect-[9/14] max-w-[200px] bg-black rounded-xl overflow-hidden relative border border-white/10 shadow-inner group">
                <UniversalVideoPlayer
                  key={videoUrl || video.videoUrl}
                  src={videoUrl.trim() || video.videoUrl}
                  poster={thumbnailUrl.trim() || video.thumbnailUrl}
                  isPlaying={true}
                  isMuted={true}
                  loop={true}
                  showControls={true}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white uppercase font-mono z-20">
                  {isOnline ? '● En ligne' : '○ Masquée'}
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 font-mono text-center">
                Aperçu du rendu live
              </span>
            </div>

            {/* Main Form Fields (Right 8 cols) */}
            <div className="md:col-span-8 space-y-4">
              
              {/* Title Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Titre de la vidéo (Headline) *</span>
                  <span className="text-[10px] font-normal text-zinc-500 font-mono">{title.length}/100</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Savourez notre Burger Truffe & Cheddar affiné 🍔"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00] transition-colors"
                />
              </div>

              {/* Description Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Description & Slogan d'Accroche</span>
                  <span className="text-[10px] font-normal text-zinc-500 font-mono">{description.length}/300</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Préparé chaque matin avec notre viande bio locale et notre sauce secrète..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00] transition-colors resize-none"
                />
              </div>

              {/* Online status switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`} />
                  <div>
                    <p className="text-xs font-bold text-white">Statut de diffusion</p>
                    <p className="text-[10px] text-zinc-400">
                      {isOnline ? 'Diffusée dans le flux vidéo principal' : 'Brouillon privé / Masquée des clients'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOnline}
                    onChange={(e) => setIsOnline(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF5C00]"></div>
                </label>
              </div>

            </div>
          </div>

          {/* Section 2: Restaurant & Dish Mapping (The Core Feature) */}
          <div className="bg-gradient-to-b from-[#111114] to-zinc-950 border border-white/10 rounded-2xl p-5 space-y-4">
            
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Utensils size={16} className="text-[#FF5C00]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Association Restaurant & Plat au Panier (Dish Mapping)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Restaurant Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Store size={12} className="text-amber-400" />
                  Restaurant Propriétaire
                </label>
                <select
                  required
                  value={restaurantId}
                  onChange={(e) => {
                    const newRestId = e.target.value;
                    setRestaurantId(newRestId);
                    // If current associated dish doesn't belong to the newly selected restaurant, reset dish
                    const currentDishInNewRest = dishes.find(d => d.id === associatedDishId && d.restaurantId === newRestId);
                    if (!currentDishInNewRest) {
                      setAssociatedDishId('');
                    }
                  }}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] transition-colors"
                >
                  {restaurants.map((rest) => (
                    <option key={rest.id} value={rest.id}>
                      {rest.name} {rest.category ? `(${rest.category})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500">
                  La vidéo apparaîtra sur la fiche et le feed de ce restaurant.
                </p>
              </div>

              {/* Dish Mapping Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils size={12} className="text-[#FF5C00]" />
                  Plat Lié (Commande Directe)
                </label>
                <select
                  value={associatedDishId}
                  onChange={(e) => setAssociatedDishId(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] transition-colors font-sans"
                >
                  <option value="">-- Aucun plat associé (Vidéo d'ambiance générale) --</option>
                  
                  {filteredDishes.length > 0 ? (
                    <optgroup label={`Plats de ${selectedRestaurant?.name || 'ce restaurant'}`}>
                      {filteredDishes.map((dish) => (
                        <option key={dish.id} value={dish.id}>
                          🍽️ {dish.name} — {Number(dish.price).toFixed(2)} € {dish.isPopular ? '⭐ Populaire' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}

                  {/* Fallback for other dishes in catalog if desired */}
                  {dishes.filter(d => d.restaurantId !== restaurantId).length > 0 && (
                    <optgroup label="Autre plat du catalogue global">
                      {dishes.filter(d => d.restaurantId !== restaurantId).map((dish) => {
                        const r = restaurants.find(rest => rest.id === dish.restaurantId);
                        return (
                          <option key={dish.id} value={dish.id}>
                            🍽️ {dish.name} ({r?.name || 'Autre'}) — {Number(dish.price).toFixed(2)} €
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </select>

                <p className="text-[10px] text-zinc-500">
                  Permet aux clients d'ajouter ce plat directement à leur panier en 1 clic pendant la lecture vidéo.
                </p>
              </div>

            </div>

            {/* Selected Dish Summary Card */}
            {selectedDish ? (
              <div className="mt-2 p-3 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedDish.imageUrl ? (
                    <img 
                      src={selectedDish.imageUrl} 
                      alt={selectedDish.name} 
                      className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-lg shrink-0">
                      🍽️
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      Plat actif : <span className="text-[#FF5C00]">{selectedDish.name}</span>
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      Prix : <strong className="text-white font-mono">{Number(selectedDish.price).toFixed(2)} €</strong> • {selectedDish.category || 'Général'}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                  ✓ Lié au bouton d'achat
                </span>
              </div>
            ) : (
              <div className="mt-2 p-3 rounded-xl bg-zinc-900/50 border border-dashed border-white/5 text-center text-xs text-zinc-500">
                💡 Aucun plat sélectionné : La vidéo sera affichée comme teaser sans raccourci panier direct.
              </div>
            )}

          </div>

          {/* Section 3: Media URLs & Custom Tags */}
          <div className="bg-zinc-950/70 border border-white/5 rounded-2xl p-5 space-y-4">
            
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Tag size={16} className="text-amber-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Source Média & Tags Thématiques
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  URL de la Vidéo (MP4 / WebM / HLS)
                </label>
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setPreviewError(false);
                  }}
                  placeholder="https://.../video.mp4"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00] font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  URL de la Miniature (Optionnelle)
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://.../thumbnail.jpg"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00] font-mono"
                />
              </div>

            </div>

            {/* Categories & Preset Tags */}
            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Catégories de la Vidéo
              </label>

              <div className="flex flex-wrap gap-1.5">
                {PRESET_VIDEO_CATEGORIES.map((cat) => {
                  const isSelected = categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FF5C00] text-white shadow-md shadow-[#FF5C00]/20'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Add custom tag input */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Ajouter un tag personnalisé (ex: #Gourmand)..."
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5C00]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag(e);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  + Ajouter
                </button>
              </div>

            </div>

          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:from-[#FF7A00] hover:to-orange-500 text-white text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-lg shadow-[#FF5C00]/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Enregistrer les modifications</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
