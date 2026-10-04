import React, { useState, useEffect } from 'react';
import { STABLE_CULINARY_FALLBACK_VIDEOS, getSafeVideoUrl } from '../utils/videoUtils';
import { 
  X, 
  Download, 
  Trash2, 
  Play, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  HardDrive, 
  BookOpen, 
  Film, 
  Sparkles, 
  ShoppingBag, 
  Plus, 
  Store, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Video, Restaurant, Dish } from '../types';
import { offlineCacheService, DownloadedMenu } from '../services/OfflineCacheService';
import LazyImage from './LazyImage';

interface OfflineDownloadsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDish?: (dishId: string) => void;
  onAddToCart?: (dish: Dish, quantity: number) => void;
  onPlayVideo?: (video: Video) => void;
}

export default function OfflineDownloadsDrawer({
  isOpen,
  onClose,
  onSelectDish,
  onAddToCart,
  onPlayVideo
}: OfflineDownloadsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'videos' | 'menus'>('videos');
  const [downloadedVideos, setDownloadedVideos] = useState<Video[]>([]);
  const [downloadedMenus, setDownloadedMenus] = useState<DownloadedMenu[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ usedMB: string; videoCount: number; menuCount: number }>({
    usedMB: '0.00',
    videoCount: 0,
    menuCount: 0
  });
  const [isOnline, setIsOnline] = useState<boolean>(offlineCacheService.getIsOnline());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [expandedRestaurantId, setExpandedRestaurantId] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  const refreshDownloads = async () => {
    setDownloadedVideos(offlineCacheService.getDownloadedVideos());
    setDownloadedMenus(offlineCacheService.getDownloadedMenus());
    const est = await offlineCacheService.getStorageUsageEstimate();
    setStorageInfo({
      usedMB: est.usedMB,
      videoCount: est.videoCount,
      menuCount: est.menuCount
    });
    setIsOnline(offlineCacheService.getIsOnline());
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshDownloads();

    const unsubOnline = offlineCacheService.subscribe((online) => setIsOnline(online));
    const unsubDl = offlineCacheService.subscribeDownloads(() => refreshDownloads());

    return () => {
      unsubOnline();
      unsubDl();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRemoveVideo = (id: string, name: string) => {
    offlineCacheService.removeDownloadedVideo(id);
    showToast(`" ${name} " supprimée du mode hors-ligne`);
  };

  const handleRemoveMenu = (restId: string, restName: string) => {
    offlineCacheService.removeDownloadedMenu(restId);
    showToast(`Menu de " ${restName} " supprimé du mode hors-ligne`);
  };

  const handleClearAll = () => {
    if (window.confirm('Voulez-vous vraiment effacer tous les téléchargements hors-ligne ?')) {
      offlineCacheService.clearAllOfflineDownloads();
      showToast('Cache hors-ligne réinitialisé');
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0D0D0F] h-full flex flex-col border-l border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Header bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#121215] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5C00]/15 border border-[#FF5C00]/30 flex items-center justify-center text-[#FF5C00] shadow-lg shadow-[#FF5C00]/10">
              <Download size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-black text-sm uppercase tracking-wider">
                  Bibliothèque Hors-Ligne
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                  isOnline 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                  <span>{isOnline ? 'En ligne' : 'Hors-ligne'}</span>
                </span>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5 font-medium">
                Vidéos & Menus enregistrés sur votre appareil
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Storage usage indicator */}
        <div className="px-4 py-3 bg-[#16161B] border-b border-white/5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <HardDrive size={14} className="text-[#FF5C00]" />
            <span>Stockage utilisé : <strong className="text-white font-bold">{storageInfo.usedMB} MB</strong></span>
          </div>

          {(downloadedVideos.length > 0 || downloadedMenus.length > 0) && (
            <button
              onClick={handleClearAll}
              className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/20 transition-all cursor-pointer"
            >
              <Trash2 size={11} />
              <span>Tout effacer</span>
            </button>
          )}
        </div>

        {/* Toast notification */}
        {toastMsg && (
          <div className="bg-emerald-500/90 text-black px-4 py-2 text-xs font-bold font-mono text-center shadow-lg animate-fade-in flex items-center justify-center gap-2">
            <CheckCircle2 size={14} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Tabs navigation */}
        <div className="p-3 bg-[#0D0D0F] border-b border-white/5 grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('videos')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'videos'
                ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-md shadow-[#FF5C00]/20'
                : 'bg-[#151518] text-zinc-400 border-white/5 hover:text-white hover:bg-[#1A1A1E]'
            }`}
          >
            <Film size={14} />
            <span>Vidéos ({downloadedVideos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('menus')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'menus'
                ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-md shadow-[#FF5C00]/20'
                : 'bg-[#151518] text-zinc-400 border-white/5 hover:text-white hover:bg-[#1A1A1E]'
            }`}
          >
            <BookOpen size={14} />
            <span>Menus ({downloadedMenus.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
          
          {/* VIDEOS TAB */}
          {activeTab === 'videos' && (
            <>
              {downloadedVideos.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-600">
                    <Film size={28} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold uppercase">Aucune vidéo téléchargée</p>
                    <p className="text-zinc-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                      Cliquez sur l'icône <Download size={12} className="inline text-[#FF5C00]" /> Télécharger sur une vidéo pour la visionner plus tard hors-connexion.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {downloadedVideos.map((video) => (
                    <div 
                      key={video.id}
                      className="bg-[#151518] border border-white/10 rounded-2xl p-3 flex gap-3 hover:border-white/20 transition-all group relative overflow-hidden"
                    >
                      {/* Video Thumbnail */}
                      <div className="w-24 h-28 rounded-xl overflow-hidden relative shrink-0 bg-black shadow-inner">
                        {video.thumbnailUrl ? (
                          <LazyImage 
                            src={video.thumbnailUrl} 
                            alt={video.dishName || video.restaurantName} 
                            sizeType="thumbnail"
                            containerClassName="w-full h-full"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                            <Film size={24} />
                          </div>
                        )}

                        <button
                          onClick={() => {
                            if (onPlayVideo) {
                              onPlayVideo(video);
                              onClose();
                            } else {
                              setPreviewVideo(video);
                            }
                          }}
                          className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer"
                          title="Regarder la vidéo"
                        >
                          <div className="w-9 h-9 rounded-full bg-[#FF5C00] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play size={16} className="fill-current ml-0.5" />
                          </div>
                        </button>
                      </div>

                      {/* Video info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                              <ShieldCheck size={10} /> Dispo Hors-Ligne
                            </span>
                          </div>
                          <h4 className="text-white text-xs font-bold line-clamp-1 leading-snug">
                            {video.dishName || video.restaurantName}
                          </h4>
                          <p className="text-zinc-400 text-[11px] font-medium line-clamp-1 mt-0.5">
                            {video.restaurantName}
                          </p>
                          {video.dishPrice && (
                            <p className="text-[#FF5C00] text-xs font-black mt-1">
                              {video.dishPrice.toFixed(2)} €
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          {video.dishId && onSelectDish && (
                            <button
                              onClick={() => {
                                onSelectDish(video.dishId!);
                                onClose();
                              }}
                              className="text-[10px] font-black uppercase text-zinc-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Voir le plat</span>
                              <ArrowRight size={11} />
                            </button>
                          )}

                          <button
                            onClick={() => handleRemoveVideo(video.id, video.dishName || video.restaurantName)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer ml-auto"
                            title="Supprimer cette vidéo du cache"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* MENUS TAB */}
          {activeTab === 'menus' && (
            <>
              {downloadedMenus.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-600">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold uppercase">Aucun menu téléchargé</p>
                    <p className="text-zinc-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                      Ouvrez la fiche d'un restaurant et cliquez sur <Download size={12} className="inline text-[#FF5C00]" /> "Télécharger le Menu" pour le consulter hors-ligne.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {downloadedMenus.map(({ restaurant, dishes, downloadedAt }) => {
                    const isExpanded = expandedRestaurantId === restaurant.id;
                    return (
                      <div 
                        key={restaurant.id}
                        className="bg-[#151518] border border-white/10 rounded-2xl overflow-hidden transition-all"
                      >
                        {/* Restaurant Header */}
                        <div className="p-3.5 flex items-center justify-between gap-3 bg-[#1A1A1F]">
                          <div className="flex items-center gap-3 min-w-0">
                            {restaurant.logoUrl ? (
                              <LazyImage 
                                src={restaurant.logoUrl} 
                                alt={restaurant.name} 
                                sizeType="thumbnail"
                                containerClassName="w-11 h-11 rounded-xl shrink-0 border border-white/10 overflow-hidden bg-zinc-900"
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 text-zinc-500">
                                <Store size={20} />
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="text-white text-xs font-black truncate">{restaurant.name}</h4>
                              <p className="text-zinc-400 text-[10px] truncate">{restaurant.category} • {dishes.length} plat(s)</p>
                              <span className="text-[8px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1 mt-0.5">
                                <ShieldCheck size={9} /> Téléchargé le {new Date(downloadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setExpandedRestaurantId(isExpanded ? null : restaurant.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer border border-white/5"
                            >
                              {isExpanded ? 'Masquer' : 'Voir plats'}
                            </button>

                            <button
                              onClick={() => handleRemoveMenu(restaurant.id, restaurant.name)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer ce menu du cache"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Dishes list when expanded */}
                        {isExpanded && (
                          <div className="p-3 space-y-2 border-t border-white/5 bg-[#101013]">
                            {dishes.length === 0 ? (
                              <p className="text-xs text-zinc-500 italic text-center py-2">Aucun plat dans ce menu cache.</p>
                            ) : (
                              dishes.map((dish) => (
                                <div 
                                  key={dish.id} 
                                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-white/10 transition-all"
                                >
                                  <div 
                                    onClick={() => {
                                      if (onSelectDish) {
                                        onSelectDish(dish.id);
                                        onClose();
                                      }
                                    }}
                                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                                  >
                                    {dish.imageUrl && (
                                      <LazyImage 
                                        src={dish.imageUrl} 
                                        alt={dish.name} 
                                        sizeType="thumbnail"
                                        containerClassName="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-zinc-950 border border-white/5"
                                        className="w-full h-full object-cover" 
                                      />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-white text-xs font-bold truncate">{dish.name}</p>
                                      <p className="text-[#FF5C00] text-[11px] font-black">{dish.price.toFixed(2)} €</p>
                                    </div>
                                  </div>

                                  {onAddToCart && (
                                    <button
                                      onClick={() => onAddToCart(dish, 1)}
                                      className="p-1.5 rounded-lg bg-[#FF5C00] hover:bg-[#FF7A00] text-white transition-all cursor-pointer shrink-0 ml-2 shadow-sm active:scale-95"
                                      title="Ajouter au panier (mémorisé hors-ligne)"
                                    >
                                      <Plus size={14} className="stroke-[3]" />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer info banner */}
        <div className="p-3.5 bg-[#121215] border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-[#FF5C00]" />
            <span>Consultation hors-connexion active</span>
          </span>
          <button
            onClick={onClose}
            className="text-white font-bold uppercase hover:underline cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>

      {/* Embedded Video Preview Modal if user clicks play directly inside drawer */}
      {previewVideo && (
        <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/20 rounded-3xl max-w-lg w-full overflow-hidden p-4 space-y-3 relative">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-black text-sm">{previewVideo.dishName || previewVideo.restaurantName}</h4>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-full"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="w-full aspect-[9/16] max-h-[60vh] bg-black rounded-2xl overflow-hidden relative border border-white/10">
              <video
                src={getSafeVideoUrl(previewVideo.videoUrl) || STABLE_CULINARY_FALLBACK_VIDEOS[0]}
                controls
                autoPlay
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.warn('[OfflineDownloadsDrawer] Video error, falling back');
                  e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                }}
              />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              {previewVideo.description || 'Vidéo enregistrée dans le cache hors-ligne de votre navigateur.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
