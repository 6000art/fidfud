import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  UploadCloud,
  Link as LinkIcon,
  Sparkles,
  Play,
  Volume2,
  VolumeX,
  Smartphone,
  Check,
  ShoppingBag,
  Film,
  Camera,
  Layers,
  Heart,
  MessageCircle,
  Share2,
  AlertCircle,
  ArrowRight,
  Plus,
  Trash2,
  FileVideo,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Restaurant, Dish, Video } from '../types';
import { getSafeVideoUrl, parseVideoSource, STABLE_CULINARY_FALLBACK_VIDEOS } from '../utils/videoUtils';
import { VideoRecorderStudio } from './VideoRecorderStudio';

export interface QueuedVideoItem {
  id: string;
  file?: File;
  name: string;
  sizeFormatted: string;
  previewUrl: string;
  uploadedUrl: string | null;
  status: 'waiting' | 'uploading' | 'ready' | 'error' | 'published';
  uploadProgress: number;
  title: string;
  associatedDishId?: string;
  errorMessage?: string;
  isAiGenerating?: boolean;
}

interface FastPostCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
  dishes: Dish[];
  onPostPublished: (video: Video) => void;
  onBulkPostsPublished?: (videos: Video[]) => void;
  initialDishId?: string;
  accentColor?: string;
}

type SourceMode = 'upload' | 'link' | 'camera' | 'demos';

const QUICK_HASHTAGS = [
  '#FaitMaison',
  '#FoodPorn',
  '#StreetFood',
  '#Chef',
  '#PlatDuJour',
  '#Gourmand',
  '#RestoParis',
  '#Halal',
  '#Bio',
  '#Miam'
];

const CULINARY_DEMO_PRESETS = [
  {
    id: 'demo-burger',
    title: 'Smash Burger XXL coulant de cheddar 🔥🍔',
    url: STABLE_CULINARY_FALLBACK_VIDEOS[0],
    caption: 'Notre Smash Burger signature : double steak croustillant, cheddar coulant et sauce secrète ! Qui a faim ? 🤤🍔 #burger #streetfood #foodporn #faitmaison',
    tag: 'Burger & Grill'
  },
  {
    id: 'demo-pizza',
    title: 'Pizza Napolitaine cuite au feu de bois 🍕✨',
    url: STABLE_CULINARY_FALLBACK_VIDEOS[1],
    caption: 'Pâte fermentée 72h, sauce tomate San Marzano et mozzarella di bufala filante. Un aller simple pour Naples ! 🇮🇹🍕 #pizza #italien #faitmaison #miam',
    tag: 'Italien & Pizza'
  },
  {
    id: 'demo-fresh',
    title: 'Bowl & Salade fraîcheur aux herbes fraîches 🥗🥑',
    url: STABLE_CULINARY_FALLBACK_VIDEOS[2],
    caption: 'Fraîcheur, vitamines et gourmandise ! Nos ingrédients sont sélectionnés chaque matin chez nos producteurs locaux. 🌱🥗 #healthy #fresh #bowls #faitmaison',
    tag: 'Healthy & Frais'
  },
  {
    id: 'demo-pasta',
    title: 'Pâtes fraîches maison et émulsion crémeuse 🍝🧄',
    url: STABLE_CULINARY_FALLBACK_VIDEOS[3],
    caption: 'L’onctuosité absolue de notre sauce maison préparée minute par le chef. Réconfort garanti ! 🤤🍝 #pasta #chef #gastronomie #faitmaison',
    tag: 'Pâtes & Sauces'
  }
];

export const FastPostCreatorModal: React.FC<FastPostCreatorModalProps> = ({
  isOpen,
  onClose,
  restaurant,
  dishes,
  onPostPublished,
  onBulkPostsPublished,
  initialDishId,
  accentColor = '#FF5E1A'
}) => {
  const [sourceMode, setSourceMode] = useState<SourceMode>('upload');
  
  // Single mode state
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [selectedDishId, setSelectedDishId] = useState<string>(initialDishId || '');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [detectedType, setDetectedType] = useState<'direct' | 'instagram' | 'tiktok' | 'youtube'>('direct');
  const [publishedSuccess, setPublishedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bulk processing state
  const [bulkQueue, setBulkQueue] = useState<QueuedVideoItem[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isBulkPublishing, setIsBulkPublishing] = useState<boolean>(false);
  const [bulkAiGenerating, setBulkAiGenerating] = useState<boolean>(false);
  const [publishedVideosList, setPublishedVideosList] = useState<Video[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Synchronize initial dish if specified
  useEffect(() => {
    if (initialDishId) {
      setSelectedDishId(initialDishId);
      const matched = dishes.find(d => d.id === initialDishId);
      if (matched && !videoTitle) {
        setVideoTitle(`Craquez pour notre savoureux ${matched.name} ! 🔥🤤 #faitmaison #${restaurant.name.replace(/\s+/g, '')}`);
      }
    }
  }, [initialDishId, dishes, restaurant.name]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      bulkQueue.forEach(item => {
        if (item.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  // Auto-detect link type whenever videoUrl changes
  useEffect(() => {
    if (!videoUrl) {
      setDetectedType('direct');
      return;
    }
    const clean = videoUrl.trim().toLowerCase();
    if (clean.includes('instagram.com/reel') || clean.includes('instagram.com/p/')) {
      setDetectedType('instagram');
    } else if (clean.includes('tiktok.com/')) {
      setDetectedType('tiktok');
    } else if (clean.includes('youtube.com/shorts') || clean.includes('youtu.be/')) {
      setDetectedType('youtube');
    } else {
      setDetectedType('direct');
    }
  }, [videoUrl]);

  if (!isOpen) return null;

  // Selected dish object
  const activeDish = dishes.find(d => d.id === selectedDishId);

  // Effective preview video
  const activeQueuedItem = bulkQueue[activeQueueIndex];
  const activePlayUrl = activeQueuedItem
    ? (activeQueuedItem.previewUrl || activeQueuedItem.uploadedUrl || STABLE_CULINARY_FALLBACK_VIDEOS[0])
    : (localPreviewUrl || videoUrl || STABLE_CULINARY_FALLBACK_VIDEOS[0]);

  const parsedMedia = parseVideoSource(activePlayUrl, { isPlaying: true, isMuted, loop: true });

  // Upload a single queued item to /api/upload
  const uploadQueueItem = async (itemId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulated smooth progress interval
      const progressTimer = setInterval(() => {
        setBulkQueue(prev => prev.map(item => {
          if (item.id === itemId && item.status === 'uploading') {
            const nextProg = Math.min(item.uploadProgress + 20, 90);
            return { ...item, uploadProgress: nextProg };
          }
          return item;
        }));
      }, 250);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      clearInterval(progressTimer);

      const data = await res.json();
      if (data.success && data.url) {
        setBulkQueue(prev => prev.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              uploadedUrl: data.url,
              status: 'ready',
              uploadProgress: 100
            };
          }
          return item;
        }));
      } else {
        throw new Error(data.error || 'Erreur téléversement');
      }
    } catch (err: any) {
      console.error(`[FastPostCreatorModal] Bulk upload error for item ${itemId}:`, err);
      setBulkQueue(prev => prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            status: 'error',
            errorMessage: "Erreur d'envoi. Cliquez pour réessayer."
          };
        }
        return item;
      }));
    }
  };

  // Handler for multiple dropped or selected files
  const handleFilesDropped = (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter(f => 
      f.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(f.name)
    );

    if (files.length === 0) {
      setErrorMessage("Veuillez sélectionner des fichiers vidéo valides (.mp4, .mov, .webm).");
      return;
    }
    setErrorMessage(null);

    // Create queued items for each file
    const newItems: QueuedVideoItem[] = files.map((file, idx) => {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const formattedTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      
      // Auto-match dish by substring comparison
      const matchedDish = dishes.find(d => 
        cleanName.toLowerCase().includes(d.name.toLowerCase()) || 
        d.name.toLowerCase().includes(cleanName.toLowerCase())
      );

      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

      return {
        id: `bulk_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        sizeFormatted: `${sizeMb} Mo`,
        previewUrl: URL.createObjectURL(file),
        uploadedUrl: null,
        status: 'uploading',
        uploadProgress: 15,
        title: matchedDish 
          ? `Découvrez la préparation minute de notre ${matchedDish.name} ! 🔥🤤 #faitmaison`
          : `${formattedTitle} en cuisine chez ${restaurant.name} ! ✨🔥 #foodporn #chef`,
        associatedDishId: matchedDish?.id || selectedDishId || undefined
      };
    });

    const startIndex = bulkQueue.length;
    setBulkQueue(prev => [...prev, ...newItems]);
    setActiveQueueIndex(startIndex);

    // If single file dropped and queue was empty, sync single preview states as well
    if (newItems.length === 1 && bulkQueue.length === 0) {
      setLocalPreviewUrl(newItems[0].previewUrl);
      setVideoTitle(newItems[0].title);
      if (newItems[0].associatedDishId) {
        setSelectedDishId(newItems[0].associatedDishId);
      }
    }

    // Trigger parallel simultaneous upload for all new items
    newItems.forEach(item => {
      if (item.file) {
        uploadQueueItem(item.id, item.file);
      }
    });
  };

  // Generate AI captions for all items in the bulk queue
  const handleBulkGenerateAiCaptions = async () => {
    if (bulkQueue.length === 0) return;
    setBulkAiGenerating(true);

    try {
      const updatedQueue = [...bulkQueue];
      for (let i = 0; i < updatedQueue.length; i++) {
        const item = updatedQueue[i];
        const dish = dishes.find(d => d.id === item.associatedDishId);

        try {
          const res = await fetch('/api/videos/generate-caption', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurantName: restaurant.name,
              dishName: dish?.name || item.name.replace(/\.[^/.]+$/, ""),
              dishDescription: dish?.description,
              keywords: dish ? `${dish.category} gourmand croustillant` : 'food chef plat délice'
            })
          });
          const data = await res.json();
          if (data.success && data.caption) {
            item.title = data.caption;
          }
        } catch (e) {
          console.warn(`[FastPostCreatorModal] AI caption failed for item ${i}`, e);
        }
      }
      setBulkQueue(updatedQueue);
      if (updatedQueue[activeQueueIndex]) {
        setVideoTitle(updatedQueue[activeQueueIndex].title);
      }
    } finally {
      setBulkAiGenerating(false);
    }
  };

  // AI Caption generation trigger for active video
  const handleGenerateAiCaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const res = await fetch('/api/videos/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: restaurant.name,
          dishName: activeDish?.name,
          dishDescription: activeDish?.description,
          keywords: activeDish ? `${activeDish.category} gourmand croustillant maison` : 'food streetfood chef'
        })
      });
      const data = await res.json();
      if (data.success && data.caption) {
        setVideoTitle(data.caption);
        if (bulkQueue[activeQueueIndex]) {
          setBulkQueue(prev => prev.map((it, idx) => idx === activeQueueIndex ? { ...it, title: data.caption } : it));
        }
      }
    } catch (err) {
      console.warn('[FastPostCreatorModal] AI Caption error:', err);
      const fallbackCap = `Craquez pour les délices de ${restaurant.name} préparés maison par notre chef ! 🔥🤤 #food #paris #faitmaison`;
      setVideoTitle(fallbackCap);
      if (bulkQueue[activeQueueIndex]) {
        setBulkQueue(prev => prev.map((it, idx) => idx === activeQueueIndex ? { ...it, title: fallbackCap } : it));
      }
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // Append hashtag to title
  const handleAddHashtag = (tag: string) => {
    setVideoTitle(prev => {
      const nextTitle = prev.includes(tag) ? prev : `${prev.trim()} ${tag}`.trim();
      if (bulkQueue[activeQueueIndex]) {
        setBulkQueue(q => q.map((it, idx) => idx === activeQueueIndex ? { ...it, title: nextTitle } : it));
      }
      return nextTitle;
    });
  };

  // Remove item from bulk queue
  const handleRemoveFromQueue = (indexToRemove: number) => {
    setBulkQueue(prev => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      if (activeQueueIndex >= filtered.length) {
        setActiveQueueIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  // Bulk Publish Handler
  const handleBulkPublish = async () => {
    const readyItems = bulkQueue.filter(item => item.status === 'ready' && item.uploadedUrl);
    if (readyItems.length === 0) {
      setErrorMessage("Aucune vidéo n'est encore prête à être publiée. Attendez la fin des téléversements.");
      return;
    }

    setIsBulkPublishing(true);
    setErrorMessage(null);

    const payloadItems = readyItems.map(item => ({
      videoUrl: item.uploadedUrl!,
      associatedDishId: item.associatedDishId || undefined,
      title: item.title.trim() || `Nouveau délice chez ${restaurant.name} ! ✨🔥`,
      isOnline: true,
      videoSourceType: 'direct' as const
    }));

    try {
      const res = await fetch('/api/videos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          items: payloadItems
        })
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la publication groupée.");
      }

      const result = await res.json();
      const createdVideos: Video[] = result.videos || [];
      setPublishedVideosList(createdVideos);
      setIsBulkPublishing(false);
      setPublishedSuccess(true);

      if (createdVideos.length > 0) {
        onPostPublished(createdVideos[0]);
      }
      if (onBulkPostsPublished) {
        onBulkPostsPublished(createdVideos);
      }
    } catch (err: any) {
      console.error('[FastPostCreatorModal] Bulk publish error:', err);
      setIsBulkPublishing(false);
      setErrorMessage("Erreur lors de la publication du lot. Veuillez réessayer.");
    }
  };

  // Single publish video handler
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    // If bulk queue has multiple items, use bulk publish
    if (bulkQueue.length > 1) {
      return handleBulkPublish();
    }

    const finalUrl = bulkQueue[0]?.uploadedUrl || bulkQueue[0]?.previewUrl || videoUrl || localPreviewUrl;
    if (!finalUrl) {
      setErrorMessage("Veuillez sélectionner ou enregistrer une vidéo.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Map source type
    let sourceType: 'direct' | 'instagram' | 'tiktok' | 'youtube_link' = 'direct';
    if (detectedType === 'instagram') sourceType = 'instagram';
    else if (detectedType === 'tiktok') sourceType = 'tiktok';
    else if (detectedType === 'youtube') sourceType = 'youtube_link';

    const payload = {
      restaurantId: restaurant.id,
      videoUrl: finalUrl,
      associatedDishId: selectedDishId || bulkQueue[0]?.associatedDishId || undefined,
      title: (videoTitle || bulkQueue[0]?.title || '').trim() || `Découvrez les créations de ${restaurant.name} ! ✨🔥`,
      isOnline: true,
      videoSourceType: sourceType,
      isLiveContinuous: false
    };

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Impossible d'enregistrer la publication");
      }

      const createdVideo = await res.json();
      setIsSubmitting(false);
      setPublishedVideosList([createdVideo]);
      setPublishedSuccess(true);
      onPostPublished(createdVideo);
    } catch (err: any) {
      console.error('[FastPostCreatorModal] Publish error:', err);
      setIsSubmitting(false);
      setErrorMessage("Une erreur est survenue lors de la publication. Réessayez dans un instant.");
    }
  };

  const readyCount = bulkQueue.filter(item => item.status === 'ready').length;
  const isQueueUploading = bulkQueue.some(item => item.status === 'uploading');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-5xl bg-[#0D0D10] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-[#121216]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5E1A] to-[#FF8C33] flex items-center justify-center text-white shadow-lg shadow-[#FF5E1A]/20">
              <Film size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">Studio Vidéo &amp; Téléversement par Lot</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-pink-500/20 to-teal-500/20 border border-pink-500/30 text-white flex items-center gap-1">
                  <span>TikTok • Reels • Bulk Upload</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Téléversez et traitez plusieurs vidéos simultanément avec glisser-déposer intuitif.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* SUCCESS CELEBRATION SCREEN */}
        {publishedSuccess ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center text-green-400 shadow-xl shadow-green-500/20 animate-bounce">
              <Check size={40} />
            </div>

            <div className="space-y-2 max-w-lg">
              <h4 className="text-2xl font-black text-white">
                {publishedVideosList.length > 1
                  ? `${publishedVideosList.length} Vidéos publiées en direct ! 🎉`
                  : 'Votre Reel est en ligne ! 🎉'}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {publishedVideosList.length > 1
                  ? `Vos ${publishedVideosList.length} vidéos ont été intégrées avec succès au feed de ${restaurant.name}. Vos clients peuvent dès maintenant découvrir vos plats et commander instantanément !`
                  : `Votre vidéo a été publiée avec succès sur le feed public de ${restaurant.name}. Les clients peuvent désormais la regarder, la liker et commander votre plat en 1 clic !`}
              </p>
            </div>

            {/* List of published videos */}
            {publishedVideosList.length > 1 && (
              <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2 text-left">
                {publishedVideosList.map((v, i) => (
                  <div key={v.id || i} className="flex items-center gap-2.5 p-2 bg-black/40 rounded-xl border border-zinc-800 text-xs">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                    <span className="text-white font-bold truncate flex-1">{v.title}</span>
                    <span className="text-[10px] text-zinc-400">En ligne</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  setPublishedSuccess(false);
                  setBulkQueue([]);
                  setPublishedVideosList([]);
                  setVideoUrl('');
                  setLocalPreviewUrl(null);
                  setVideoTitle('');
                  setSelectedDishId('');
                  setSourceMode('upload');
                }}
                className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={14} />
                <span>Publier d'autres vidéos</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-[#FF5E1A] hover:bg-[#FF3E00] text-xs font-black text-white transition-all shadow-lg shadow-[#FF5E1A]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Terminé &amp; Fermer</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* MAIN 2-COLUMN CREATION GRID */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto">
            {/* LEFT COLUMN: 9:16 LIVE SMARTPHONE PREVIEW */}
            <div className="lg:col-span-5 bg-black/60 p-5 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-zinc-850">
              <div className="flex items-center justify-between w-full max-w-[260px] mb-2 px-1">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <Smartphone size={12} className="text-[#FF5E1A]" />
                  <span>Aperçu Réel 9:16</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMuted(m => !m)}
                  className="p-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] flex items-center gap-1 transition-all"
                  title={isMuted ? "Activer le son" : "Couper le son"}
                >
                  {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} className="text-[#FF5E1A]" />}
                  <span>{isMuted ? 'Muet' : 'Son'}</span>
                </button>
              </div>

              {/* 9:16 PHONE FRAME */}
              <div className="relative w-[250px] sm:w-[270px] h-[480px] bg-black rounded-[36px] border-4 border-zinc-800 shadow-2xl overflow-hidden flex flex-col justify-between select-none">
                {/* Top Notch */}
                <div className="absolute top-2 inset-x-0 flex justify-center z-30 pointer-events-none">
                  <div className="w-16 h-3 bg-zinc-850 rounded-full" />
                </div>

                {/* Video Playback Layer */}
                <div className="absolute inset-0 z-10 w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                  {parsedMedia.isEmbed && parsedMedia.embedUrl ? (
                    <iframe
                      src={parsedMedia.embedUrl}
                      title="Aperçu vidéo"
                      className="w-full h-full border-0 pointer-events-auto object-cover"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <video
                      key={activePlayUrl}
                      ref={videoPreviewRef}
                      src={getSafeVideoUrl(activePlayUrl) || STABLE_CULINARY_FALLBACK_VIDEOS[0]}
                      autoPlay
                      muted={isMuted}
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                      }}
                    />
                  )}
                  {/* Subtle vignette gradient overlay */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/85 z-20" />
                </div>

                {/* TikTok-style floating action buttons on right */}
                <div className="absolute right-2 bottom-20 z-30 flex flex-col items-center gap-3 text-white">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <Heart size={14} className="text-red-500 fill-red-500" />
                    </div>
                    <span className="text-[9px] font-extrabold drop-shadow">1.4k</span>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <MessageCircle size={14} />
                    </div>
                    <span className="text-[9px] font-extrabold drop-shadow">48</span>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <Share2 size={14} />
                    </div>
                    <span className="text-[9px] font-extrabold drop-shadow">Partager</span>
                  </div>
                </div>

                {/* Top Overlay: Platform badge */}
                <div className="relative z-30 pt-6 px-3 flex items-center justify-between pointer-events-none">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center gap-1">
                    {detectedType === 'instagram' && '📸 Instagram Reel'}
                    {detectedType === 'tiktok' && '🎵 TikTok'}
                    {detectedType === 'youtube' && '▶️ YouTube Shorts'}
                    {detectedType === 'direct' && '🎥 Vidéo Fidfud'}
                  </span>
                  <span className="text-[10px] font-bold text-white drop-shadow">LIVE</span>
                </div>

                {/* Bottom Overlay: Restaurant Identity + Caption + Tagged Dish */}
                <div className="relative z-30 p-3 pb-4 space-y-2 pointer-events-none">
                  {/* Restaurant info */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/30 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {restaurant.logoUrl ? (
                        <img src={restaurant.logoUrl} alt={restaurant.name} className="w-full h-full object-cover" />
                      ) : (
                        restaurant.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-black text-white drop-shadow flex items-center gap-1 truncate">
                        <span>{restaurant.name}</span>
                        <span className="text-[#FF5E1A]">✓</span>
                      </p>
                      <p className="text-[9px] text-zinc-300 drop-shadow truncate">{restaurant.category || 'Cuisine Maison'}</p>
                    </div>
                  </div>

                  {/* Caption */}
                  <p className="text-[10px] text-white/95 font-medium leading-tight line-clamp-2 drop-shadow">
                    {videoTitle || (activeQueuedItem?.title) || `Venez découvrir notre spécialité chez ${restaurant.name} ! 🔥🍽️`}
                  </p>

                  {/* Attached Dish Mini Card */}
                  {activeDish && (
                    <div className="bg-black/80 backdrop-blur-md border border-[#FF5E1A]/40 rounded-xl p-1.5 flex items-center justify-between gap-2 shadow-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="w-6 h-6 rounded-lg bg-zinc-800 overflow-hidden shrink-0 border border-white/10">
                          {activeDish.imageUrl ? (
                            <img src={activeDish.imageUrl} alt={activeDish.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px]">🍽️</div>
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-[10px] font-black text-white truncate leading-tight">{activeDish.name}</p>
                          <p className="text-[9px] font-extrabold text-[#FF5E1A]">{activeDish.price.toFixed(2)} €</p>
                        </div>
                      </div>

                      <div className="px-2 py-0.5 bg-[#FF5E1A] text-white text-[9px] font-black rounded-lg shrink-0 flex items-center gap-1">
                        <ShoppingBag size={9} />
                        <span>Commander</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: SIMPLIFIED CONTROLS + DRAG & DROP ZONE */}
            <form onSubmit={handlePublish} className="lg:col-span-7 p-6 space-y-5 bg-[#0D0D10]">
              {/* SOURCE SELECTOR TABS */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                  1. Source d'importation
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceMode('upload')}
                    className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      sourceMode === 'upload'
                        ? 'bg-[#FF5E1A]/10 border-[#FF5E1A] text-white shadow-md'
                        : 'bg-[#121216] border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <UploadCloud size={16} className={sourceMode === 'upload' ? 'text-[#FF5E1A]' : ''} />
                    <span className="text-[11px] font-bold">Fichiers (Bulk)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceMode('link')}
                    className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      sourceMode === 'link'
                        ? 'bg-[#FF5E1A]/10 border-[#FF5E1A] text-white shadow-md'
                        : 'bg-[#121216] border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <LinkIcon size={16} className={sourceMode === 'link' ? 'text-[#FF5E1A]' : ''} />
                    <span className="text-[11px] font-bold">Coller un lien</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceMode('camera')}
                    className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      sourceMode === 'camera'
                        ? 'bg-[#FF5E1A]/10 border-[#FF5E1A] text-white shadow-md'
                        : 'bg-[#121216] border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <Camera size={16} className={sourceMode === 'camera' ? 'text-[#FF5E1A]' : ''} />
                    <span className="text-[11px] font-bold">Filmer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceMode('demos')}
                    className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      sourceMode === 'demos'
                        ? 'bg-[#FF5E1A]/10 border-[#FF5E1A] text-white shadow-md'
                        : 'bg-[#121216] border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <Sparkles size={16} className={sourceMode === 'demos' ? 'text-[#FF5E1A]' : ''} />
                    <span className="text-[11px] font-bold">Démos express</span>
                  </button>
                </div>
              </div>

              {/* DYNAMIC SOURCE PANELS */}
              <div className="bg-[#121216] border border-zinc-850 rounded-2xl p-4">
                {/* 1. MULTI-FILE DRAG & DROP ZONE & BULK QUEUE */}
                {sourceMode === 'upload' && (
                  <div className="space-y-4">
                    {/* Hidden multiple file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        handleFilesDropped(e.target.files);
                      }}
                    />

                    {/* DRAG AND DROP ZONE */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(true);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(false);
                        handleFilesDropped(e.dataTransfer.files);
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative overflow-hidden ${
                        isDraggingOver
                          ? 'border-[#FF5E1A] bg-[#FF5E1A]/15 shadow-xl shadow-[#FF5E1A]/10 scale-[1.01]'
                          : 'border-zinc-700 hover:border-[#FF5E1A] bg-black/20 hover:bg-[#FF5E1A]/5'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 ${
                        isDraggingOver
                          ? 'bg-[#FF5E1A] text-white scale-110 animate-bounce'
                          : 'bg-zinc-800 group-hover:bg-[#FF5E1A]/20 text-zinc-400 group-hover:text-[#FF5E1A]'
                      }`}>
                        <UploadCloud size={28} />
                      </div>
                      <p className="text-sm font-black text-white">
                        {isDraggingOver ? (
                          <span className="text-[#FF5E1A]">Déposez vos vidéos ici pour un traitement par lot !</span>
                        ) : (
                          <>
                            Glissez vos vidéos ici ou <span className="text-[#FF5E1A]">parcourez vos fichiers</span>
                          </>
                        )}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
                        Déposez 1 ou plusieurs vidéos simultanément (MP4, MOV, WebM). Téléversement parallèle en tâche de fond.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Traitement par lot simultané
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FF5E1A]/20 text-[#FF5E1A] border border-[#FF5E1A]/30">
                          Plusieurs fichiers acceptés
                        </span>
                      </div>
                    </div>

                    {/* BULK PROCESSING QUEUE */}
                    {bulkQueue.length > 0 && (
                      <div className="space-y-3 pt-1">
                        {/* Queue Header & Actions */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white flex items-center gap-1.5">
                              <FileVideo size={14} className="text-[#FF5E1A]" />
                              <span>File de traitement ({readyCount}/{bulkQueue.length} prêtes)</span>
                            </span>
                            {isQueueUploading && (
                              <span className="flex items-center gap-1 text-[10px] text-[#FF5E1A] font-bold animate-pulse">
                                <RefreshCw size={10} className="animate-spin" />
                                <span>Téléversement simultané...</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={bulkAiGenerating || bulkQueue.length === 0}
                              onClick={handleBulkGenerateAiCaptions}
                              className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-[10px] font-bold text-purple-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Générer des légendes IA pour toutes les vidéos de la liste"
                            >
                              <Sparkles size={11} className={bulkAiGenerating ? "animate-spin" : "text-pink-400"} />
                              <span>{bulkAiGenerating ? 'IA en cours...' : 'Légendes IA pour tout le lot'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={11} />
                              <span>Ajouter</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setBulkQueue([]);
                                setActiveQueueIndex(0);
                                setVideoTitle('');
                                setLocalPreviewUrl(null);
                              }}
                              className="p-1 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all text-[10px] cursor-pointer"
                              title="Vider la file"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* List of Queued Video Items */}
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                          {bulkQueue.map((item, idx) => {
                            const isSelected = idx === activeQueueIndex;
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setActiveQueueIndex(idx);
                                  setVideoTitle(item.title);
                                  if (item.associatedDishId) {
                                    setSelectedDishId(item.associatedDishId);
                                  }
                                }}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                                  isSelected
                                    ? 'bg-zinc-850/90 border-[#FF5E1A] shadow-md ring-1 ring-[#FF5E1A]/40'
                                    : 'bg-black/30 border-zinc-800 hover:border-zinc-700 hover:bg-black/50'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  {/* Left: Thumbnail & Name */}
                                  <div className="flex items-center gap-2.5 truncate flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 overflow-hidden shrink-0 relative border border-zinc-700 flex items-center justify-center">
                                      {item.previewUrl ? (
                                        <video
                                          src={item.previewUrl}
                                          className="w-full h-full object-cover"
                                          muted
                                          onError={(e) => {
                                            if (e.currentTarget.src !== STABLE_CULINARY_FALLBACK_VIDEOS[0]) {
                                              e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                                            }
                                          }}
                                        />
                                      ) : (
                                        <FileVideo size={16} className="text-zinc-500" />
                                      )}
                                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <Play size={10} className="text-white fill-white" />
                                      </div>
                                    </div>

                                    <div className="truncate flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                        <span className="text-[9px] text-zinc-500 shrink-0">({item.sizeFormatted})</span>
                                        {isSelected && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-[#FF5E1A] text-white shrink-0">
                                            Aperçu 📱
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{item.title}</p>
                                    </div>
                                  </div>

                                  {/* Right: Status Pill & Delete Button */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {item.status === 'ready' && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                                        <Check size={10} />
                                        <span>Prêt</span>
                                      </span>
                                    )}
                                    {item.status === 'uploading' && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FF5E1A]/20 text-[#FF5E1A] border border-[#FF5E1A]/30 flex items-center gap-1">
                                        <RefreshCw size={10} className="animate-spin" />
                                        <span>{item.uploadProgress}%</span>
                                      </span>
                                    )}
                                    {item.status === 'error' && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                                        <AlertCircle size={10} />
                                        <span>Erreur</span>
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromQueue(idx);
                                      }}
                                      className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                      title="Supprimer ce fichier"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                </div>

                                {/* Progress bar if uploading */}
                                {item.status === 'uploading' && (
                                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-[#FF5E1A] to-[#FF8C33] transition-all duration-300"
                                      style={{ width: `${item.uploadProgress}%` }}
                                    />
                                  </div>
                                )}

                                {/* Per-item Dish Selector */}
                                <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[10px] text-zinc-500 shrink-0 font-bold">Plat lié :</span>
                                  <select
                                    value={item.associatedDishId || ''}
                                    onChange={(e) => {
                                      const dishId = e.target.value;
                                      setBulkQueue(prev => prev.map((it, i) => i === idx ? { ...it, associatedDishId: dishId } : it));
                                      if (isSelected) setSelectedDishId(dishId);
                                    }}
                                    className="px-2 py-1 bg-zinc-900 border border-zinc-750 rounded-lg text-[10px] text-white focus:outline-none focus:border-[#FF5E1A] flex-1 cursor-pointer truncate"
                                  >
                                    <option value="">-- Aucun plat associé --</option>
                                    {dishes.map(d => (
                                      <option key={d.id} value={d.id}>
                                        {d.name} ({d.price.toFixed(2)} €)
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PASTE LINK WITH AUTO-DETECTION */}
                {sourceMode === 'link' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-white">
                        Collez l'URL de votre publication ou vidéo
                      </label>
                      <p className="text-[11px] text-zinc-400">
                        Auto-détection instantanée pour Instagram Reels, TikTok, YouTube Shorts ou lien MP4.
                      </p>
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://www.instagram.com/reel/... ou https://www.tiktok.com/@..."
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5E1A] pr-24"
                      />
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={() => setVideoUrl('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. LIVE CAMERA RECORDING */}
                {sourceMode === 'camera' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Camera size={14} className="text-[#FF5E1A]" />
                        <span>Tournage en Direct</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">Webcam ou caméra smartphone</span>
                    </div>

                    <VideoRecorderStudio
                      onVideoCaptured={(capturedUrl) => {
                        setLocalPreviewUrl(capturedUrl);
                        setVideoUrl(capturedUrl);
                      }}
                    />
                  </div>
                )}

                {/* 4. FAST DEMO PRESETS */}
                {sourceMode === 'demos' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Sélectionnez une démo culinaire</span>
                      <span className="text-[10px] text-zinc-400">1 clic pour tester</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CULINARY_DEMO_PRESETS.map((demo) => {
                        const isSelected = (videoUrl === demo.url || localPreviewUrl === demo.url);
                        return (
                          <button
                            key={demo.id}
                            type="button"
                            onClick={() => {
                              setVideoUrl(demo.url);
                              setLocalPreviewUrl(null);
                              setVideoTitle(demo.caption);
                              setDetectedType('direct');
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#FF5E1A]/10 border-[#FF5E1A] shadow-md'
                                : 'bg-black/30 border-zinc-800 hover:border-zinc-700 hover:bg-black/50'
                            }`}
                          >
                            <div className="w-12 h-14 rounded-lg bg-zinc-900 overflow-hidden shrink-0 relative">
                              <video
                                src={demo.url || STABLE_CULINARY_FALLBACK_VIDEOS[0]}
                                muted
                                loop
                                playsInline
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  if (e.currentTarget.src !== STABLE_CULINARY_FALLBACK_VIDEOS[0]) {
                                    e.currentTarget.src = STABLE_CULINARY_FALLBACK_VIDEOS[0];
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Play size={12} className="text-white fill-white" />
                              </div>
                            </div>
                            <div className="truncate space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-[#FF5E1A] tracking-wider block">{demo.tag}</span>
                              <p className="text-xs font-black text-white truncate">{demo.title}</p>
                              <p className="text-[10px] text-zinc-400 line-clamp-1">{demo.caption}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. CAPTION & HASHTAGS (LIKE TIKTOK / INSTAGRAM) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    2. Légende du Post &amp; Accroche
                  </label>

                  <button
                    type="button"
                    disabled={isGeneratingCaption}
                    onClick={handleGenerateAiCaption}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 hover:text-white hover:border-purple-400 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles size={12} className={isGeneratingCaption ? "animate-spin" : "text-pink-400"} />
                    <span>{isGeneratingCaption ? "Génération..." : "✨ Rédiger avec l'IA"}</span>
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={videoTitle}
                  onChange={(e) => {
                    setVideoTitle(e.target.value);
                    if (bulkQueue[activeQueueIndex]) {
                      setBulkQueue(q => q.map((it, idx) => idx === activeQueueIndex ? { ...it, title: e.target.value } : it));
                    }
                  }}
                  placeholder="Racontez l'histoire de ce plat, son goût croustillant, sa cuisson au feu de bois... 🔥🤤"
                  className="w-full px-3.5 py-2.5 bg-[#121216] border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5E1A] leading-relaxed resize-none"
                />

                {/* Clickable Quick Hashtags */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {QUICK_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddHashtag(tag)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        videoTitle.includes(tag)
                          ? 'bg-[#FF5E1A]/20 text-[#FF5E1A] border border-[#FF5E1A]/40'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. ATTACH DISH (OPTIONAL, VISUAL) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    3. Associer un plat du menu <span className="text-zinc-500 font-normal lowercase">(pour commande en 1 clic)</span>
                  </label>
                  {selectedDishId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDishId('');
                        if (bulkQueue[activeQueueIndex]) {
                          setBulkQueue(q => q.map((it, idx) => idx === activeQueueIndex ? { ...it, associatedDishId: undefined } : it));
                        }
                      }}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Détacher le plat
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedDishId}
                    onChange={(e) => {
                      const newDishId = e.target.value;
                      setSelectedDishId(newDishId);
                      if (bulkQueue[activeQueueIndex]) {
                        setBulkQueue(q => q.map((it, idx) => idx === activeQueueIndex ? { ...it, associatedDishId: newDishId } : it));
                      }
                      const d = dishes.find(dish => dish.id === newDishId);
                      if (d && !videoTitle) {
                        const newTitle = `Craquez pour notre ${d.name} préparé avec passion par le Chef ! 🔥🤤 #faitmaison #miam`;
                        setVideoTitle(newTitle);
                        if (bulkQueue[activeQueueIndex]) {
                          setBulkQueue(q => q.map((it, idx) => idx === activeQueueIndex ? { ...it, title: newTitle } : it));
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#121216] border border-zinc-850 rounded-xl text-xs text-white focus:outline-none focus:border-[#FF5E1A] cursor-pointer"
                  >
                    <option value="">-- Aucun plat associé (Vidéo d'ambiance ou de cuisine) --</option>
                    {dishes.map((dish) => (
                      <option key={dish.id} value={dish.id}>
                        {dish.name} — {dish.price.toFixed(2)} € {dish.category ? `(${dish.category})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ERROR BANNER */}
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-transparent transition-all cursor-pointer"
                >
                  Annuler
                </button>

                {bulkQueue.length > 1 ? (
                  <button
                    type="button"
                    disabled={isBulkPublishing || readyCount === 0}
                    onClick={handleBulkPublish}
                    className="px-6 py-3 bg-gradient-to-r from-[#FF5E1A] via-[#FF3E00] to-pink-600 hover:brightness-110 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-[#FF5E1A]/25 disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                  >
                    {isBulkPublishing ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Publication du lot en cours...</span>
                      </>
                    ) : (
                      <>
                        <Layers size={15} />
                        <span>🚀 Publier le lot ({readyCount}/{bulkQueue.length} prêtes)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading || isQueueUploading}
                    className="px-6 py-3 bg-gradient-to-r from-[#FF5E1A] to-[#FF3E00] hover:from-[#FF4E0A] hover:to-[#FF2E00] text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-[#FF5E1A]/25 disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Publication en cours...</span>
                      </>
                    ) : (
                      <>
                        <Film size={15} />
                        <span>🚀 Publier le Reel sur Fidfud</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};
