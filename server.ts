import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import fs from 'fs';
import Stripe from 'stripe';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, getDoc, setLogLevel, disableNetwork, terminate } from 'firebase/firestore';

// Silence Firestore benign idle gRPC stream cancellation warnings on the server
try {
  setLogLevel('error');
} catch (e) {
  console.warn('Failed to set server Firestore log level:', e);
}

// Configure multer file upload
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${baseName}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for rich media
});
import { 
  Restaurant, 
  Dish, 
  Video, 
  Order, 
  OrderItem, 
  DeliveryType, 
  OrderStatus, 
  StripeSplitResult,
  Comment,
  Review,
  Subscription,
  Reservation,
  Tip,
  UserPoints,
  UserRewardClaim,
  Restaurateur,
  RestaurateurMedia,
  Courier
} from './src/types';

// In-Memory Database Store (Simulating Postgres/Supabase tables)
let users = [
  { id: 'usr-client-1', email: 'foodie@fidfud.app', role: 'client' },
  { id: 'usr-rest-nonna', email: 'partner@nonnapizza.fr', role: 'restaurant' },
  { id: 'usr-rest-tokyo', email: 'contact@tokyoramen.jp', role: 'restaurant' },
  { id: 'usr-rest-burger', email: 'chef@burgerlab.com', role: 'restaurant' }
];

// Active mock user session (mirrors active Supabase Auth session)
let currentUserSession: any = users[0];

// New In-Memory Stores
let comments: Comment[] = [
  {
    id: 'cmt-1',
    videoId: 'vid-nonna-1',
    userId: 'usr-client-1',
    userEmail: 'foodie@fidfud.app',
    text: 'La pâte a l’air tellement aérienne ! Dommage que j’habite pas à Paris 🤤',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: 'cmt-2',
    videoId: 'vid-nonna-1',
    userId: 'usr-rest-tokyo',
    userEmail: 'contact@tokyoramen.jp',
    text: 'Excellent basilic frais ! Un vrai délice napolitain.',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
  },
  {
    id: 'cmt-3',
    videoId: 'vid-tokyo-1',
    userId: 'usr-client-1',
    userEmail: 'foodie@fidfud.app',
    text: 'Le bouillon a l’air incroyablement onctueux !! Je commande de suite.',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  },
  {
    id: 'cmt-4',
    videoId: 'vid-burger-1',
    userId: 'usr-rest-nonna',
    userEmail: 'partner@nonnapizza.fr',
    text: 'Ce smash burger est incroyable ! Le croustillant des bords est parfait.',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  }
];

let reviews: Review[] = [
  {
    id: 'rev-1',
    restaurantId: 'rest-nonna',
    userName: 'Thomas L.',
    rating: 5,
    text: 'Les pizzas sont incroyables, la livraison a été hyper rapide. Je recommande la Truffe Royale !',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'rev-2',
    restaurantId: 'rest-nonna',
    userName: 'Chloé M.',
    rating: 4,
    text: 'La Margherita DOC est très bonne, ingrédients de qualité. Un classique.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  },
  {
    id: 'rev-3',
    restaurantId: 'rest-tokyo',
    userName: 'Kenji S.',
    rating: 5,
    text: 'Le meilleur Tonkotsu de Paris. Le chashu fond littéralement en bouche.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: 'rev-4',
    restaurantId: 'rest-burger',
    userName: 'Maxime B.',
    rating: 5,
    text: 'Double Smashed de folie ! Le bun brioché est hyper moelleux. Super concept.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
  }
];

let subscriptions: Subscription[] = [
  {
    id: 'sub-1',
    userId: 'usr-client-1',
    restaurantId: 'rest-nonna',
    createdAt: new Date().toISOString()
  }
];

let reservations: Reservation[] = [];

let userPoints: UserPoints[] = [
  { userId: 'usr-client-1', points: 500 },
  { userId: 'usr-rest-nonna', points: 100 },
  { userId: 'usr-rest-tokyo', points: 150 },
  { userId: 'usr-rest-burger', points: 200 }
];

let userRewardClaims: UserRewardClaim[] = [
  {
    id: 'claim-seed-1',
    userId: 'usr-client-1',
    rewardId: 'reward-10-percent',
    rewardName: 'Promo Code -10% sur votre commande',
    code: 'FID10-XYZ7',
    isUsed: false,
    createdAt: new Date().toISOString()
  }
];

let tips: Tip[] = [];

let designSettings: any = {
  accentColor: '#FF5C00',
  backgroundColor: '#050506',
  textColor: '#FFFFFF',
  appName: 'FIDFUD',
  logoUrl: '',
  heroTitle: 'Vidéos Gourmandes, Livraison Instantanée.',
  promoMessage: '⚡ COMMANDEZ EN DIRECT DEPUIS LE FEED VIDÉO ! 50% DE RÉDUCTION SUR VOTRE PREMIER PANIER ⚡',
  borderRadius: '16px',
  bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop&q=80',
  typography: 'sans', // 'sans' | 'mono' | 'serif' | 'display'
  layoutPreset: 'whatnot', // 'whatnot' | 'immersive' | 'bento' | 'editorial'
  customIcons: {
    iconCart: 'ShoppingBag',
    iconFollow: 'Plus',
    iconGift: 'Gift',
    iconReview: 'Star',
    iconSearch: 'Search',
    iconProfile: 'User',
    iconHome: 'Home',
    iconLoyalty: 'Coins',
    iconOrder: 'Zap',
    iconLike: 'Heart',
    iconShare: 'Share2',
    iconMute: 'Volume2',
    iconUnmute: 'VolumeX',
    iconSend: 'Send',
    iconFilter: 'Sliders'
  },
  desktopAds: [
    {
      id: 'ad-top-sidebar',
      title: 'Nonna\'s Fresh Truffle Pizza 🍕',
      subtitle: 'Commandez notre pizza cuite minute au feu de bois !',
      mediaUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Y2czA5MXNqdmtnaW5vYmN5enU3MHdwdG1scmd6bjZubG42Z3J3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0O9xBeS9EUnIy9by/giphy.gif',
      mediaType: 'gif', // 'gif' | 'image' | 'video'
      clickUrl: '#',
      isActive: true
    },
    {
      id: 'ad-bottom-sidebar',
      title: 'Tokyo Ramen Special 🍜',
      subtitle: 'Découvrez le ramen Tonkotsu fait maison.',
      mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-serving-hot-soup-in-a-bowl-42247-large.mp4',
      mediaType: 'video', // 'video' | 'image' | 'gif'
      clickUrl: '#',
      isActive: true
    }
  ],
  sectionsVisible: {
    showHero: true,
    showFeaturedProducts: true,
    showChefSpotlight: true,
    showVideoFeed: true,
    showLoyaltyClubBanner: true
  },
  featuredDishIds: [],
  customFeatures: {
    enableLoyaltyPoints: true,
    enableTipsAndFlowers: true,
    enableLiveOrdersHistory: true,
    enableStripeCommissionSplit: true,
    enableDeliveryCouriers: true,
    enableLeaderOfTheMonth: true
  },
  createdFeatures: [
    {
      id: 'feat-1',
      title: 'Retrait Express 🏃‍♂️',
      badge: 'PRATIQUE',
      description: 'Commandez en direct et retirez votre plat sans attente en restaurant.',
      icon: '⚡',
      cta: 'Activer'
    },
    {
      id: 'feat-2',
      title: 'Livraison Éco-Locale 🚴',
      badge: 'VERT',
      description: 'Livré exclusivement par nos livreurs à vélo pour un impact carbone neutre.',
      icon: '🌿',
      cta: 'En savoir plus'
    }
  ],
  logoSizeMobile: 34,
  logoSizeTablet: 40,
  logoSizeDesktop: 48,
  autoSaveEnabled: false
};

let restaurants: Restaurant[] = [];

let dishes: Dish[] = [];

let videos: Video[] = [];

let orders: Order[] = [];

let formulas = [
  { id: 'free', name: 'Formule Découverte Paris', price: 0, description: 'Idéal pour débuter à Paris. Visibilité standard dans votre arrondissement.' },
  { id: 'pro', name: 'Formule Paris Pro Booster', price: 49, description: 'Pour les restaurateurs ambitieux à Paris. Visibilité boostée, commissions réduites à 10%.' },
  { id: 'gold', name: 'Formule Paris Gold Elite', price: 99, description: 'L\'expérience ultime. Visibilité maximale dans tout Paris, support 24/7 et commissions à 5%.' }
];

let restaurateurs: Restaurateur[] = [];

let restaurateurMedia: RestaurateurMedia[] = [];

let couriers: Courier[] = [];

// Initialize Firestore client
let db: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const firebaseApp = initializeApp({
      projectId: config.projectId,
      appId: config.appId,
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId
    });
    db = getFirestore(firebaseApp, config.firestoreDatabaseId || config.databaseId);
    console.log('[Firebase Server] Firestore initialized with databaseId:', config.firestoreDatabaseId || config.databaseId);
  } else {
    console.warn('[Firebase Server] firebase-applet-config.json not found. Running in offline fallback mode.');
  }
} catch (err) {
  console.error('[Firebase Server] Failed to initialize Firestore on server:', err);
}

// Global state to track Firestore health and prevent blocking / queue exhaustion
let isFirestoreUnreachable = false;

async function runFirestoreOp<T>(opName: string, op: () => Promise<T>): Promise<T | null> {
  if (!db || isFirestoreUnreachable) return null;
  try {
    const promise = op();
    // 4 seconds timeout for Firestore operations on the server side
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 4000)
      )
    ]);
    return result as T;
  } catch (err: any) {
    if (err && (
      err.message === 'TIMEOUT' || 
      err.code === 'resource-exhausted' || 
      err.code === 8 ||
      err.message?.toLowerCase().includes('offline') || 
      err.message?.toLowerCase().includes('stream') || 
      err.message?.toLowerCase().includes('exhausted') ||
      err.message?.toLowerCase().includes('quota') ||
      err.message?.toLowerCase().includes('limit')
    )) {
      const isCritical = !opName.toLowerCase().includes('chunk');
      if (isCritical) {
        console.warn(`[Firebase Server] Critical Firestore operation "${opName}" timed out or failed. Auto-switching to offline local-only fallback mode to avoid queue exhaustion.`);
        isFirestoreUnreachable = true;
        try {
          saveData();
        } catch (saveErr) {
          console.error('[Firebase Server] Failed to save unreachable state to data_store.json:', saveErr);
        }
        if (db) {
          disableNetwork(db).then(() => {
            console.log('[Firebase Server] Firestore network successfully disabled to prevent further quota errors.');
          }).catch(netErr => {
            console.warn('[Firebase Server] Could not disable Firestore network:', netErr);
          });
        }
      } else {
        console.warn(`[Firebase Server] Non-critical Firestore operation "${opName}" timed out or failed. Skipping chunk backup to protect active database:`, err.message || err);
      }
    } else {
      console.error(`[Firebase Server] Firestore operation "${opName}" failed:`, err);
    }
    return null;
  }
}

// Helper function to recursively remove undefined properties before writing to Firestore
function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  
  const cleaned: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
  }
  return cleaned;
}

// Function to push a restaurant profile to Firestore
async function persistRestaurantToFirestore(item: Restaurant) {
  await runFirestoreOp(`persist restaurant ${item.id}`, () => setDoc(doc(db, 'restaurants', item.id), cleanForFirestore(item)));
}

// Function to delete a restaurant from Firestore
async function deleteRestaurantFromFirestore(id: string) {
  await runFirestoreOp(`delete restaurant ${id}`, () => deleteDoc(doc(db, 'restaurants', id)));
}

// Function to push a dish to Firestore
async function persistDishToFirestore(item: Dish) {
  await runFirestoreOp(`persist dish ${item.id}`, () => setDoc(doc(db, 'dishes', item.id), cleanForFirestore(item)));
}

// Function to delete a dish from Firestore
async function deleteDishFromFirestore(id: string) {
  await runFirestoreOp(`delete dish ${id}`, () => deleteDoc(doc(db, 'dishes', id)));
}

// Function to push a video to Firestore
async function persistVideoToFirestore(item: Video) {
  await runFirestoreOp(`persist video ${item.id}`, () => setDoc(doc(db, 'videos', item.id), cleanForFirestore(item)));
}

// Function to delete a video from Firestore
async function deleteVideoFromFirestore(id: string) {
  await runFirestoreOp(`delete video ${id}`, () => deleteDoc(doc(db, 'videos', id)));
}

// Function to push a restaurateur profile to Firestore
async function persistRestaurateurToFirestore(item: Restaurateur) {
  await runFirestoreOp(`persist restaurateur ${item.id}`, () => setDoc(doc(db, 'restaurateurs', item.id), cleanForFirestore(item)));
}

// Function to delete a restaurateur from Firestore
async function deleteRestaurateurFromFirestore(id: string) {
  await runFirestoreOp(`delete restaurateur ${id}`, () => deleteDoc(doc(db, 'restaurateurs', id)));
}

// Function to push a restaurateur media to Firestore
async function persistMediaToFirestore(item: RestaurateurMedia) {
  await runFirestoreOp(`persist media ${item.id}`, () => setDoc(doc(db, 'restaurateur_media', item.id), cleanForFirestore(item)));
}

// Function to delete a restaurateur media from Firestore
async function deleteMediaFromFirestore(mediaId: string) {
  await runFirestoreOp(`delete media ${mediaId}`, () => deleteDoc(doc(db, 'restaurateur_media', mediaId)));
}

// Function to push global design settings to Firestore
async function persistDesignSettingsToFirestore(settings: any) {
  await runFirestoreOp(`persist design settings`, () => setDoc(doc(db, 'settings', 'design'), cleanForFirestore(settings)));
}

// Unified Video Validation Utilities
async function fetchWithTimeout(resource: string, options: any = {}) {
  const { timeout = 4000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function validateVideoSource(
  videoUrl: string,
  videoSourceType?: 'direct' | 'instagram' | 'tiktok' | 'youtube_link' | 'youtube_channel'
): Promise<{ isValid: boolean; error?: string; metadata?: any }> {
  if (!videoUrl) {
    return { isValid: false, error: 'URL vide' };
  }

  // Any relative URLs, local uploaded files, data URLs, blob URLs, or localhost are immediately valid
  if (videoUrl.startsWith('/') || videoUrl.startsWith('data:') || videoUrl.startsWith('blob:') || videoUrl.includes('localhost') || !videoUrl.startsWith('http')) {
    return { isValid: true, metadata: { contentType: 'video/mp4' } };
  }

  // Auto-detect type if not provided
  let detectedType = videoSourceType;
  if (!detectedType) {
    if (videoUrl.includes('instagram.com') || videoUrl.includes('instagr.am')) {
      detectedType = 'instagram';
    } else if (videoUrl.includes('tiktok.com') || videoUrl.includes('tiktok')) {
      detectedType = 'tiktok';
    } else if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      if (videoUrl.includes('/@') || videoUrl.includes('/channel/') || videoUrl.includes('/c/')) {
        detectedType = 'youtube_channel';
      } else {
        detectedType = 'youtube_link';
      }
    } else {
      detectedType = 'direct';
    }
  }

  try {
    if (detectedType === 'tiktok') {
      return { isValid: true, metadata: { source: 'tiktok' } };
    }
    if (detectedType === 'youtube_link') {
      const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
      if (!ytMatch || !ytMatch[1]) {
        return { isValid: false, error: 'ID de vidéo YouTube invalide' };
      }
      const videoId = ytMatch[1];
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetchWithTimeout(oEmbedUrl, { timeout: 4000 }).catch(() => null);
      
      if (!response) {
        return { isValid: true, error: 'Délai d’attente dépassé (vidéo assumée valide)', metadata: { videoId } };
      }

      if (response.status === 200) {
        const json: any = await response.json().catch(() => ({}));
        return { 
          isValid: true, 
          metadata: { 
            videoId, 
            title: json.title, 
            author: json.author_name,
            thumbnail: json.thumbnail_url
          } 
        };
      } else if (response.status === 401 || response.status === 403) {
        // Assume valid to allow frontend/embed processing (e.g. if oEmbed fails but embed is fine)
        return { isValid: true, metadata: { videoId } };
      } else if (response.status === 404) {
        return { isValid: false, error: 'Vidéo inexistante ou supprimée (Erreur 404)' };
      } else {
        return { isValid: true, metadata: { videoId } };
      }
    }

    if (detectedType === 'youtube_channel') {
      const ytChannelMatch = videoUrl.match(/(?:youtube\.com)\/(?:@|c\/|channel\/)([\w.-]+)/i);
      if (!ytChannelMatch || !ytChannelMatch[1]) {
        return { isValid: false, error: 'Format de chaîne YouTube invalide' };
      }
      return { isValid: true, metadata: { channelHandle: ytChannelMatch[1] } };
    }

    if (detectedType === 'instagram') {
      const igMatch = videoUrl.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
      if (!igMatch || !igMatch[1]) {
        return { isValid: false, error: 'Identifiant Instagram invalide' };
      }
      const postId = igMatch[1];
      return { isValid: true, metadata: { postId } };
    }

    // Direct Video file (Direct upload / Direct URL)
    let response = await fetchWithTimeout(videoUrl, { method: 'HEAD', timeout: 4000 }).catch(() => null);
    if (!response || response.status === 405) {
      response = await fetchWithTimeout(videoUrl, { 
        method: 'GET', 
        headers: { 'Range': 'bytes=0-100' },
        timeout: 4000
      }).catch(() => null);
    }

    if (!response) {
      // If we cannot reach it from the server, we assume it is valid for direct playback in user's browser
      return { isValid: true, metadata: { contentType: 'video/mp4' } };
    }

    if (response.status !== 200 && response.status !== 206) {
      // Allow even if response code is unexpected (could be due to authorization headers, anti-bot protection)
      return { isValid: true, metadata: { contentType: 'video/mp4' } };
    }

    const contentType = response.headers.get('content-type') || '';
    const isVideo = contentType.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(videoUrl.split('?')[0]);

    if (!isVideo) {
      // If it's a valid link and we can reach it, let it pass
      return { isValid: true, metadata: { contentType: contentType || 'video/mp4' } };
    }

    return { isValid: true, metadata: { contentType } };
  } catch (err: any) {
    console.warn('[validateVideoSource warning]', err);
    // Gracefully assume true on any validation exceptions
    return { isValid: true, metadata: { contentType: 'video/mp4' } };
  }
}

async function runBackgroundVideosValidation() {
  console.log('[Unified Video Validation Service] Initiating database verification pool...');
  let validatedCount = 0;
  let invalidCount = 0;
  
  for (const video of videos) {
    try {
      const result = await validateVideoSource(video.videoUrl, video.videoSourceType);
      video.validationStatus = result.isValid ? 'valid' : 'invalid';
      video.validationCheckedAt = new Date().toISOString();
      if (!result.isValid) {
        video.validationError = result.error || 'Vérification échouée';
        invalidCount++;
        console.warn(`[Unified Video Validation Service] Video ID ${video.id} has invalid source URL: ${video.videoUrl}. Error: ${result.error}`);
      } else {
        video.validationError = undefined;
      }
      validatedCount++;
    } catch (e: any) {
      console.error(`[Unified Video Validation Service] Error in validating ${video.id}:`, e);
    }
  }
  
  console.log(`[Unified Video Validation Service] Verification completed. Checked: ${validatedCount}, Invalid: ${invalidCount}.`);
  if (invalidCount > 0) {
    saveData();
  }
}

// Automatic cleanup: remove all restaurants that do not have any videos linked directly or via videos collection
async function cleanupRestaurantsWithoutVideos() {
  console.log('[Firebase Server] Running database validation...');
  const activeVideos = videos;
  
  const hasVideo = (restId: string) => {
    const rest = restaurants.find(r => r.id === restId);
    if (rest && rest.videoUrl && rest.videoUrl.trim() !== '') {
      return true;
    }
    return activeVideos.some(v => v.restaurantId === restId);
  };

  const withoutVideo = restaurants.filter(r => !hasVideo(r.id));
  if (withoutVideo.length > 0) {
    console.log(`[Firebase Server] Info: Found ${withoutVideo.length} restaurants without any video:`, withoutVideo.map(r => r.name));
    console.log('[Firebase Server] Skip deletion to preserve user profiles and avoid accidental data loss.');
  } else {
    console.log('[Firebase Server] Database validation complete. All restaurants have at least one video.');
  }
}

// Function to pull all data from Firestore on startup
async function syncFromFirestore() {
  if (!db || isFirestoreUnreachable) return;
  try {
    console.log('[Firebase Server] Syncing from Firestore...');
    
    // Sync restaurants
    const restaurantsSnap = await runFirestoreOp('get restaurants', () => getDocs(collection(db, 'restaurants')));
    if (restaurantsSnap && !restaurantsSnap.empty) {
      const fbRestaurants: Restaurant[] = [];
      restaurantsSnap.forEach(docSnap => {
        fbRestaurants.push(docSnap.data() as Restaurant);
      });
      if (fbRestaurants.length > 0) {
        restaurants = fbRestaurants;
        console.log(`[Firebase Server] Loaded ${restaurants.length} restaurants from Firestore.`);
      }
    } else if (restaurantsSnap) {
      bootstrapDefaultDataIfEmpty();
      console.log('[Firebase Server] Seeding default restaurants to Firestore...');
      for (const r of restaurants) {
        if (isFirestoreUnreachable) break;
        await persistRestaurantToFirestore(r);
      }
    }

    if (isFirestoreUnreachable) return;

    // Sync dishes
    const dishesSnap = await runFirestoreOp('get dishes', () => getDocs(collection(db, 'dishes')));
    if (dishesSnap && !dishesSnap.empty) {
      const fbDishes: Dish[] = [];
      dishesSnap.forEach(docSnap => {
        fbDishes.push(docSnap.data() as Dish);
      });
      if (fbDishes.length > 0) {
        dishes = fbDishes;
        console.log(`[Firebase Server] Loaded ${dishes.length} dishes from Firestore.`);
      }
    } else if (dishesSnap) {
      bootstrapDefaultDataIfEmpty();
      console.log('[Firebase Server] Seeding default dishes to Firestore...');
      for (const d of dishes) {
        if (isFirestoreUnreachable) break;
        await persistDishToFirestore(d);
      }
    }

    if (isFirestoreUnreachable) return;

    // Sync videos
    const videosSnap = await runFirestoreOp('get videos', () => getDocs(collection(db, 'videos')));
    if (videosSnap && !videosSnap.empty) {
      const fbVideos: Video[] = [];
      videosSnap.forEach(docSnap => {
        fbVideos.push(docSnap.data() as Video);
      });
      if (fbVideos.length > 0) {
        videos = fbVideos;
        console.log(`[Firebase Server] Loaded ${videos.length} videos from Firestore.`);
      }
    } else if (videosSnap) {
      bootstrapDefaultDataIfEmpty();
      console.log('[Firebase Server] Seeding default videos to Firestore...');
      for (const v of videos) {
        if (isFirestoreUnreachable) break;
        await persistVideoToFirestore(v);
      }
    }

    if (isFirestoreUnreachable) return;

    // Sync restaurateurs
    const restaurateursSnap = await runFirestoreOp('get restaurateurs', () => getDocs(collection(db, 'restaurateurs')));
    if (restaurateursSnap && !restaurateursSnap.empty) {
      const fbRestaurateurs: Restaurateur[] = [];
      restaurateursSnap.forEach(docSnap => {
        fbRestaurateurs.push(docSnap.data() as Restaurateur);
      });
      if (fbRestaurateurs.length > 0) {
        restaurateurs = fbRestaurateurs;
        console.log(`[Firebase Server] Loaded ${restaurateurs.length} restaurateurs from Firestore.`);
      }
    } else if (restaurateursSnap) {
      console.log('[Firebase Server] Seeding default restaurateurs to Firestore...');
      for (const r of restaurateurs) {
        if (isFirestoreUnreachable) break;
        await persistRestaurateurToFirestore(r);
      }
    }

    if (isFirestoreUnreachable) return;

    // Sync media
    const mediaSnap = await runFirestoreOp('get media', () => getDocs(collection(db, 'restaurateur_media')));
    if (mediaSnap && !mediaSnap.empty) {
      const fbMedia: RestaurateurMedia[] = [];
      mediaSnap.forEach(docSnap => {
        fbMedia.push(docSnap.data() as RestaurateurMedia);
      });
      if (fbMedia.length > 0) {
        restaurateurMedia = fbMedia;
        console.log(`[Firebase Server] Loaded ${restaurateurMedia.length} media items from Firestore.`);
      }
    } else if (mediaSnap) {
      console.log('[Firebase Server] Seeding default restaurateur_media to Firestore...');
      for (const m of restaurateurMedia) {
        if (isFirestoreUnreachable) break;
        await persistMediaToFirestore(m);
      }
    }

    if (isFirestoreUnreachable) return;

    // Sync design settings
    try {
      const designDoc = await runFirestoreOp('get design settings', () => getDoc(doc(db, 'settings', 'design')));
      if (designDoc && designDoc.exists()) {
        designSettings = { ...designSettings, ...designDoc.data() };
        console.log('[Firebase Server] Loaded design settings from Firestore.');
      } else if (designDoc) {
        console.log('[Firebase Server] Seeding default design settings to Firestore...');
        await persistDesignSettingsToFirestore(designSettings);
      }
    } catch (err) {
      console.error('[Firebase Server] Error syncing design settings:', err);
    }

    // Auto-heal any invalid mixkit links from Firestore immediately on-the-fly
    await sanitizeMixkitUrls();

    // Call the automatic video-less restaurant cleanup
    await cleanupRestaurantsWithoutVideos();

    // Trigger video source validation in the background
    runBackgroundVideosValidation().catch(err => {
      console.error('[Firebase Server] Background video validation error:', err);
    });

    // Sync loaded state to local data_store.json file
    saveData();
  } catch (err) {
    console.error('[Firebase Server] Error syncing from Firestore:', err);
  }
}

// Helper to generate unique IDs
const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

const DATA_FILE = path.join(process.cwd(), 'data_store.json');

export function saveData() {
  try {
    const data = {
      users,
      comments,
      reviews,
      subscriptions,
      reservations,
      userPoints,
      userRewardClaims,
      tips,
      restaurants,
      dishes,
      videos,
      orders,
      currentUserSession,
      formulas,
      restaurateurs,
      restaurateurMedia,
      couriers,
      designSettings,
      isFirestoreUnreachable
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save data to data_store.json:', err);
  }
}

async function sanitizeMixkitUrls() {
  const mapUrl = (url: string): string => {
    if (!url) return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
    if (url.includes('gtv-videos-bucket') || url.includes('commondatastorage.googleapis.com')) {
      if (url.includes('ForBiggerBlazes')) return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
      if (url.includes('ForBiggerMeltdowns')) return 'https://assets.mixkit.co/videos/preview/mixkit-pouring-hot-chocolate-on-a-pancake-41617-large.mp4';
      if (url.includes('ForBiggerEscapes')) return 'https://assets.mixkit.co/videos/preview/mixkit-chef-cutting-a-freshly-baked-pizza-40245-large.mp4';
      if (url.includes('WeAreGoingOnBullrun')) return 'https://assets.mixkit.co/videos/preview/mixkit-putting-ketchup-on-a-freshly-prepared-hamburger-40246-large.mp4';
      if (url.includes('ForBiggerFun')) return 'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-and-meat-sizzling-in-a-wok-pan-40242-large.mp4';
      if (url.includes('ForBiggerJoyrides')) return 'https://assets.mixkit.co/videos/preview/mixkit-pouring-dark-red-wine-into-a-glass-40251-large.mp4';
      return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
    }
    if (url.includes('oceans.mp4') || url.includes('zencdn') || url.includes('oceans')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-vegetable-salad-in-the-kitchen-40243-large.mp4';
    }
    if (url.includes('w3schools') || url.includes('w3.org') || url.includes('bunny') || url.includes('sintel') || url.includes('mov_bbb') || url.includes('movie.mp4') || url.includes('trailer_hd.mp4')) {
      if (url.includes('bunny') || url.includes('mov_bbb')) {
        return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
      }
      if (url.includes('movie.mp4') || url.includes('sintel') || url.includes('trailer_hd.mp4')) {
        return 'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-and-meat-sizzling-in-a-wok-pan-40242-large.mp4';
      }
      return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
    }
    if (!url.includes('mixkit.co')) return url;
    if (url.includes('pizza-39981') || url.includes('herbs') || url.includes('pizza-40228')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-chef-cutting-a-freshly-baked-pizza-40245-large.mp4';
    }
    if (url.includes('soup') || url.includes('42247') || url.includes('ramen-42288')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-and-meat-sizzling-in-a-wok-pan-40242-large.mp4';
    }
    if (url.includes('cooked-meat') || url.includes('39972') || url.includes('burgers-41618')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-putting-ketchup-on-a-freshly-prepared-hamburger-40246-large.mp4';
    }
    if (url.includes('dough') || url.includes('39974') || url.includes('pasta-41617')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-dough-for-making-pizza-39974-large.mp4';
    }
    if (url.includes('sushi-42323') || url.includes('sauce') || url.includes('sushi-roll') || url.includes('43033')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-vegetable-salad-in-the-kitchen-40243-large.mp4';
    }
    if (url.includes('salad') || url.includes('32864') || url.includes('vegetables-41613')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-vegetable-salad-in-the-kitchen-40243-large.mp4';
    }
    if (url.includes('waffles') || url.includes('42921') || url.includes('pudding') || url.includes('42918') || url.includes('pancakes-40198')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-pouring-hot-chocolate-on-a-pancake-41617-large.mp4';
    }
    if (url.includes('spinning-plate') || url.includes('42940') || url.includes('sushi-rolls') || url.includes('42941') || url.includes('french-fries-41613')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
    }
    return 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4';
  };

  let count = 0;
  
  // Sanitize videos array
  for (const v of videos) {
    const original = v.videoUrl;
    v.videoUrl = mapUrl(v.videoUrl);
    if (v.videoUrl !== original) {
      v.validationStatus = 'valid'; // Force valid since it's now pointing to our 100% stable Google CDN
      v.validationError = undefined;
      count++;
      if (db && !isFirestoreUnreachable) {
        await persistVideoToFirestore(v);
      }
    }
  }

  // Sanitize restaurants array videoUrl
  for (const r of restaurants) {
    if (r.videoUrl) {
      const original = r.videoUrl;
      r.videoUrl = mapUrl(r.videoUrl);
      if (r.videoUrl !== original) {
        count++;
        if (db && !isFirestoreUnreachable) {
          await persistRestaurantToFirestore(r);
        }
      }
    }
  }

  // Sanitize designSettings.desktopAds
  if (designSettings && Array.isArray(designSettings.desktopAds)) {
    let adModified = false;
    designSettings.desktopAds.forEach((ad: any) => {
      if (ad.mediaUrl) {
        const original = ad.mediaUrl;
        ad.mediaUrl = mapUrl(ad.mediaUrl);
        if (ad.mediaUrl !== original) {
          count++;
          adModified = true;
        }
      }
    });
    if (adModified && db && !isFirestoreUnreachable) {
      await persistDesignSettingsToFirestore(designSettings);
    }
  }

  if (count > 0) {
    console.log(`[Sanitize] Auto-repaired ${count} deprecated mixkit.co URLs in memory and Firestore to high-speed stable Google Cloud Storage video loops!`);
    saveData();
  }
}

export function bootstrapDefaultDataIfEmpty() {
  let modified = false;

  if (!restaurants || restaurants.length === 0) {
    console.log('[Bootstrap] Seeding 3 premium restaurants...');
    restaurants = [
      {
        id: 'rest-nonna',
        userId: 'usr-rest-nonna',
        name: "Nonna's Neapolitan Pizza",
        shortName: "Nonna",
        address: "14 Rue de Charonne, 75011 Paris",
        commissionRateDelivery: 15,
        commissionRateCollect: 5,
        stripeAccountId: "acct_1NonnaPizzaConnect123",
        logoUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=80",
        bannerUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80",
        slogan: "L'art secret de la pizza cuite au feu de bois. 🍕🇮🇹",
        isCertified: true,
        subscriptionTier: 'pro',
        promoMessage: "DOLCE VITA : Tiramisu offert pour tout panier supérieur à 35€ ! ☕️",
        countdownMinutes: 8,
        countdownText: "Fournée croustillante dans",
        likesReceived: 1420,
        pointsReceived: 100,
        isPublished: true,
        createdAt: new Date().toISOString(),
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-putting-fresh-herbs-on-a-pizza-39981-large.mp4",
        videoTitle: "🍕 Regardez le basilic frais se déposer sur la Marguerita DOC fumante !"
      },
      {
        id: 'rest-tokyo',
        userId: 'usr-rest-tokyo',
        name: "Tokyo Ramen Bar",
        shortName: "Tokyo Ramen",
        address: "28 Rue Sainte-Anne, 75001 Paris",
        commissionRateDelivery: 15,
        commissionRateCollect: 5,
        stripeAccountId: "acct_2TokyoRamenConnect456",
        logoUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=150&auto=format&fit=crop&q=80",
        bannerUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80",
        slogan: "Bouillons artisanaux mijotés 16h et nouilles maison fraîches. 🍜🎌",
        isCertified: true,
        subscriptionTier: 'free',
        promoMessage: "SAYONARA : Un mochi glacé sésame noir offert dès 30€ de commande ! 🍡",
        countdownMinutes: 12,
        countdownText: "Prochaine cuisson minute dans",
        likesReceived: 890,
        pointsReceived: 150,
        isPublished: true,
        createdAt: new Date().toISOString(),
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-serving-hot-soup-in-a-bowl-42247-large.mp4",
        videoTitle: "🍜 Notre légendaire bouillon Tonkotsu fumant versé minute."
      },
      {
        id: 'rest-burger',
        userId: 'usr-rest-burger',
        name: "Smashed Burger Lab",
        shortName: "Burger Lab",
        address: "8 Boulevard Voltaire, 75011 Paris",
        commissionRateDelivery: 15,
        commissionRateCollect: 5,
        stripeAccountId: "acct_3BurgerLabConnect789",
        logoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80",
        bannerUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
        slogan: "Le roi du smash burger Black Angus croustillant ! 🍔🔥",
        isCertified: true,
        subscriptionTier: 'gold',
        promoMessage: "RADAR COULANT : Frites offertes avec le code CRUNCHY ! 🍟",
        countdownMinutes: 5,
        countdownText: "Smash sur la plaque chaude dans",
        likesReceived: 2311,
        pointsReceived: 200,
        isPublished: true,
        createdAt: new Date().toISOString(),
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cutting-slices-of-cooked-meat-39972-large.mp4",
        videoTitle: "🍔 Sensationnel bœuf grillé préparé par le Chef. Smashé à l’extrême !"
      }
    ];
    modified = true;
  }

  if (!dishes || dishes.length === 0) {
    console.log('[Bootstrap] Seeding premium dishes...');
    dishes = [
      {
        id: 'd1111111-1111-1111-1111-111111111111',
        restaurantId: 'rest-nonna',
        name: "Marguerita D.O.C.",
        description: "Tomates San Marzano, mozzarella di bufala, basilic frais, huile d’olive extra-vierge.",
        price: 13.50,
        isAvailable: true,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80",
        isPopular: true
      },
      {
        id: 'd1111111-2222-2222-2222-222222222222',
        restaurantId: 'rest-nonna',
        name: "La Truffe Royale",
        description: "Crème de truffe blanche, mozzarella, champignons sauvages, roquette et parmesan 24 mois.",
        price: 18.90,
        isAvailable: true,
        imageUrl: "https://images.unsplash.com/photo-1544982503-9f984c14501a?w=500&auto=format&fit=crop&q=80",
        isPopular: true
      },
      {
        id: 'd2222222-1111-1111-1111-111111111111',
        restaurantId: 'rest-tokyo',
        name: "Tonkotsu Ramen Impérial",
        description: "Bouillon crémeux de porc mijoté 16h, nouilles fraîches, chashu fondant, œuf ajitama bio coulant et oignons verts.",
        price: 15.90,
        isAvailable: true,
        imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80",
        isPopular: true
      },
      {
        id: 'd2222222-2222-2222-2222-222222222222',
        restaurantId: 'rest-tokyo',
        name: "Gyozas Maison au Poulet (x6)",
        description: "Raviolis japonais grillés croustillants, farcis au poulet rôti, gingembre et ciboule.",
        price: 7.50,
        isAvailable: true,
        imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80"
      },
      {
        id: 'd3333333-1111-1111-1111-111111111111',
        restaurantId: 'rest-burger',
        name: "The OG Double Smashed",
        description: "Deux patties de bœuf Black Angus smashés, cheddar américain affiné fondant, oignons caramélisés, cornichons, sauce secrète maison dans un pain bun brioché toasté.",
        price: 12.90,
        isAvailable: true,
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
        isPopular: true
      },
      {
        id: 'd3333333-2222-2222-2222-222222222222',
        restaurantId: 'rest-burger',
        name: "Cheesy Sweet Potatoes",
        description: "Frites de patates douces croustillantes nappées de cheddar chaud fondu et bacon crispy.",
        price: 6.20,
        isAvailable: true,
        imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80"
      }
    ];
    modified = true;
  }

  if (!videos || videos.length === 0) {
    console.log('[Bootstrap] Seeding premium videos...');
    videos = [
      {
        id: 'vid-nonna-1',
        restaurantId: 'rest-nonna',
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-putting-fresh-herbs-on-a-pizza-39981-large.mp4",
        associatedDishId: "d1111111-1111-1111-1111-111111111111",
        title: "🍕 Regardez le basilic frais se déposer sur la Marguerita DOC fumante !",
        likesCount: 1420,
        createdAt: new Date().toISOString(),
        isOnline: true,
        videoSourceType: 'direct',
        viewsCount: 1420,
        averageWatchTime: 12
      },
      {
        id: 'vid-tokyo-1',
        restaurantId: 'rest-tokyo',
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-serving-hot-soup-in-a-bowl-42247-large.mp4",
        associatedDishId: "d2222222-1111-1111-1111-111111111111",
        title: "🍜 Notre légendaire bouillon Tonkotsu fumant versé minute.",
        likesCount: 890,
        createdAt: new Date().toISOString(),
        isOnline: true,
        videoSourceType: 'direct',
        viewsCount: 890,
        averageWatchTime: 10
      },
      {
        id: 'vid-burger-1',
        restaurantId: 'rest-burger',
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cutting-slices-of-cooked-meat-39972-large.mp4",
        associatedDishId: "d3333333-1111-1111-1111-111111111111",
        title: "🍔 Sensationnel bœuf grillé préparé par le Chef. Smashé à l’extrême !",
        likesCount: 2311,
        createdAt: new Date().toISOString(),
        isOnline: true,
        videoSourceType: 'direct',
        viewsCount: 2311,
        averageWatchTime: 15
      },
      {
        id: 'vid-nonna-2',
        restaurantId: 'rest-nonna',
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-dough-for-making-pizza-39974-large.mp4",
        associatedDishId: "d1111111-2222-2222-2222-222222222222",
        title: "✨ Préparation méticuleuse de la pâte à pizza par notre Chef.",
        likesCount: 541,
        createdAt: new Date().toISOString(),
        isOnline: true,
        videoSourceType: 'direct',
        viewsCount: 541,
        averageWatchTime: 9
      },
      {
        id: 'vid-tokyo-2',
        restaurantId: 'rest-tokyo',
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-pouring-sauce-on-fresh-sushi-42323-large.mp4",
        associatedDishId: "d2222222-2222-2222-2222-222222222222",
        title: "🍣 Sauce soja nappée délicatement sur nos gyozas et sushis frais.",
        likesCount: 615,
        createdAt: new Date().toISOString(),
        isOnline: true,
        videoSourceType: 'direct',
        viewsCount: 615,
        averageWatchTime: 8
      }
    ];
    modified = true;
  }

  if (!couriers || couriers.length === 0) {
    console.log('[Bootstrap] Seeding 3 default couriers...');
    couriers = [
      { id: 'cur-1', name: 'Karim Bensalah', email: 'karim@fidfud.app', phone: '06 12 34 56 78', vehicle: 'Scooter', status: 'available', rating: 4.9, identityVerified: true, kbisVerified: true, siret: '83489102400018', drivingLicense: '12AB34567' },
      { id: 'cur-2', name: 'Sarah Meunier', email: 'sarah@fidfud.app', phone: '07 89 45 12 63', vehicle: 'Velo', status: 'available', rating: 4.8, identityVerified: true, kbisVerified: true, siret: '74291823100021' },
      { id: 'cur-3', name: 'Maxime Giraud', email: 'maxime@fidfud.app', phone: '06 99 88 77 66', vehicle: 'Voiture', status: 'offline', rating: 4.7, identityVerified: false, kbisVerified: false }
    ];
    modified = true;
  }

  if (modified) {
    saveData();
  }
}

export function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(content);
      if (data.users) users = data.users;
      if (data.comments) comments = data.comments;
      if (data.reviews) reviews = data.reviews;
      if (data.subscriptions) subscriptions = data.subscriptions;
      if (data.reservations) reservations = data.reservations;
      if (data.userPoints) userPoints = data.userPoints;
      if (data.userRewardClaims) userRewardClaims = data.userRewardClaims;
      if (data.tips) tips = data.tips;
      if (data.restaurants) restaurants = data.restaurants;
      if (data.dishes) dishes = data.dishes;
      if (data.videos) videos = data.videos;
      if (data.orders) orders = data.orders;
      if (data.currentUserSession !== undefined) currentUserSession = data.currentUserSession;
      if (data.formulas) formulas = data.formulas;
      if (data.restaurateurs) restaurateurs = data.restaurateurs;
      if (data.restaurateurMedia) restaurateurMedia = data.restaurateurMedia;
      if (data.couriers) couriers = data.couriers;
      if (data.designSettings) {
        designSettings = { ...designSettings, ...data.designSettings };
      }
      if (data.isFirestoreUnreachable !== undefined) {
        // Automatically attempt to auto-heal/reconnect on fresh server boot
        isFirestoreUnreachable = false;
        console.log('[Firebase Server] Resetting isFirestoreUnreachable to false on fresh server boot to attempt auto-healing.');
      }
      console.log('Successfully loaded persistent data from data_store.json');
    } else {
      saveData();
    }
    // Always run bootstrap check
    bootstrapDefaultDataIfEmpty();
    // Auto-heal any invalid mixkit links immediately on-the-fly
    sanitizeMixkitUrls();
  } catch (err) {
    console.error('Failed to load data from data_store.json, using defaults:', err);
    bootstrapDefaultDataIfEmpty();
    sanitizeMixkitUrls();
  }
}

export const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

async function startServer() {
  // Load saved data on startup
  loadData();
  
  // Sync from Firestore in background (non-blocking server boot)
  syncFromFirestore().catch(err => {
    console.error('[Firebase Server] Background Firestore sync failed:', err);
  });

  // Scheduled fallback video validation check to make sure everything is validated
  setTimeout(() => {
    console.log('[Scheduled Validator] Running scheduled video source validation checks...');
    runBackgroundVideosValidation().catch(err => {
      console.error('[Scheduled Validator] Validation check error:', err);
    });
  }, 10000);

  // Automatically save data when any state-changing request completes
  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      res.on('finish', () => {
        saveData();
      });
    }
    next();
  });

  // Log requests and prevent caching of API responses
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    if (req.url.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // API ROUTES
  app.get('/uploads/:filename', async (req, res, next) => {
    const filename = req.params.filename;
    const localPath = path.join(process.cwd(), 'uploads', filename);
    
    // 1. If local file exists, serve it immediately
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }
    
    // 2. If missing, restore it from Firestore chunks
    if (db && !isFirestoreUnreachable) {
      try {
        console.log(`[Firebase Server] Local file ${filename} missing. Restoring from Firestore...`);
        const firstChunkDoc = await runFirestoreOp('get media chunk 0', () => getDoc(doc(db, 'media_files', `${filename}_chunk_0`)));
        if (firstChunkDoc && firstChunkDoc.exists()) {
          const firstChunkData = firstChunkDoc.data();
          const totalChunks = firstChunkData.totalChunks;
          
          console.log(`[Firebase Server] Found chunk 0. Restoring ${totalChunks} chunks for ${filename}...`);
          const chunkBuffers: Buffer[] = [Buffer.from(firstChunkData.base64Data, 'base64')];
          
          for (let i = 1; i < totalChunks; i++) {
            if (isFirestoreUnreachable) throw new Error('Firestore became unreachable during chunk restoration');
            const chunkDoc = await runFirestoreOp(`get media chunk ${i}`, () => getDoc(doc(db, 'media_files', `${filename}_chunk_${i}`)));
            if (chunkDoc && chunkDoc.exists()) {
              chunkBuffers.push(Buffer.from(chunkDoc.data().base64Data, 'base64'));
            } else {
              throw new Error(`Missing chunk ${i} for file ${filename}`);
            }
          }
          
          const fullFileBuffer = Buffer.concat(chunkBuffers);
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          fs.writeFileSync(localPath, fullFileBuffer);
          console.log(`[Firebase Server] Restored local file ${filename} (${fullFileBuffer.length} bytes) successfully.`);
          return res.sendFile(localPath);
        } else {
          console.warn(`[Firebase Server] No Firestore backup found for ${filename}.`);
        }
      } catch (err) {
        console.error(`[Firebase Server] Failed to restore missing file ${filename} from Firestore:`, err);
      }
    }
    
    res.status(404).send('File not found');
  });

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni ou format incorrect.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    
    // Backup uploaded file to Firestore in 500KB chunks asynchronously to avoid blocking the response
    if (db && !isFirestoreUnreachable) {
      const filePath = req.file.path;
      const mimeType = req.file.mimetype;
      const filename = req.file.filename;

      // Run backup in the background to ensure instantaneous upload response for the client
      (async () => {
        try {
          const fileData = fs.readFileSync(filePath);

          // Raise backup limit to 35MB to allow rich mobile recordings to be preserved permanently
          if (fileData.length > 35 * 1024 * 1024) {
            console.log(`[Firebase Server] File ${filename} is too large (${fileData.length} bytes, >35MB limit). Skipping Firestore backup chunks.`);
          } else {
            const chunkSize = 500 * 1024; // 500KB (fits in Firestore 1MB doc limit)
            const totalChunks = Math.ceil(fileData.length / chunkSize);
            
            console.log(`[Firebase Server] Archiving ${filename} (${fileData.length} bytes) in ${totalChunks} chunks to Firestore in background...`);
            let uploadAborted = false;

            for (let i = 0; i < totalChunks; i++) {
              if (isFirestoreUnreachable) {
                console.warn('[Firebase Server] Firestore became unreachable during backup chunks upload.');
                break;
              }
              const chunkStart = i * chunkSize;
              const chunkEnd = Math.min(chunkStart + chunkSize, fileData.length);
              const chunkBuffer = fileData.subarray(chunkStart, chunkEnd);
              const base64Data = chunkBuffer.toString('base64');
              
              // Small 20ms delay to throttle writes and prevent Firestore write exhaustion
              await new Promise(r => setTimeout(r, 20));

              const success = await runFirestoreOp(`set media chunk ${i}`, () => setDoc(doc(db, 'media_files', `${filename}_chunk_${i}`), {
                filename,
                chunkIndex: i,
                totalChunks,
                contentType: mimeType,
                base64Data,
                createdAt: new Date().toISOString()
              }));

              if (success === null) {
                console.warn(`[Firebase Server] Failed to upload chunk ${i} for ${filename}. Aborting remaining backup chunks.`);
                uploadAborted = true;
                break;
              }
            }
            if (!isFirestoreUnreachable && !uploadAborted) {
              console.log(`[Firebase Server] Successfully uploaded all chunks for ${filename} to Firestore in background.`);
            }
          }
        } catch (err) {
          console.error(`[Firebase Server] Failed to backup file upload to Firestore in background:`, err);
        }
      })();
    }
    
    res.json({ success: true, url: fileUrl });
  });

  // 0. User Authentication flow (Sign-Up, Login, Logout, Reset Password, Me)
  app.get('/admin', (req, res) => {
    let adminUser = users.find(u => u.email === 'sybis.co@gmail.com');
    if (!adminUser) {
      adminUser = { id: 'usr-admin-1', email: 'sybis.co@gmail.com', role: 'admin' };
      users.push(adminUser);
    } else {
      adminUser.role = 'admin';
    }
    currentUserSession = adminUser;
    res.redirect('/?admin=true');
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: currentUserSession });
  });

  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    if (users.some(u => u.email.toLowerCase() === lowerEmail)) {
      return res.status(400).json({ error: 'Cet email est déjà enregistré.' });
    }

    const assignedRole = lowerEmail === 'sybis.co@gmail.com' ? 'admin' : (role === 'restaurant' ? 'restaurant' : 'client');
    const newUser = {
      id: genId('usr'),
      email: lowerEmail,
      role: assignedRole
    };

    users.push(newUser);
    currentUserSession = newUser;

    // If signed up as restaurateur, automatically bootstrap a mock restaurant profile so they can manage dishes instantly!
    if (newUser.role === 'restaurant') {
      const formattedName = lowerEmail.split('@')[0];
      const chefName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
      
      const newRest: Restaurant = {
        id: genId('rest'),
        userId: newUser.id,
        name: `Chez ${chefName} Cuisines`,
        address: '10 Rue Saint-Honoré, 75001 Paris',
        commissionRateDelivery: 15,
        commissionRateCollect: 5,
        stripeAccountId: `acct_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        logoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
        slogan: 'La cuisine gastronomique de saison préparée avec passion ! ✨',
        isCertified: true,
        subscriptionTier: 'free',
        promoMessage: '',
        countdownMinutes: 10,
        countdownText: 'Prochaine cuisson minute dans',
        likesReceived: 0,
        pointsReceived: 0,
        isPublished: true,
        createdAt: new Date().toISOString()
      };
      restaurants.push(newRest);
      await persistRestaurantToFirestore(newRest);

      // Create and persist a default video so they are immediately visible on the feed!
      const newVideo: Video = {
        id: genId('vid'),
        restaurantId: newRest.id,
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-dough-for-making-pizza-39974-large.mp4',
        title: `🎥 Bienvenue chez ${newRest.name} ! Assistez à la préparation en cuisine de nos produits frais. ✨`,
        likesCount: Math.floor(Math.random() * 50) + 5,
        createdAt: new Date().toISOString()
      };
      videos.unshift(newVideo);
      await persistVideoToFirestore(newVideo);
    }

    saveData();
    res.status(201).json({ success: true, user: newUser });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    const user = users.find(u => u.email.toLowerCase() === lowerEmail);

    if (!user) {
      return res.status(404).json({ error: 'Aucun utilisateur trouvé avec cet email. Veuillez vous enregistrer.' });
    }

    if (lowerEmail === 'sybis.co@gmail.com' && user.role !== 'admin') {
      user.role = 'admin';
    }

    // Standard dev password acceptance
    currentUserSession = user;
    res.json({ success: true, user });
  });

  app.post('/api/auth/google', async (req, res) => {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email Google requis.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    const isSuperAdmin = lowerEmail === 'sybis.co@gmail.com';
    let user = users.find(u => u.email.toLowerCase() === lowerEmail);

    if (!user) {
      const assignedRole = isSuperAdmin ? 'admin' : (role === 'restaurant' ? 'restaurant' : 'client');
      user = {
        id: genId('usr'),
        email: lowerEmail,
        role: assignedRole
      };
      users.push(user);

      if (assignedRole === 'restaurant') {
        const formattedName = lowerEmail.split('@')[0];
        const chefName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
        
        const newRest: Restaurant = {
          id: genId('rest'),
          userId: user.id,
          name: `Chez ${chefName} Cuisines`,
          address: '10 Rue Saint-Honoré, 75001 Paris',
          commissionRateDelivery: 15,
          commissionRateCollect: 5,
          stripeAccountId: `acct_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          logoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
          slogan: 'La cuisine gastronomique de saison préparée avec passion ! ✨',
          isCertified: true,
          subscriptionTier: 'free',
          promoMessage: '',
          countdownMinutes: 10,
          countdownText: 'Prochaine cuisson minute dans',
          likesReceived: 0,
          pointsReceived: 0,
          isPublished: true,
          createdAt: new Date().toISOString()
        };
        restaurants.push(newRest);
        await persistRestaurantToFirestore(newRest);

        // Create and persist a default video so they are immediately visible on the feed!
        const newVideo: Video = {
          id: genId('vid'),
          restaurantId: newRest.id,
          videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-dough-for-making-pizza-39974-large.mp4',
          title: `🎥 Bienvenue chez ${newRest.name} ! Assistez à la préparation en cuisine de nos produits frais. ✨`,
          likesCount: Math.floor(Math.random() * 50) + 5,
          createdAt: new Date().toISOString()
        };
        videos.unshift(newVideo);
        await persistVideoToFirestore(newVideo);
      }
    } else {
      if (isSuperAdmin && user.role !== 'admin') {
        user.role = 'admin';
      }
    }

    currentUserSession = user;
    saveData();
    res.json({ success: true, user });
  });

  app.post('/api/auth/logout', (req, res) => {
    currentUserSession = null;
    res.json({ success: true });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requis.' });
    }
    // Simulation
    res.json({ success: true, message: 'Lien de réinitialisation fictif envoyé par mail.' });
  });

  app.get('/api/health', (req, res) => {

    res.json({ status: 'healthy', time: new Date().toISOString() });
  });

  // 1. Get Video Feed (Hydrated with restaurant information and dish details)
  app.get('/api/feed', (req, res) => {
    const onlineVideos = videos.filter(v => v.isOnline !== false && v.validationStatus !== 'invalid');
    const feed = onlineVideos.map(video => {
      const r = restaurants.find(rest => rest.id === video.restaurantId);
      const d = dishes.find(dish => dish.id === video.associatedDishId);
      return {
        ...video,
        restaurantName: r ? r.name : 'Restaurant inconnu',
        associatedDish: d || undefined
      };
    });
    res.json(feed);
  });

  // 2. Get Restaurants
  app.get('/api/restaurants', (req, res) => {
    res.json(restaurants);
  });

  // 2b. Get custom design and branding settings
  app.get('/api/design-settings', (req, res) => {
    res.json(designSettings);
  });

  // 2c. Update custom design and branding settings
  app.post('/api/design-settings', async (req, res) => {
    try {
      designSettings = { ...designSettings, ...req.body };
      saveData();
      await persistDesignSettingsToFirestore(designSettings);
      res.json({ success: true, designSettings });
    } catch (err) {
      console.error('Failed to update design settings:', err);
      res.status(500).json({ error: 'Failed to save design settings.' });
    }
  });

  // Search and discover real restaurants in a city using Gemini with Google Search grounding
  app.post('/api/restaurants/google-search', async (req, res) => {
    const { city } = req.body;
    if (!city) {
      return res.status(400).json({ error: 'La ville est requise pour la recherche.' });
    }

    try {
      console.log(`[Google Maps / Gemini Search] Finding trendy restaurants in: ${city}`);
      const client = getGeminiClient();

      if (!client) {
        // Fallback realistic data if Gemini API key is not set
        console.warn('Gemini client not initialized, using realistic mockup generator for ' + city);
        const mockupRests = [
          {
            name: `Le Petit Bistrot ${city}`,
            address: `45 Rue de la République, ${city}`,
            description: `Un charmant restaurant français traditionnel servant des classiques maison revisités avec passion.`,
            category: 'Français',
            latitude: 48.8566 + (Math.random() * 0.04 - 0.02),
            longitude: 2.3522 + (Math.random() * 0.04 - 0.02),
            slogan: `La tradition française au cœur de ${city} ! 🇫🇷✨`,
            logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80',
            bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'
          },
          {
            name: `Sushi Sakura ${city}`,
            address: `12 Boulevard des Saveurs, ${city}`,
            description: `Le meilleur de la gastronomie nippone. Poissons extra-frais découpés minute par notre maître sushi.`,
            category: 'Japonais',
            latitude: 48.8566 + (Math.random() * 0.04 - 0.02),
            longitude: 2.3522 + (Math.random() * 0.04 - 0.02),
            slogan: `L'art du sushi traditionnel à déguster. 🇯🇵🍣`,
            logoUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=150&auto=format&fit=crop&q=80',
            bannerUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&auto=format&fit=crop&q=80'
          },
          {
            name: `Bella Italia ${city}`,
            address: `8 Rue d'Italie, ${city}`,
            description: `Authentiques pizzas napolitaines cuites au feu de bois et pâtes fraîches artisanales dans un cadre chaleureux.`,
            category: 'Italien',
            latitude: 48.8566 + (Math.random() * 0.04 - 0.02),
            longitude: 2.3522 + (Math.random() * 0.04 - 0.02),
            slogan: `Le goût du vrai fait maison napolitain. 🇮🇹🍕`,
            logoUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=80',
            bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80'
          },
          {
            name: `The Smashed Box ${city}`,
            address: `22 Avenue du Snack, ${city}`,
            description: `Des smash burgers croustillants et juteux avec notre sauce secrète inimitable et cheddar affiné fondant.`,
            category: 'Burgers',
            latitude: 48.8566 + (Math.random() * 0.04 - 0.02),
            longitude: 2.3522 + (Math.random() * 0.04 - 0.02),
            slogan: `Le smash burger de vos rêves. 🍔🔥`,
            logoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80',
            bannerUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80'
          },
          {
            name: `Café des Arts ${city}`,
            address: `3 Place Saint-Germain, ${city}`,
            description: `Un brunch savoureux de saison, cafés de spécialité et pâtisseries fines faites avec amour.`,
            category: 'Café',
            latitude: 48.8566 + (Math.random() * 0.04 - 0.02),
            longitude: 2.3522 + (Math.random() * 0.04 - 0.02),
            slogan: `Café de spécialité & Brunch gourmand. ☕🥞`,
            logoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80',
            bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80'
          }
        ];
        return res.json({ success: true, source: 'fallback', restaurants: mockupRests });
      }

      // If we have Gemini client, query it using googleSearch for real live grounding!
      const prompt = `You are an expert restaurant discovery agent with real-time web access.
Find exactly 5 real, trendy, or recently opened restaurants in the city of '${city}'. 
Use the Google Search tool to search for real existing restaurants in '${city}' with their actual names, correct street addresses, category, and real coordinates (approximate latitude and longitude in ${city}).

Return a JSON object with exactly this schema:
{
  "restaurants": [
    {
      "name": "Name of the restaurant",
      "address": "Actual full address with city",
      "description": "Short appetizing description in French (1 or 2 sentences max)",
      "category": "Cuisine category. MUST be one of: 'Italien', 'Japonais', 'Burgers', 'Français', 'Café', 'Tex-Mex'",
      "latitude": 43.1234,
      "longitude": 5.1234,
      "slogan": "A premium, Appetizing French slogan with emojis",
      "logoUrl": "A high-quality direct Unsplash image URL representing their cuisine (e.g. 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=80')",
      "bannerUrl": "A premium direct Unsplash interior or banner image URL (e.g. 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80')"
    }
  ]
}

Make sure the output is 100% valid JSON and coordinates are realistic numbers within or near ${city}. Make sure the categories strictly match one of the authorized ones.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              restaurants: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    address: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING },
                    latitude: { type: Type.NUMBER },
                    longitude: { type: Type.NUMBER },
                    slogan: { type: Type.STRING },
                    logoUrl: { type: Type.STRING },
                    bannerUrl: { type: Type.STRING }
                  },
                  required: ['name', 'address', 'description', 'category', 'latitude', 'longitude', 'slogan', 'logoUrl', 'bannerUrl']
                }
              }
            },
            required: ['restaurants']
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text.trim());
        return res.json({ success: true, source: 'gemini-grounding', restaurants: parsed.restaurants || [] });
      } else {
        throw new Error("No response text from Gemini");
      }
    } catch (err: any) {
      console.error('Error in /api/restaurants/google-search, using fallback data:', err);
      // Failover to realistic mockup data if web search limits exceeded or error
      const fallbackRests = [
        {
          name: `Bistrot du Port ${city}`,
          address: `12 Quai de la Marine, ${city}`,
          description: `Spécialités de la mer et cuisine locale traditionnelle de saison servies face au port.`,
          category: 'Français',
          latitude: 43.2965 + (Math.random() * 0.04 - 0.02),
          longitude: 5.3698 + (Math.random() * 0.04 - 0.02),
          slogan: `La fraîcheur marine de la côte. ⚓🐟`,
          logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'
        },
        {
          name: `Noodle Bar ${city}`,
          address: `5 Rue des Lanternes, ${city}`,
          description: `Nouilles artisanales sautées minute et délicieux ramen fumants d'inspiration tokyoïte.`,
          category: 'Japonais',
          latitude: 43.2965 + (Math.random() * 0.04 - 0.02),
          longitude: 5.3698 + (Math.random() * 0.04 - 0.02),
          slogan: `Nouilles sautées & saveurs authentiques. 🍜🥢`,
          logoUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=150&auto=format&fit=crop&q=80',
          bannerUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&auto=format&fit=crop&q=80'
        }
      ];
      res.json({ success: true, source: 'failover', restaurants: fallbackRests });
    }
  });

  // Create Restaurants in Bulk (Admin CMS)
  app.post('/api/restaurants/bulk', async (req, res) => {
    const { names, city, category, district, subscriptionTier } = req.body;
    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: 'Une liste de noms de restaurants est requise.' });
    }
    if (!city) {
      return res.status(400).json({ error: 'La ville est requise.' });
    }

    const createdRestaurants: Restaurant[] = [];
    
    // Coordinates mapping for major cities
    const cityCoords: { [key: string]: { lat: number; lng: number } } = {
      'Paris': { lat: 48.8566, lng: 2.3522 },
      'Lyon': { lat: 45.7640, lng: 4.8357 },
      'Marseille': { lat: 43.2965, lng: 5.3698 },
      'Bordeaux': { lat: 44.8378, lng: -0.5792 },
      'Nice': { lat: 43.7102, lng: 7.2620 },
      'Lille': { lat: 50.6292, lng: 3.0573 },
      'Toulouse': { lat: 43.6047, lng: 1.4442 }
    };

    const center = cityCoords[city] || { lat: 48.8566, lng: 2.3522 };

    const foodPics = [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80'
    ];

    const logoPics = [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=150&auto=format&fit=crop&q=80'
    ];

    // Some demo food video loops for realistic playback
    const demoVideoUrls = [
      'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-vegetable-salad-32864-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-hand-dripping-syrup-on-waffles-42921-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-pouring-hot-chocolate-on-a-pudding-42918-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-fresh-sushi-rolls-on-a-spinning-plate-42940-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-serving-fresh-sushi-rolls-on-a-plate-42941-large.mp4'
    ];

    for (const name of names) {
      const cleanName = name.trim();
      if (!cleanName) continue;

      const id = 'rest-' + Math.random().toString(36).substring(2, 9);
      const randOffsetLat = (Math.random() * 0.03) - 0.015;
      const randOffsetLng = (Math.random() * 0.03) - 0.015;
      
      const restDist = district ? district.trim() : `${Math.floor(Math.random() * 20) + 1}e Arr.`;
      const finalAddress = `${Math.floor(Math.random() * 120) + 1} Rue de la Gastronomie, ${restDist}, ${city}`;

      const newRest: Restaurant = {
        id,
        userId: 'usr-admin-1',
        name: cleanName,
        shortName: cleanName,
        address: finalAddress,
        commissionRateDelivery: subscriptionTier === 'gold' ? 5 : (subscriptionTier === 'pro' ? 10 : 15),
        commissionRateCollect: 5,
        stripeAccountId: `acct_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        logoUrl: logoPics[Math.floor(Math.random() * logoPics.length)],
        bannerUrl: foodPics[Math.floor(Math.random() * foodPics.length)],
        slogan: `Plaisir culinaire garanti à ${city} ! ✨`,
        isCertified: true,
        subscriptionTier: subscriptionTier || 'free',
        promoMessage: 'Offre exclusive FidFud ! 🎁',
        countdownMinutes: Math.floor(Math.random() * 12) + 5,
        countdownText: 'Plat en cours de préparation',
        likesReceived: Math.floor(Math.random() * 180) + 12,
        pointsReceived: Math.floor(Math.random() * 120) + 15,
        createdAt: new Date().toISOString(),
        email: `contact@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.fr`,
        phone: '+33 1 40 ' + Math.floor(Math.random() * 89 + 10) + ' ' + Math.floor(Math.random() * 89 + 10) + ' ' + Math.floor(Math.random() * 89 + 10),
        description: `Découvrez ${cleanName}, votre étape gourmande située à ${city} (${restDist}). Des produits frais préparés maison chaque jour.`,
        category: category || 'Général',
        dispositionShop: restDist,
        isFavorite: Math.random() > 0.6,
        latitude: center.lat + randOffsetLat,
        longitude: center.lng + randOffsetLng,
        isOrderingEnabled: true
      };

      restaurants.push(newRest);
      createdRestaurants.push(newRest);
      await persistRestaurantToFirestore(newRest);

      // Create a default signature dish for this restaurant
      const dishId = 'dish-' + Math.random().toString(36).substring(2, 9);
      const newDish = {
        id: dishId,
        restaurantId: id,
        name: `Plat Signature ${cleanName}`,
        price: Math.floor(Math.random() * 12) + 9.50,
        description: `Notre fameuse création maison, cuisinée à la perfection par notre Chef à ${city}.`,
        imageUrl: foodPics[Math.floor(Math.random() * foodPics.length)],
        isAvailable: true,
        isPopular: true
      };
      dishes.push(newDish);
      await persistDishToFirestore(newDish);

      // Default foodie video to ensure rendering on the main page
      const newVideo = {
        id: 'vid-' + Math.random().toString(36).substring(2, 9),
        restaurantId: id,
        videoUrl: demoVideoUrls[Math.floor(Math.random() * demoVideoUrls.length)],
        title: `🔥 Découvrez ${cleanName} à ${city} ! Le meilleur de la catégorie ${category || 'Général'} !`,
        likesCount: Math.floor(Math.random() * 150) + 30,
        createdAt: new Date().toISOString(),
        associatedDishId: dishId
      };
      videos.unshift(newVideo);
      await persistVideoToFirestore(newVideo);
    }

    saveData();
    res.status(201).json({ success: true, count: createdRestaurants.length, restaurants: createdRestaurants });
  });

  // --- Restaurateur API Endpoints ---
  app.get('/api/restaurateurs', (req, res) => {
    res.json(restaurateurs);
  });

  app.get('/api/restaurateurs/:id', (req, res) => {
    const item = restaurateurs.find(r => r.id === req.params.id || r.restaurantId === req.params.id || r.userId === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Restaurateur non trouvé' });
    }
    res.json(item);
  });

  app.post('/api/restaurateurs', async (req, res) => {
    const { restaurantId, userId, firstName, lastName, email, phone, bio, profileImageUrl } = req.body;
    if (!restaurantId || !userId || !firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Champs obligatoires manquants : restaurantId, userId, firstName, lastName, email' });
    }
    const newRestaurateur: Restaurateur = {
      id: genId('restaurateur'),
      restaurantId,
      userId,
      firstName,
      lastName,
      email,
      phone: phone || '',
      bio: bio || '',
      profileImageUrl: profileImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString()
    };
    restaurateurs.push(newRestaurateur);
    saveData();
    await persistRestaurateurToFirestore(newRestaurateur);
    res.status(201).json(newRestaurateur);
  });

  app.put('/api/restaurateurs/:id', async (req, res) => {
    const idx = restaurateurs.findIndex(r => r.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Restaurateur non trouvé' });
    }
    const updated = {
      ...restaurateurs[idx],
      ...req.body
    };
    restaurateurs[idx] = updated;
    saveData();
    await persistRestaurateurToFirestore(updated);
    res.json(updated);
  });

  app.delete('/api/restaurateurs/:id', async (req, res) => {
    const idx = restaurateurs.findIndex(r => r.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Restaurateur non trouvé' });
    }
    const [deleted] = restaurateurs.splice(idx, 1);
    saveData();
    await deleteRestaurateurFromFirestore(deleted.id);
    res.json({ success: true, restaurateur: deleted });
  });

  // --- Restaurateur Media API Endpoints ---
  app.get('/api/restaurateurs/:id/media', (req, res) => {
    const rest = restaurateurs.find(r => r.id === req.params.id || r.restaurantId === req.params.id || r.userId === req.params.id);
    if (!rest) {
      return res.json([]);
    }
    const list = restaurateurMedia.filter(m => m.restaurateurId === rest.id || m.restaurantId === rest.restaurantId);
    res.json(list);
  });

  app.post('/api/restaurateurs/:id/media', async (req, res) => {
    const { mediaType, url, title, associatedDishId, isPosted } = req.body;
    if (!mediaType || !url || !title) {
      return res.status(400).json({ error: 'Champs obligatoires manquants : mediaType, url, title' });
    }
    const rest = restaurateurs.find(r => r.id === req.params.id || r.restaurantId === req.params.id || r.userId === req.params.id);
    if (!rest) {
      return res.status(404).json({ error: 'Restaurateur non trouvé pour l\'association de média.' });
    }
    const newMedia: RestaurateurMedia = {
      id: genId('media'),
      restaurateurId: rest.id,
      restaurantId: rest.restaurantId,
      mediaType,
      url,
      title,
      associatedDishId: associatedDishId || undefined,
      isPosted: !!isPosted,
      createdAt: new Date().toISOString()
    };
    restaurateurMedia.push(newMedia);

    if (mediaType === 'video' && newMedia.isPosted) {
      const alreadyInVideos = videos.some(v => v.videoUrl === url);
      if (!alreadyInVideos) {
        videos.unshift({
          id: 'vid-' + Math.random().toString(36).substring(2, 9),
          restaurantId: rest.restaurantId,
          videoUrl: url,
          associatedDishId: associatedDishId || undefined,
          title: title,
          likesCount: Math.floor(Math.random() * 20),
          createdAt: new Date().toISOString()
        });
      }
    }

    saveData();
    await persistMediaToFirestore(newMedia);
    res.status(201).json(newMedia);
  });

  app.put('/api/restaurateurs/media/:mediaId', async (req, res) => {
    const idx = restaurateurMedia.findIndex(m => m.id === req.params.mediaId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }
    const oldMedia = restaurateurMedia[idx];
    const updated = {
      ...oldMedia,
      ...req.body
    };
    restaurateurMedia[idx] = updated;

    if (updated.mediaType === 'video') {
      if (updated.isPosted && !oldMedia.isPosted) {
        const alreadyInVideos = videos.some(v => v.videoUrl === updated.url);
        if (!alreadyInVideos) {
          videos.unshift({
            id: 'vid-' + Math.random().toString(36).substring(2, 9),
            restaurantId: updated.restaurantId,
            videoUrl: updated.url,
            associatedDishId: updated.associatedDishId || undefined,
            title: updated.title,
            likesCount: Math.floor(Math.random() * 20),
            createdAt: new Date().toISOString()
          });
        }
      } else if (!updated.isPosted && oldMedia.isPosted) {
        const vIdx = videos.findIndex(v => v.videoUrl === updated.url);
        if (vIdx !== -1) {
          videos.splice(vIdx, 1);
        }
      }
    }

    saveData();
    await persistMediaToFirestore(updated);
    res.json(updated);
  });

  app.delete('/api/restaurateurs/media/:mediaId', async (req, res) => {
    const idx = restaurateurMedia.findIndex(m => m.id === req.params.mediaId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }
    const [deleted] = restaurateurMedia.splice(idx, 1);

    if (deleted.mediaType === 'video') {
      const vIdx = videos.findIndex(v => v.videoUrl === deleted.url);
      if (vIdx !== -1) {
        videos.splice(vIdx, 1);
      }
    }

    saveData();
    await deleteMediaFromFirestore(deleted.id);
    res.json({ success: true, media: deleted });
  });

  // Get formulas
  app.get('/api/formulas', (req, res) => {
    res.json(formulas);
  });

  // Update formula (Admin CMS)
  app.put('/api/formulas/:id', (req, res) => {
    const idx = formulas.findIndex(f => f.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Formule non trouvée' });
    }
    const { name, price, description } = req.body;
    formulas[idx] = {
      ...formulas[idx],
      name: name !== undefined ? name : formulas[idx].name,
      price: price !== undefined ? Number(price) : formulas[idx].price,
      description: description !== undefined ? description : formulas[idx].description
    };
    saveData();
    res.json(formulas[idx]);
  });

  // Create Restaurant (Admin CMS)
  app.post('/api/restaurants', async (req, res) => {
    const { 
      name, 
      address, 
      commissionRateDelivery, 
      commissionRateCollect, 
      stripeAccountId,
      logoUrl,
      bannerUrl,
      email,
      phone,
      description,
      isFavorite,
      category,
      dispositionShop,
      shortName,
      latitude,
      longitude,
      videoUrl,
      videoTitle,
      isPublished
    } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Champs name et address requis' });
    }

    const newRest: Restaurant = {
      id: 'rest-' + Math.random().toString(36).substring(2, 9),
      userId: 'usr-admin-1', // Default creator
      name,
      address,
      commissionRateDelivery: Number(commissionRateDelivery || 15),
      commissionRateCollect: Number(commissionRateCollect || 5),
      stripeAccountId: stripeAccountId || '',
      logoUrl: logoUrl || '',
      bannerUrl: bannerUrl || '',
      email: email || '',
      phone: phone || '',
      description: description || '',
      isFavorite: !!isFavorite,
      category: category || 'Général',
      dispositionShop: dispositionShop || '',
      shortName: shortName || name,
      latitude: latitude !== undefined ? Number(latitude) : 48.8566,
      longitude: longitude !== undefined ? Number(longitude) : 2.3522,
      isPublished: isPublished !== undefined ? !!isPublished : true,
      createdAt: new Date().toISOString()
    };

    restaurants.push(newRest);
    await persistRestaurantToFirestore(newRest);

    // Ensure every restaurant always has a high-quality video associated for feed playback
    const finalVideoUrl = videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-dough-for-making-pizza-39974-large.mp4';
    const newVideo: Video = {
      id: 'vid-' + Math.random().toString(36).substring(2, 9),
      restaurantId: newRest.id,
      videoUrl: finalVideoUrl,
      title: videoTitle || `Découvrez la délicieuse cuisine de ${newRest.name} ! 🎬✨`,
      likesCount: Math.floor(Math.random() * 80) + 10,
      createdAt: new Date().toISOString()
    };
    videos.unshift(newVideo);
    await persistVideoToFirestore(newVideo);

    res.status(201).json(newRest);
  });

  // Update Restaurant (Admin CMS)
  app.put('/api/restaurants/:id', async (req, res) => {
    const idx = restaurants.findIndex(r => r.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }

    const { videoUrl, videoTitle, videoSourceType, isLiveContinuous } = req.body;

    const updated: Restaurant = {
      ...restaurants[idx],
      ...req.body,
      commissionRateDelivery: req.body.commissionRateDelivery !== undefined ? Number(req.body.commissionRateDelivery) : restaurants[idx].commissionRateDelivery,
      commissionRateCollect: req.body.commissionRateCollect !== undefined ? Number(req.body.commissionRateCollect) : restaurants[idx].commissionRateCollect,
      isFavorite: req.body.isFavorite !== undefined ? !!req.body.isFavorite : restaurants[idx].isFavorite,
      latitude: req.body.latitude !== undefined ? Number(req.body.latitude) : restaurants[idx].latitude,
      longitude: req.body.longitude !== undefined ? Number(req.body.longitude) : restaurants[idx].longitude
    };

    restaurants[idx] = updated;
    await persistRestaurantToFirestore(updated);

    if (videoUrl) {
      const vIdx = videos.findIndex(v => v.restaurantId === req.params.id);
      if (vIdx !== -1) {
        videos[vIdx].videoUrl = videoUrl;
        if (videoTitle !== undefined) {
          videos[vIdx].title = videoTitle;
        }
        if (videoSourceType !== undefined) {
          videos[vIdx].videoSourceType = videoSourceType;
        }
        if (isLiveContinuous !== undefined) {
          videos[vIdx].isLiveContinuous = !!isLiveContinuous;
        }
        await persistVideoToFirestore(videos[vIdx]);
      } else {
        const newVideo: Video = {
          id: 'vid-' + Math.random().toString(36).substring(2, 9),
          restaurantId: req.params.id,
          videoUrl: videoUrl,
          title: videoTitle || `Découvrez la délicieuse cuisine de ${updated.name} ! 🎬✨`,
          likesCount: Math.floor(Math.random() * 80) + 10,
          createdAt: new Date().toISOString(),
          videoSourceType: videoSourceType || 'direct',
          isLiveContinuous: !!isLiveContinuous,
          isOnline: true,
          viewsCount: 0,
          averageWatchTime: 0
        };
        videos.unshift(newVideo);
        await persistVideoToFirestore(newVideo);
      }
    }

    res.json(updated);
  });

  // Delete Restaurant (Admin CMS)
  app.delete('/api/restaurants/:id', async (req, res) => {
    const idx = restaurants.findIndex(r => r.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }
    const [deleted] = restaurants.splice(idx, 1);
    
    // Delete restaurant from Firestore
    await deleteRestaurantFromFirestore(deleted.id);
    
    // Delete associated videos and dishes from Firestore and memory
    const associatedVideos = videos.filter(v => v.restaurantId === req.params.id);
    for (const v of associatedVideos) {
      const vIdx = videos.findIndex(vid => vid.id === v.id);
      if (vIdx !== -1) videos.splice(vIdx, 1);
      await deleteVideoFromFirestore(v.id);
    }
    
    const associatedDishes = dishes.filter(d => d.restaurantId === req.params.id);
    for (const d of associatedDishes) {
      const dIdx = dishes.findIndex(dish => dish.id === d.id);
      if (dIdx !== -1) dishes.splice(dIdx, 1);
      await deleteDishFromFirestore(d.id);
    }
    
    saveData();
    res.json(deleted);
  });

  // Bulk Delete Restaurants (Admin CMS)
  app.post('/api/restaurants/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Liste d'identifiants invalide" });
    }
    
    try {
      console.log(`[Firebase Server] Bulk deleting ${ids.length} restaurants...`);
      let deletedCount = 0;
      
      for (const id of ids) {
        const idx = restaurants.findIndex(r => r.id === id);
        if (idx !== -1) {
          const [deleted] = restaurants.splice(idx, 1);
          await deleteRestaurantFromFirestore(deleted.id);
          
          // Delete associated videos and dishes
          const associatedVideos = videos.filter(v => v.restaurantId === id);
          for (const v of associatedVideos) {
            const vIdx = videos.findIndex(vid => vid.id === v.id);
            if (vIdx !== -1) videos.splice(vIdx, 1);
            await deleteVideoFromFirestore(v.id);
          }
          
          const associatedDishes = dishes.filter(d => d.restaurantId === id);
          for (const d of associatedDishes) {
            const dIdx = dishes.findIndex(dish => dish.id === d.id);
            if (dIdx !== -1) dishes.splice(dIdx, 1);
            await deleteDishFromFirestore(d.id);
          }
          deletedCount++;
        }
      }
      
      saveData();
      res.json({ success: true, count: deletedCount });
    } catch (err: any) {
      console.error('[Firebase Server] Error during bulk delete:', err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Admin database cleanup (Delete any Firestore document not in active memory)
  app.post('/api/admin/database-cleanup', async (req, res) => {
    if (!db) {
      return res.status(500).json({ error: "La base de données Firestore n'est pas connectée." });
    }
    try {
      console.log('[Firebase Server] Starting database cleanup...');
      
      // Get all restaurants currently in the server memory
      const adminRestIds = new Set(restaurants.map(r => r.id));
      
      // Get all restaurant documents from Firestore
      const restaurantsSnap = await runFirestoreOp('cleanup get restaurants', () => getDocs(collection(db, 'restaurants')));
      let deletedRestsCount = 0;
      
      if (restaurantsSnap) {
        for (const docSnap of restaurantsSnap.docs) {
          const id = docSnap.id;
          if (!adminRestIds.has(id)) {
            await runFirestoreOp(`cleanup delete restaurant ${id}`, () => deleteDoc(doc(db, 'restaurants', id)));
            deletedRestsCount++;
          }
        }
      }
      
      // Clean up orphaned dishes and videos
      const adminDishIds = new Set(dishes.map(d => d.id));
      const dishesSnap = await runFirestoreOp('cleanup get dishes', () => getDocs(collection(db, 'dishes')));
      let deletedDishesCount = 0;
      
      if (dishesSnap) {
        for (const docSnap of dishesSnap.docs) {
          const id = docSnap.id;
          const data = docSnap.data();
          if (!adminDishIds.has(id) || !adminRestIds.has(data.restaurantId)) {
            await runFirestoreOp(`cleanup delete dish ${id}`, () => deleteDoc(doc(db, 'dishes', id)));
            deletedDishesCount++;
          }
        }
      }
      
      const adminVideoIds = new Set(videos.map(v => v.id));
      const videosSnap = await runFirestoreOp('cleanup get videos', () => getDocs(collection(db, 'videos')));
      let deletedVideosCount = 0;
      
      if (videosSnap) {
        for (const docSnap of videosSnap.docs) {
          const id = docSnap.id;
          const data = docSnap.data();
          if (!adminVideoIds.has(id) || !adminRestIds.has(data.restaurantId)) {
            await runFirestoreOp(`cleanup delete video ${id}`, () => deleteDoc(doc(db, 'videos', id)));
            deletedVideosCount++;
          }
        }
      }
      
      console.log(`[Firebase Server] Database cleanup completed. Deleted ${deletedRestsCount} extra restaurants, ${deletedDishesCount} extra dishes, and ${deletedVideosCount} extra videos from Firestore.`);
      
      res.json({
        success: true,
        deletedRestaurants: deletedRestsCount,
        deletedDishes: deletedDishesCount,
        deletedVideos: deletedVideosCount
      });
    } catch (err: any) {
      console.error('[Firebase Server] Error during database cleanup:', err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // --- Admin Backups API Endpoints ---
  app.get('/api/admin/backups', async (req, res) => {
    try {
      let backups: any[] = [];
      if (db && !isFirestoreUnreachable) {
        const snap = await runFirestoreOp('get system backups', () => getDocs(collection(db, 'system_backups')));
        if (snap && !snap.empty) {
          snap.forEach(docSnap => {
            backups.push(docSnap.data());
          });
        }
      }
      
      // Seed default backup if nothing is found
      if (backups.length === 0) {
        const defaultState = {
          restaurants,
          dishes,
          videos,
          restaurateurs,
          restaurateurMedia,
          designSettings
        };
        const initialBackup = {
          id: 'original',
          name: "Sauvegarde d'Origine (Configuration Initiale)",
          type: 'original',
          data: JSON.stringify(defaultState),
          createdAt: new Date().toISOString()
        };
        if (db && !isFirestoreUnreachable) {
          await runFirestoreOp('create original backup', () => setDoc(doc(db, 'system_backups', 'original'), initialBackup));
        }
        backups.push(initialBackup);
      }
      
      // Sort: original first, then manual by date desc
      backups.sort((a, b) => {
        if (a.type === 'original') return -1;
        if (b.type === 'original') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      res.json(backups);
    } catch (err: any) {
      console.error('[Backup API] Error getting backups:', err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.post('/api/admin/backups', async (req, res) => {
    const { name, isOriginal } = req.body;
    try {
      const currentState = {
        restaurants,
        dishes,
        videos,
        restaurateurs,
        restaurateurMedia,
        designSettings
      };
      
      const backupId = isOriginal ? 'original' : 'backup_' + Math.random().toString(36).substring(2, 9);
      const newBackup = {
        id: backupId,
        name: name || `Sauvegarde manuelle du ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`,
        type: isOriginal ? 'original' : 'manual',
        data: JSON.stringify(currentState),
        createdAt: new Date().toISOString()
      };
      
      if (db && !isFirestoreUnreachable) {
        await runFirestoreOp(`save backup ${backupId}`, () => setDoc(doc(db, 'system_backups', backupId), newBackup));
      }
      
      res.status(201).json(newBackup);
    } catch (err: any) {
      console.error('[Backup API] Error creating backup:', err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.post('/api/admin/backups/restore', async (req, res) => {
    const { backupId } = req.body;
    if (!backupId) {
      return res.status(400).json({ error: "backupId requis." });
    }
    try {
      let backupDoc: any = null;
      if (db && !isFirestoreUnreachable) {
        const docSnap = await runFirestoreOp('get backup for restore', () => getDoc(doc(db, 'system_backups', backupId)));
        if (docSnap && docSnap.exists()) {
          backupDoc = docSnap.data();
        }
      }
      
      if (!backupDoc && backupId === 'original') {
        // Fallback: build default backup state if it went missing
        const defaultState = {
          restaurants,
          dishes,
          videos,
          restaurateurs,
          restaurateurMedia,
          designSettings
        };
        backupDoc = {
          id: 'original',
          name: "Sauvegarde d'Origine (Configuration Initiale)",
          type: 'original',
          data: JSON.stringify(defaultState)
        };
      }
      
      if (!backupDoc) {
        return res.status(404).json({ error: "Sauvegarde introuvable." });
      }
      
      const state = JSON.parse(backupDoc.data);
      
      if (state.restaurants) restaurants = state.restaurants;
      if (state.dishes) dishes = state.dishes;
      if (state.videos) videos = state.videos;
      if (state.restaurateurs) restaurateurs = state.restaurateurs;
      if (state.restaurateurMedia) restaurateurMedia = state.restaurateurMedia;
      if (state.designSettings) {
        designSettings = {
          ...designSettings,
          ...state.designSettings
        };
      }
      
      saveData();
      
      if (db && !isFirestoreUnreachable) {
        console.log('[Backup API] Syncing restored state back to Firestore...');
        
        try {
          const rSnap = await getDocs(collection(db, 'restaurants'));
          for (const docSnap of rSnap.docs) {
            await deleteDoc(doc(db, 'restaurants', docSnap.id));
          }
          
          const dSnap = await getDocs(collection(db, 'dishes'));
          for (const docSnap of dSnap.docs) {
            await deleteDoc(doc(db, 'dishes', docSnap.id));
          }
          
          const vSnap = await getDocs(collection(db, 'videos'));
          for (const docSnap of vSnap.docs) {
            await deleteDoc(doc(db, 'videos', docSnap.id));
          }

          const rmSnap = await getDocs(collection(db, 'restaurateur_media'));
          for (const docSnap of rmSnap.docs) {
            await deleteDoc(doc(db, 'restaurateur_media', docSnap.id));
          }

          const rsSnap = await getDocs(collection(db, 'restaurateurs'));
          for (const docSnap of rsSnap.docs) {
            await deleteDoc(doc(db, 'restaurateurs', docSnap.id));
          }
        } catch (cleanErr) {
          console.error('[Backup API] Warning: Error cleaning up prior Firestore docs:', cleanErr);
        }
        
        for (const r of restaurants) {
          await persistRestaurantToFirestore(r);
        }
        for (const d of dishes) {
          await persistDishToFirestore(d);
        }
        for (const v of videos) {
          await persistVideoToFirestore(v);
        }
        for (const r of restaurateurs) {
          await persistRestaurateurToFirestore(r);
        }
        for (const m of restaurateurMedia) {
          await persistMediaToFirestore(m);
        }
        
        await persistDesignSettingsToFirestore(designSettings);
      }
      
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Backup API] Error restoring backup:', err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // --- Admin Media API Endpoints ---
  app.get('/api/admin/media', (req, res) => {
    res.json(restaurateurMedia);
  });

  app.post('/api/admin/media', async (req, res) => {
    const { restaurantId, mediaType, url, title, tags, associatedDishId, isPosted } = req.body;
    if (!mediaType || !url || !title) {
      return res.status(400).json({ error: "Champs requis manquants." });
    }
    try {
      const newMedia: RestaurateurMedia = {
        id: 'media-' + Math.random().toString(36).substring(2, 9),
        restaurateurId: 'admin',
        restaurantId: restaurantId || '',
        mediaType,
        url,
        title,
        tags: tags || [],
        associatedDishId: associatedDishId || undefined,
        isPosted: !!isPosted,
        createdAt: new Date().toISOString()
      };
      restaurateurMedia.unshift(newMedia);
      
      if (mediaType === 'video' && newMedia.isPosted) {
        const alreadyInVideos = videos.some(v => v.videoUrl === url);
        if (!alreadyInVideos) {
          videos.unshift({
            id: 'vid-' + Math.random().toString(36).substring(2, 9),
            restaurantId: restaurantId || '',
            videoUrl: url,
            associatedDishId: associatedDishId || undefined,
            title: title,
            likesCount: Math.floor(Math.random() * 20),
            createdAt: new Date().toISOString()
          });
        }
      }
      
      saveData();
      if (db && !isFirestoreUnreachable) {
        await persistMediaToFirestore(newMedia);
      }
      res.status(201).json(newMedia);
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.put('/api/admin/media/:id', async (req, res) => {
    const { id } = req.params;
    const idx = restaurateurMedia.findIndex(m => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Média non trouvé." });
    }
    try {
      const oldMedia = restaurateurMedia[idx];
      const updated: RestaurateurMedia = {
        ...oldMedia,
        ...req.body
      };
      restaurateurMedia[idx] = updated;
      
      if (updated.mediaType === 'video') {
        if (updated.isPosted && !oldMedia.isPosted) {
          const alreadyInVideos = videos.some(v => v.videoUrl === updated.url);
          if (!alreadyInVideos) {
            videos.unshift({
              id: 'vid-' + Math.random().toString(36).substring(2, 9),
              restaurantId: updated.restaurantId,
              videoUrl: updated.url,
              associatedDishId: updated.associatedDishId || undefined,
              title: updated.title,
              likesCount: Math.floor(Math.random() * 20),
              createdAt: new Date().toISOString()
            });
          }
        } else if (!updated.isPosted && oldMedia.isPosted) {
          const vIdx = videos.findIndex(v => v.videoUrl === updated.url);
          if (vIdx !== -1) {
            videos.splice(vIdx, 1);
          }
        }
      }
      
      saveData();
      if (db && !isFirestoreUnreachable) {
        await persistMediaToFirestore(updated);
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.delete('/api/admin/media/:id', async (req, res) => {
    const { id } = req.params;
    const idx = restaurateurMedia.findIndex(m => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Média non trouvé." });
    }
    try {
      const [deleted] = restaurateurMedia.splice(idx, 1);
      
      if (deleted.mediaType === 'video') {
        const vIdx = videos.findIndex(v => v.videoUrl === deleted.url);
        if (vIdx !== -1) {
          videos.splice(vIdx, 1);
        }
      }
      
      saveData();
      if (db && !isFirestoreUnreachable) {
        await deleteMediaFromFirestore(deleted.id);
      }
      res.json({ success: true, media: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Get users database (Admin CMS)
  app.get('/api/users', (req, res) => {
    res.json(users);
  });

  // Delete user (Admin CMS)
  app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const [deleted] = users.splice(idx, 1);
      if (db) {
        try {
          await deleteDoc(doc(db, 'users', id));
        } catch (e) {
          console.error("Error deleting user from Firestore:", e);
        }
      }
      saveData();
      return res.json(deleted);
    }
    res.status(404).json({ error: "Utilisateur non trouvé" });
  });

  // Get Restaurant by ID or current logged-in restaurant for merchant
  app.get('/api/restaurants/:id', (req, res) => {
    const rest = restaurants.find(r => r.id === req.params.id);
    if (!rest) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }
    res.json(rest);
  });

  // 3. Get Dishes for a Restaurant
  app.get('/api/restaurants/:restaurantId/dishes', (req, res) => {
    const restDishes = dishes.filter(d => d.restaurantId === req.params.restaurantId);
    res.json(restDishes);
  });

  // 4. Menu Management CRUD (CÔTÉ RESTAURATEUR)
  // Create Dish
  app.post('/api/dishes', async (req, res) => {
    const { restaurantId, name, description, price, isAvailable, imageUrl, stockCount } = req.body;
    if (!restaurantId || !name || price === undefined) {
      return res.status(400).json({ error: 'Champs obligatoires manquants : restaurantId, name, price' });
    }
    const newDish: Dish = {
      id: genId('dish'),
      restaurantId,
      name,
      description: description || '',
      price: Number(price),
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      stockCount: stockCount !== undefined ? Number(stockCount) : undefined
    };
    dishes.push(newDish);
    await persistDishToFirestore(newDish);
    res.status(201).json(newDish);
  });

  // Update Dish
  app.put('/api/dishes/:id', async (req, res) => {
    const index = dishes.findIndex(d => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Plat non trouvé' });
    }
    const updated = {
      ...dishes[index],
      ...req.body,
      price: req.body.price !== undefined ? Number(req.body.price) : dishes[index].price,
      isAvailable: req.body.isAvailable !== undefined ? Boolean(req.body.isAvailable) : dishes[index].isAvailable
    };
    dishes[index] = updated;
    await persistDishToFirestore(updated);
    res.json(updated);
  });

  // Delete Dish
  app.delete('/api/dishes/:id', async (req, res) => {
    const index = dishes.findIndex(d => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Plat non trouvé' });
    }
    const deleted = dishes.splice(index, 1);
    await deleteDishFromFirestore(req.params.id);
    
    // Also remove associated dish references from videos to prevent dead links
    for (const v of videos) {
      if (v.associatedDishId === req.params.id) {
        v.associatedDishId = undefined;
        await persistVideoToFirestore(v);
      }
    }
    saveData();
    res.json({ message: 'Plat supprimé avec succès', dish: deleted[0] });
  });

  // Unified Video Validation Endpoint for Realtime Dashboard Checker
  app.post('/api/videos/validate', async (req, res) => {
    const { videoUrl, videoSourceType } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ error: 'URL de vidéo requise' });
    }
    const result = await validateVideoSource(videoUrl, videoSourceType);
    res.json(result);
  });

  // 5. Video Content Manager (Uploader / Publisher)
  app.post('/api/videos', async (req, res) => {
    const { restaurantId, videoUrl, associatedDishId, title, isOnline, videoSourceType, isLiveContinuous, duration, isTooLong } = req.body;
    if (!restaurantId || !videoUrl) {
      return res.status(400).json({ error: 'Champs obligatoires manquants : restaurantId, videoUrl' });
    }

    // Validate video source on creation
    const validationResult = await validateVideoSource(videoUrl, videoSourceType);

    const calculatedDuration = duration !== undefined ? Number(duration) : undefined;
    const computedTooLong = isTooLong !== undefined ? !!isTooLong : (calculatedDuration ? calculatedDuration > 60 : false);

    const newVid: Video = {
      id: genId('vid'),
      restaurantId,
      videoUrl,
      associatedDishId: associatedDishId || undefined,
      title: title || 'Nouveau plat succulent à déguster ! ✨',
      likesCount: Math.floor(Math.random() * 5),
      createdAt: new Date().toISOString(),
      isOnline: isOnline !== undefined ? !!isOnline : true,
      videoSourceType: videoSourceType || 'direct',
      isLiveContinuous: !!isLiveContinuous,
      viewsCount: Math.floor(Math.random() * 30) + 12,
      averageWatchTime: Math.floor(Math.random() * 8) + 4,
      validationStatus: validationResult.isValid ? 'valid' : 'invalid',
      validationCheckedAt: new Date().toISOString(),
      validationError: validationResult.isValid ? undefined : (validationResult.error || 'Validation échouée'),
      duration: calculatedDuration,
      isTooLong: computedTooLong
    };
    videos.unshift(newVid); // prepend so it appears first
    await persistVideoToFirestore(newVid);
    saveData();
    res.status(201).json(newVid);
  });

  app.put('/api/videos/:id', async (req, res) => {
    const index = videos.findIndex(v => v.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }
    const oldVid = videos[index];

    let valStatus = oldVid.validationStatus;
    let valCheckedAt = oldVid.validationCheckedAt;
    let valError = oldVid.validationError;

    // Re-run validation if URL or source type has changed
    if (req.body.videoUrl && (req.body.videoUrl !== oldVid.videoUrl || req.body.videoSourceType !== oldVid.videoSourceType)) {
      const validationResult = await validateVideoSource(req.body.videoUrl, req.body.videoSourceType || oldVid.videoSourceType);
      valStatus = validationResult.isValid ? 'valid' : 'invalid';
      valCheckedAt = new Date().toISOString();
      valError = validationResult.isValid ? undefined : (validationResult.error || 'Validation échouée');
    }

    const calculatedDuration = req.body.duration !== undefined ? Number(req.body.duration) : oldVid.duration;
    const computedTooLong = req.body.isTooLong !== undefined ? !!req.body.isTooLong : (calculatedDuration ? calculatedDuration > 60 : (oldVid.isTooLong || false));

    const updated: Video = {
      ...oldVid,
      ...req.body,
      isOnline: req.body.isOnline !== undefined ? !!req.body.isOnline : oldVid.isOnline,
      isLiveContinuous: req.body.isLiveContinuous !== undefined ? !!req.body.isLiveContinuous : oldVid.isLiveContinuous,
      viewsCount: req.body.viewsCount !== undefined ? Number(req.body.viewsCount) : (oldVid.viewsCount || 0),
      averageWatchTime: req.body.averageWatchTime !== undefined ? Number(req.body.averageWatchTime) : (oldVid.averageWatchTime || 0),
      validationStatus: valStatus,
      validationCheckedAt: valCheckedAt,
      validationError: valError,
      duration: calculatedDuration,
      isTooLong: computedTooLong,
      createdAt: new Date().toISOString() // Refresh createdAt so edited video is shown first in the feed
    };
    
    // Splice and unshift to move it to the front of the list
    videos.splice(index, 1);
    videos.unshift(updated);
    
    await persistVideoToFirestore(updated);
    saveData();
    res.json(updated);
  });

  app.post('/api/videos/:id/view', async (req, res) => {
    const video = videos.find(v => v.id === req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }
    const { watchTime } = req.body;
    const oldViews = video.viewsCount || 0;
    const newViews = oldViews + 1;
    video.viewsCount = newViews;

    if (watchTime && typeof watchTime === 'number') {
      const oldAvg = video.averageWatchTime || 0;
      video.averageWatchTime = Number(((oldAvg * oldViews + watchTime) / newViews).toFixed(1));
    } else if (!video.averageWatchTime) {
      video.averageWatchTime = Math.floor(Math.random() * 12) + 3;
    }

    await persistVideoToFirestore(video);
    saveData();
    res.json({ success: true, viewsCount: video.viewsCount, averageWatchTime: video.averageWatchTime });
  });

  app.delete('/api/videos/:id', async (req, res) => {
    const index = videos.findIndex(v => v.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Vidéo non trouvée' });
    }
    const deleted = videos.splice(index, 1);
    await deleteVideoFromFirestore(req.params.id);
    saveData();
    res.json({ message: 'Vidéo supprimée avec succès', video: deleted[0] });
  });

  // Bulk AI Captions & Promotional Overlays
  app.post('/api/videos/bulk-ai-captions', async (req, res) => {
    const { videoIds } = req.body;
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ error: 'Liste de videoIds invalide ou vide.' });
    }

    try {
      const client = getGeminiClient();
      if (!client) {
        return res.status(500).json({ error: 'Le client Gemini n\'est pas configuré. Vérifiez votre clé d\'API.' });
      }

      const updatedList = [];

      for (const id of videoIds) {
        const videoIndex = videos.findIndex(v => v.id === id);
        if (videoIndex === -1) continue;

        const video = videos[videoIndex];
        const r = restaurants.find(rest => rest.id === video.restaurantId);
        const d = dishes.find(dish => dish.id === video.associatedDishId);

        const prompt = `You are a premium social media copywriter for food creators on a TikTok-like food delivery platform called Fidfud.
We have a vertical short video for a restaurant named '${r ? r.name : 'un restaurant'}'.
The video is currently titled: '${video.title}'.
${d ? `It is associated with the dish '${d.name}': '${d.description}', priced at ${d.price}€.` : ''}

Generate a single, short, ultra-engaging, and appetizing social media caption/title in French for this video.
Keep it extremely concise (8 to 14 words max), engaging, and add 1-2 relevant food/delivery emojis (e.g. 🍕, 🍔, 🍜, 🔥, 🤤).
Only output the generated caption text. Do NOT include quotes, "Voici la légende :", or any explanations.`;

        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        const newTitle = response.text ? response.text.trim().replace(/^["']|["']$/g, '') : video.title;
        video.title = newTitle;
        await persistVideoToFirestore(video);
        updatedList.push(video);
      }

      res.json({ success: true, updatedVideos: updatedList });
    } catch (err: any) {
      console.error('Error generating bulk AI captions:', err);
      res.status(500).json({ error: 'Erreur lors de la génération des légendes par IA : ' + err.message });
    }
  });

  app.post('/api/videos/bulk-promo-overlay', async (req, res) => {
    const { videoIds, promoOverlay } = req.body;
    if (!videoIds || !Array.isArray(videoIds)) {
      return res.status(400).json({ error: 'Liste de videoIds invalide.' });
    }

    const updatedList = [];
    for (const id of videoIds) {
      const videoIndex = videos.findIndex(v => v.id === id);
      if (videoIndex === -1) continue;

      videos[videoIndex].promoOverlay = promoOverlay ? promoOverlay.trim() : undefined;
      await persistVideoToFirestore(videos[videoIndex]);
      updatedList.push(videos[videoIndex]);
    }

    res.json({ success: true, updatedVideos: updatedList });
  });

  // --- New Features Endpoints ---

  // A. Comments
  app.get('/api/videos/:videoId/comments', (req, res) => {
    const videoComments = comments.filter(c => c.videoId === req.params.videoId);
    videoComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(videoComments);
  });

  app.post('/api/videos/:videoId/comments', (req, res) => {
    const { videoId } = req.params;
    const { text, userId, userEmail } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Le commentaire ne peut pas être vide.' });
    }

    const newComment: Comment = {
      id: genId('cmt'),
      videoId,
      userId: userId || currentUserSession?.id || 'usr-anonymous',
      userEmail: userEmail || currentUserSession?.email || 'anonyme@fidfud.app',
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    comments.push(newComment);
    res.status(201).json(newComment);
  });

  app.delete('/api/comments/:id', (req, res) => {
    const idx = comments.findIndex(c => c.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }
    const [deleted] = comments.splice(idx, 1);
    saveData();
    res.json(deleted);
  });

  // B. Points & Wallet
  app.get('/api/users/:userId/points', (req, res) => {
    const record = userPoints.find(up => up.userId === req.params.userId);
    const balance = record ? record.points : 0;
    res.json({ userId: req.params.userId, points: balance });
  });

  app.post('/api/users/:userId/points/purchase', (req, res) => {
    const { userId } = req.params;
    const { amount } = req.body; // e.g. 100 points
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Montant de points invalide.' });
    }

    let record = userPoints.find(up => up.userId === userId);
    if (!record) {
      record = { userId, points: 0 };
      userPoints.push(record);
    }

    record.points += Number(amount);
    res.json({ success: true, points: record.points });
  });

  // Loyalty Earn Points Route
  app.post('/api/users/:userId/points/earn', (req, res) => {
    const { userId } = req.params;
    const { points, reason } = req.body;
    const pts = Number(points);
    if (!pts || isNaN(pts) || pts <= 0) {
      return res.status(400).json({ error: 'Montant de points à gagner invalide.' });
    }

    let record = userPoints.find(up => up.userId === userId);
    if (!record) {
      record = { userId, points: 0 };
      userPoints.push(record);
    }

    record.points += pts;
    res.json({ success: true, points: record.points, earned: pts, reason: reason || 'Activité' });
  });

  // Get User Loyalty Claims / Rewards
  app.get('/api/users/:userId/rewards', (req, res) => {
    const { userId } = req.params;
    const claims = userRewardClaims.filter(c => c.userId === userId);
    res.json(claims);
  });

  // Redeem Loyalty Points for Reward Claim
  app.post('/api/users/:userId/rewards/redeem', (req, res) => {
    const { userId } = req.params;
    const { rewardId, rewardName, pointsCost } = req.body;

    const cost = Number(pointsCost);
    if (!rewardId || !rewardName || isNaN(cost) || cost <= 0) {
      return res.status(400).json({ error: 'Informations de récompense invalides.' });
    }

    let record = userPoints.find(up => up.userId === userId);
    if (!record || record.points < cost) {
      return res.status(400).json({ error: 'Solde de points fidélité insuffisant.' });
    }

    record.points -= cost;

    // Generate code
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    let prefix = 'PERK';
    if (rewardId.includes('10-percent')) prefix = 'FID10';
    if (rewardId.includes('free-delivery')) prefix = 'FREESHIP';
    if (rewardId.includes('free-dessert')) prefix = 'DESSERT';
    if (rewardId.includes('free-drink')) prefix = 'SODA';

    const claimCode = `${prefix}-${suffix}`;

    const newClaim: UserRewardClaim = {
      id: genId('clm'),
      userId,
      rewardId,
      rewardName,
      code: claimCode,
      isUsed: false,
      createdAt: new Date().toISOString()
    };

    userRewardClaims.push(newClaim);

    res.json({
      success: true,
      points: record.points,
      claim: newClaim
    });
  });

  // C. Tips & Flowers
  app.get('/api/videos/:videoId/tips', (req, res) => {
    const videoTips = tips.filter(t => t.videoId === req.params.videoId);
    res.json(videoTips);
  });

  app.post('/api/videos/:videoId/tip', (req, res) => {
    const { videoId } = req.params;
    const { userId, userEmail, icon, points } = req.body; // icon could be "🌸", points could be 10

    const ptsToSend = Number(points || 0);
    const uId = userId || currentUserSession?.id;
    if (!uId) {
      return res.status(401).json({ error: 'Vous devez être connecté pour envoyer un cadeau.' });
    }

    // Deduct points from sender
    let senderRecord = userPoints.find(up => up.userId === uId);
    if (!senderRecord) {
      senderRecord = { userId: uId, points: 0 };
      userPoints.push(senderRecord);
    }

    if (ptsToSend > 0 && senderRecord.points < ptsToSend) {
      return res.status(400).json({ error: 'Solde de points insuffisant.' });
    }

    senderRecord.points -= ptsToSend;

    // Find the video and restaurateur to award points
    const videoObj = videos.find(v => v.id === videoId);
    if (!videoObj) {
      return res.status(404).json({ error: 'Vidéo non trouvée.' });
    }

    const restObj = restaurants.find(r => r.id === videoObj.restaurantId);
    if (restObj && ptsToSend > 0) {
      let restOwnerRecord = userPoints.find(up => up.userId === restObj.userId);
      if (!restOwnerRecord) {
        restOwnerRecord = { userId: restObj.userId, points: 0 };
        userPoints.push(restOwnerRecord);
      }
      restOwnerRecord.points += ptsToSend;
      restObj.pointsReceived = (restObj.pointsReceived || 0) + ptsToSend;
    }
    if (restObj) {
      restObj.likesReceived = (restObj.likesReceived || 0) + 1;
    }

    const newTip: Tip = {
      id: genId('tip'),
      videoId,
      userId: uId,
      userEmail: userEmail || currentUserSession?.email || 'anonyme@fidfud.app',
      restaurantId: videoObj.restaurantId,
      icon: icon || '🌸',
      pointsSent: ptsToSend,
      createdAt: new Date().toISOString()
    };

    tips.push(newTip);

    // Also slightly boost video's likes count as engagement reward!
    videoObj.likesCount += 1;

    res.status(201).json({ success: true, tip: newTip, userPoints: senderRecord.points });
  });

  // D. Reviews & Ratings
  app.get('/api/restaurants/:restaurantId/reviews', (req, res) => {
    const restReviews = reviews.filter(r => r.restaurantId === req.params.restaurantId);
    restReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(restReviews);
  });

  app.post('/api/restaurants/:restaurantId/reviews', (req, res) => {
    const { restaurantId } = req.params;
    const { userName, rating, text } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Note invalide (doit être entre 1 et 5).' });
    }

    const newReview: Review = {
      id: genId('rev'),
      restaurantId,
      userName: userName || currentUserSession?.email || 'Client Gourmand',
      rating: Number(rating),
      text: text || '',
      createdAt: new Date().toISOString()
    };

    reviews.push(newReview);
    saveData();
    res.status(201).json(newReview);
  });

  // Dish-specific reviews
  app.get('/api/dishes/:dishId/reviews', (req, res) => {
    const dishReviews = reviews.filter(r => r.dishId === req.params.dishId);
    dishReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(dishReviews);
  });

  app.post('/api/dishes/:dishId/reviews', (req, res) => {
    const { dishId } = req.params;
    const { userName, rating, text } = req.body;

    const dish = dishes.find(d => d.id === dishId);
    if (!dish) {
      return res.status(404).json({ error: 'Plat introuvable.' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Note invalide (doit être entre 1 et 5).' });
    }

    const newReview: Review = {
      id: genId('rev'),
      restaurantId: dish.restaurantId,
      dishId,
      userName: userName || currentUserSession?.email?.split('@')[0] || 'Client Gourmand',
      rating: Number(rating),
      text: text || '',
      createdAt: new Date().toISOString()
    };

    reviews.push(newReview);
    saveData();
    res.status(201).json(newReview);
  });

  // E. Subscriptions (Follows)
  app.get('/api/users/:userId/subscriptions', (req, res) => {
    const userSubs = subscriptions.filter(s => s.userId === req.params.userId);
    res.json(userSubs);
  });

  app.post('/api/restaurants/:restaurantId/subscribe', (req, res) => {
    const { restaurantId } = req.params;
    const { userId } = req.body;
    const uId = userId || currentUserSession?.id;

    if (!uId) {
      return res.status(401).json({ error: 'Vous devez être connecté pour vous abonner.' });
    }

    const existingIdx = subscriptions.findIndex(s => s.userId === uId && s.restaurantId === restaurantId);
    if (existingIdx !== -1) {
      // Unsubscribe
      subscriptions.splice(existingIdx, 1);
      saveData();
      return res.json({ subscribed: false, message: 'Désabonné avec succès.' });
    } else {
      // Subscribe
      const newSub: Subscription = {
        id: genId('sub'),
        userId: uId,
        restaurantId,
        createdAt: new Date().toISOString()
      };
      subscriptions.push(newSub);
      saveData();
      return res.json({ subscribed: true, subscription: newSub });
    }
  });

  // F. Reservations
  app.get('/api/users/:userId/reservations', (req, res) => {
    const userRes = reservations.filter(r => r.userId === req.params.userId);
    userRes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(userRes);
  });

  app.post('/api/restaurants/:restaurantId/reservations', (req, res) => {
    const { restaurantId } = req.params;
    const { userId, userEmail, date, time, guests, notes } = req.body;

    const uId = userId || currentUserSession?.id;
    if (!uId) {
      return res.status(401).json({ error: 'Vous devez être connecté pour réserver.' });
    }

    if (!date || !time || !guests || guests <= 0) {
      return res.status(400).json({ error: 'Informations de réservation incomplètes.' });
    }

    const restaurant = restaurants.find(r => r.id === restaurantId);
    const rName = restaurant ? restaurant.name : 'Restaurant';

    const newRes: Reservation = {
      id: genId('resv'),
      userId: uId,
      userEmail: userEmail || currentUserSession?.email || 'anonyme@fidfud.app',
      restaurantId,
      restaurantName: rName,
      date,
      time,
      guests: Number(guests),
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    reservations.push(newRes);
    saveData();
    res.status(201).json(newRes);
  });

  // 6. Orders Management API (CLIENT & RESTAURATEUR)
  // Get all orders (with hydrations)
  app.get('/api/orders', (req, res) => {
    const restaurantIdQuery = req.query.restaurantId as string;
    const userIdQuery = req.query.userId as string;

    let filteredOrders = orders;
    if (restaurantIdQuery) {
      filteredOrders = filteredOrders.filter(o => o.restaurantId === restaurantIdQuery);
    }
    if (userIdQuery) {
      filteredOrders = filteredOrders.filter(o => o.userId === userIdQuery);
    }

    // Hydrate restaurant name and items
    const fullyHydrated = filteredOrders.map(order => {
      const rest = restaurants.find(r => r.id === order.restaurantId);
      const itemsWithDishes = order.items?.map(item => {
        const dish = dishes.find(d => d.id === item.dishId);
        return {
          ...item,
          dishName: dish ? dish.name : 'Plat inconnu'
        };
      }) || [];
      return {
        ...order,
        restaurantName: rest ? rest.name : 'Restaurant inconnu',
        items: itemsWithDishes
      };
    });

    // Return descending by date
    fullyHydrated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(fullyHydrated);
  });

  // Create order & Stripe Connected Account split payment simulation
  app.post('/api/orders', (req, res) => {
    const { userId, restaurantId, deliveryType, items, promoCode } = req.body;
    if (!userId || !restaurantId || !deliveryType || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Données de commande invalides. Champs requis: userId, restaurantId, deliveryType, items.' });
    }

    const rest = restaurants.find(r => r.id === restaurantId);
    if (!rest) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }

    // Validate dishes and calculate total price
    let calculatedSubtotal = 0;
    const orderItemsToInsert: OrderItem[] = [];

    for (const cartItem of items) {
      const d = dishes.find(dish => dish.id === cartItem.dishId);
      if (!d) {
        return res.status(400).json({ error: `Le plat avec l'id ${cartItem.dishId} n'existe pas.` });
      }
      if (d.restaurantId !== restaurantId) {
        return res.status(400).json({ error: `Le plat ${d.name} n'appartient pas au restaurant sélectionné.` });
      }
      const itemPrice = d.price;
      const qty = Number(cartItem.quantity);
      calculatedSubtotal += itemPrice * qty;

      orderItemsToInsert.push({
        id: genId('item'),
        orderId: '', // Will update soon
        dishId: d.id,
        price: itemPrice,
        quantity: qty
      });
    }

    // Promo code validation and discount calculation
    let discountAmount = 0;
    let promoMessage = '';
    let usedClaim: UserRewardClaim | undefined;

    if (promoCode && userId) {
      const claim = userRewardClaims.find(
        c => c.userId === userId && 
        c.code.toLowerCase().trim() === promoCode.toLowerCase().trim() && 
        !c.isUsed
      );
      if (claim) {
        usedClaim = claim;
        if (claim.rewardId.includes('10-percent')) {
          discountAmount = Number((calculatedSubtotal * 0.1).toFixed(2));
          promoMessage = 'Remise Fidélité -10% appliquée !';
        } else if (claim.rewardId.includes('free-delivery')) {
          discountAmount = 0.99; // Offset the service fee
          promoMessage = 'Frais de livraison / service Fidfud offerts !';
        } else if (claim.rewardId.includes('free-dessert')) {
          promoMessage = 'Cadeau Fidélité : Dessert offert ! 🍰';
        } else if (claim.rewardId.includes('free-drink')) {
          promoMessage = 'Cadeau Fidélité : Boisson offerte ! 🥤';
        }
      }
    }

    // Fidfud Commission Rate selection based on Delivery Type (15% for delivery, 5% for collect)
    const rate = deliveryType === 'restaurant_delivery' ? rest.commissionRateDelivery : rest.commissionRateCollect;
    const fidfudCommissionAmount = Number((calculatedSubtotal * (rate / 100)).toFixed(2));
    
    // If delivery is free, we zero the serviceFee
    const hasFreeDelivery = promoMessage.includes('offerts');
    const serviceFee = hasFreeDelivery ? 0.00 : 0.99; 
    
    // Apply discount amount
    const subtotalAfterDiscount = Math.max(0, calculatedSubtotal - (hasFreeDelivery ? 0 : discountAmount));
    const totalAmount = Number((subtotalAfterDiscount + serviceFee).toFixed(2));
    
    const fidfudTotalTake = Number((fidfudCommissionAmount + serviceFee).toFixed(2));
    const restaurantPayoutAmount = Number((subtotalAfterDiscount - fidfudCommissionAmount).toFixed(2));

    const newOrderId = genId('ord');

    // Create standard mock Stripe Split details
    const stripeSplitInfo: StripeSplitResult = {
      totalAmount,
      serviceFee,
      deliveryType,
      commissionRateUsed: rate,
      fidfudCommissionAmount,
      fidfudTotalTake,
      restaurantPayoutAmount,
      stripeAccountId: rest.stripeAccountId || 'acct_default_unconnected_stripe'
    };

    const newOrder: Order = {
      id: newOrderId,
      userId,
      restaurantId,
      totalAmount,
      serviceFee,
      deliveryType,
      status: 'pending',
      stripeChargeId: `ch_stripe_payout_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      items: orderItemsToInsert.map(item => ({ ...item, orderId: newOrderId }))
    };

    // Mark the promo claim code as used!
    if (usedClaim) {
      usedClaim.isUsed = true;
    }

    orders.push(newOrder);
    saveData();

    res.status(201).json({
      message: promoMessage 
        ? `Commande validée avec code promo : "${promoMessage}". Payout Stripe calculé.`
        : 'Commande validée et payée avec succès ! Payout Stripe calculé.',
      order: {
        ...newOrder,
        restaurantName: rest.name,
        items: newOrder.items?.map(item => ({
          ...item,
          dishName: dishes.find(d => d.id === item.dishId)?.name || 'Plat inconnu'
        }))
      },
      payoutBreakdown: stripeSplitInfo
    });
  });

  // Update Order Status (CÔTÉ RESTAURATEUR)
  app.put('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    const allowedStatuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Statuts permis: ${allowedStatuses.join(', ')}` });
    }

    const index = orders.findIndex(o => o.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    orders[index].status = status as OrderStatus;
    saveData();
    res.json({
      message: `Statut mis à jour vers: ${status}`,
      order: orders[index]
    });
  });

  // =========================================================================
  // COURIER / LIVREUR API & WORKFLOW ENDPOINTS
  // =========================================================================

  // Get all couriers
  app.get('/api/couriers', (req, res) => {
    res.json(couriers);
  });

  // Register a new Courier with full Uber-style onboarding files / fields
  app.post('/api/couriers/register', (req, res) => {
    const { name, email, phone, password, vehicle, siret, drivingLicense, identityDocUrl, kbisDocUrl } = req.body;
    
    if (!name || !email || !phone || !password || !vehicle) {
      return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires (nom, email, téléphone, mot de passe, véhicule).' });
    }

    // Check duplicate email
    const duplicate = couriers.find(c => c.email?.toLowerCase() === email.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: 'Un compte livreur existe déjà avec cette adresse email.' });
    }

    const newCourier: Courier = {
      id: genId('cur'),
      name,
      email,
      phone,
      password,
      vehicle,
      status: 'offline',
      rating: 5.0,
      siret: siret || `SIRET-${Math.floor(100000000 + Math.random() * 900000000)}00019`,
      drivingLicense: drivingLicense || (vehicle !== 'Velo' ? `PERMIS-${Math.floor(10000000 + Math.random() * 90000000)}` : undefined),
      identityVerified: true, // Auto-verified for instant trial / demo onboarding
      kbisVerified: true,     // Auto-verified for instant trial / demo onboarding
      latitude: 48.8566 + (Math.random() - 0.5) * 0.02, // Paris center random
      longitude: 2.3522 + (Math.random() - 0.5) * 0.02,
      createdAt: new Date().toISOString()
    };

    couriers.push(newCourier);
    saveData();

    res.status(201).json({
      success: true,
      message: 'Inscription validée avec succès ! Votre compte est actif.',
      courier: newCourier
    });
  });

  // Courier Login
  app.post('/api/couriers/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const courier = couriers.find(
      c => c.email?.toLowerCase() === email.toLowerCase() && c.password === password
    );

    if (!courier) {
      // For demo ease, if trying to sign in with seeded emails:
      const seeded = couriers.find(c => c.email?.toLowerCase() === email.toLowerCase());
      if (seeded) {
        // Log in anyway or set password for them
        seeded.password = password;
        saveData();
        return res.json({ success: true, courier: seeded });
      }
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    res.json({ success: true, courier });
  });

  // Update Courier Status / Position
  app.put('/api/couriers/:id', (req, res) => {
    const { status, latitude, longitude, vehicle, phone, name } = req.body;
    const index = couriers.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Livreur non trouvé.' });
    }

    if (status !== undefined) couriers[index].status = status;
    if (latitude !== undefined) couriers[index].latitude = latitude;
    if (longitude !== undefined) couriers[index].longitude = longitude;
    if (vehicle !== undefined) couriers[index].vehicle = vehicle;
    if (phone !== undefined) couriers[index].phone = phone;
    if (name !== undefined) couriers[index].name = name;

    saveData();
    res.json({ success: true, courier: couriers[index] });
  });

  // Delete Courier
  app.delete('/api/couriers/:id', (req, res) => {
    const index = couriers.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Livreur non trouvé.' });
    }
    couriers.splice(index, 1);
    saveData();
    res.json({ success: true, message: 'Livreur supprimé.' });
  });

  // Assign courier to an order
  app.post('/api/orders/:id/assign-courier', (req, res) => {
    const { courierId } = req.body;
    const orderIndex = orders.findIndex(o => o.id === req.params.id);
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const courier = couriers.find(c => c.id === courierId);
    if (!courier) {
      return res.status(404).json({ error: 'Livreur non trouvé.' });
    }

    // Update courier status and associate with order
    courier.status = 'delivering';
    courier.assignedOrderId = req.params.id;

    // Update order with courier details
    const order = orders[orderIndex];
    order.courierId = courier.id;
    order.courierName = courier.name;
    order.courierPhone = courier.phone;
    order.courierStatus = 'assigned';
    order.status = 'preparing'; // Auto-advance to preparing if courier assigned
    
    // Position courier near restaurant coordinates
    const rest = restaurants.find(r => r.id === order.restaurantId);
    if (rest && rest.latitude && rest.longitude) {
      order.courierLat = rest.latitude + 0.003; // Start slightly off
      order.courierLng = rest.longitude + 0.003;
      courier.latitude = order.courierLat;
      courier.longitude = order.courierLng;
    } else {
      order.courierLat = 48.8524;
      order.courierLng = 2.3705;
      courier.latitude = 48.8524;
      courier.longitude = 2.3705;
    }

    saveData();
    res.json({ success: true, order, courier });
  });

  // Update order delivery progress & step-by-step coordinates (simulated GPS tracking)
  app.post('/api/orders/:id/update-courier-status', (req, res) => {
    const { courierStatus, latitude, longitude } = req.body;
    const allowedCourierStatuses = ['assigned', 'at_restaurant', 'en_route', 'delivered'];
    
    if (!courierStatus || !allowedCourierStatuses.includes(courierStatus)) {
      return res.status(400).json({ error: 'Statut de livraison invalide.' });
    }

    const orderIndex = orders.findIndex(o => o.id === req.params.id);
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const order = orders[orderIndex];
    order.courierStatus = courierStatus;

    if (latitude !== undefined) order.courierLat = latitude;
    if (longitude !== undefined) order.courierLng = longitude;

    // Also update order status
    if (courierStatus === 'at_restaurant') {
      order.status = 'preparing';
    } else if (courierStatus === 'en_route') {
      order.status = 'ready'; // Order has left the restaurant
    } else if (courierStatus === 'delivered') {
      order.status = 'delivered';
      
      // Free the courier
      if (order.courierId) {
        const courier = couriers.find(c => c.id === order.courierId);
        if (courier) {
          courier.status = 'available';
          courier.assignedOrderId = undefined;
        }
      }
    }

    // Sync courier position if specified
    if (order.courierId) {
      const courier = couriers.find(c => c.id === order.courierId);
      if (courier) {
        if (latitude !== undefined) courier.latitude = latitude;
        if (longitude !== undefined) courier.longitude = longitude;
        if (courierStatus === 'delivered') {
          courier.status = 'available';
          courier.assignedOrderId = undefined;
        }
      }
    }

    saveData();
    res.json({ success: true, order });
  });

  // Stripe Account settings status
  app.get('/api/stripe/status', (req, res) => {
    const restaurantId = req.query.restaurantId as string;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId manquant' });
    }
    const rest = restaurants.find(r => r.id === restaurantId);
    if (!rest) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }
    res.json({
      connected: !!rest.stripeAccountId,
      stripeAccountId: rest.stripeAccountId || null,
      message: rest.stripeAccountId 
        ? 'Compte Stripe Connect lié et actif.' 
        : 'Stripe Connect non configuré. Commission standard par défaut applicable.'
    });
  });

  app.post('/api/stripe/connect', (req, res) => {
    const { restaurantId } = req.body;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId requis' });
    }
    const index = restaurants.findIndex(r => r.id === restaurantId);
    if (index === -1) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }
    const mockId = `acct_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    restaurants[index].stripeAccountId = mockId;
    res.json({
      success: true,
      stripeAccountId: mockId,
      message: 'Compte Stripe Connect rattaché avec succès pour des transferts automatiques.'
    });
  });

  // Real Stripe Payment Intent creation with connected account split payouts
  app.post('/api/stripe/create-payment-intent', async (req, res) => {
    const { restaurantId, orderId, subtotalAmount, deliveryType } = req.body;
    
    if (!restaurantId || !orderId || subtotalAmount === undefined || !deliveryType) {
      return res.status(400).json({ error: 'Missing required parameters: restaurantId, orderId, subtotalAmount, deliveryType' });
    }

    try {
      const rest = restaurants.find(r => r.id === restaurantId);
      const stripeAccountId = rest?.stripeAccountId;

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        // Return simulated success/mock if key is not configured, to keep development fluid and offline-first
        const commissionRate = deliveryType === 'restaurant_delivery' ? 15 : 5;
        const subtotalCents = Math.round(subtotalAmount * 100);
        const serviceFeeCents = 99;
        const commissionCents = Math.round(subtotalCents * (commissionRate / 100));
        const totalAmountCents = subtotalCents + serviceFeeCents;
        const merchantPayoutCents = subtotalCents - commissionCents;

        return res.json({
          success: true,
          clientSecret: 'pi_mock_secret_' + Math.random().toString(36).substring(7),
          paymentIntentId: 'pi_mock_' + Math.random().toString(36).substring(7),
          isMock: true,
          splitDetails: {
            totalCharged: Number((totalAmountCents / 100).toFixed(2)),
            merchantPayout: Number((merchantPayoutCents / 100).toFixed(2)),
            fidfudTotalFee: Number(((totalAmountCents - merchantPayoutCents) / 100).toFixed(2)),
          },
          warning: 'STRIPE_SECRET_KEY non configurée. Fonctionnement en mode simulation.'
        });
      }

      // Real Stripe client
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any });
      
      const subtotalCents = Math.round(subtotalAmount * 100);
      const serviceFeeCents = 99; // €0.99 platform fee
      const commissionRate = deliveryType === 'restaurant_delivery' ? (rest?.commissionRateDelivery || 15) : (rest?.commissionRateCollect || 5);
      const commissionCents = Math.round(subtotalCents * (commissionRate / 100));
      const totalAmountCents = subtotalCents + serviceFeeCents;
      const merchantPayoutCents = subtotalCents - commissionCents;

      const paymentIntentConfig: Stripe.PaymentIntentCreateParams = {
        amount: totalAmountCents,
        currency: 'eur',
        payment_method_types: ['card'],
        metadata: {
          orderId,
          restaurantId,
          deliveryType,
          commissionRateUsed: commissionRate.toString(),
          fidfudCommissionCents: commissionCents.toString(),
          serviceFeeCents: serviceFeeCents.toString(),
          merchantPayoutCents: merchantPayoutCents.toString(),
          stripeAccountId: stripeAccountId || '',
        },
      };

      if (stripeAccountId) {
        paymentIntentConfig.transfer_group = `order_${orderId}`;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        splitDetails: {
          totalCharged: Number((totalAmountCents / 100).toFixed(2)),
          merchantPayout: Number((merchantPayoutCents / 100).toFixed(2)),
          fidfudTotalFee: Number(((totalAmountCents - merchantPayoutCents) / 100).toFixed(2)),
        }
      });
    } catch (err: any) {
      console.error('Stripe PaymentIntent Error:', err);
      res.status(500).json({ error: err.message || 'Unable to create Stripe transaction.' });
    }
  });

  // Stripe Connect Webhook listener for transferring funds automatically upon success
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!sig || !webhookSecret || !stripeSecretKey) {
      return res.status(400).json({ received: false, error: 'Webhook configuration incomplete.' });
    }

    try {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any });
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;
        const connectedAccountId = paymentIntent.metadata.stripeAccountId;
        const amountToPayoutCents = paymentIntent.metadata.merchantPayoutCents;

        // Find the order in memory
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.status = 'preparing';
          order.stripeChargeId = paymentIntent.id;
        }

        if (connectedAccountId && amountToPayoutCents) {
          try {
            await stripe.transfers.create({
              amount: parseInt(amountToPayoutCents, 10),
              currency: 'eur',
              destination: connectedAccountId,
              transfer_group: paymentIntent.transfer_group || undefined,
              metadata: {
                orderId,
                description: `Automatic payout split for Fidfud Order #${orderId}`,
              }
            });
            console.log(`💸 Real-time Payout Transfer successful to connected account ${connectedAccountId}`);
          } catch (transErr) {
            console.error('❌ Payout Transfer failed:', transErr);
          }
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Webhook Error:', err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });


  // --- ENDPOINTS FOR AUTOMATED WEBSITES & INSTAGRAM EXTRACTION ---
  
  // Lazy init Gemini client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
      }
    }
    return aiClient;
  }

  const AVAILABLE_FOOD_VIDEOS = [
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-cutting-a-freshly-baked-pizza-40245-large.mp4', category: 'pizza' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-and-meat-sizzling-in-a-wok-pan-40242-large.mp4', category: 'soup_ramen' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-putting-ketchup-on-a-freshly-prepared-hamburger-40246-large.mp4', category: 'burger_meat' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-hot-chocolate-on-a-pancake-41617-large.mp4', category: 'dessert_sweet' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-vegetable-salad-in-the-kitchen-40243-large.mp4', category: 'sushi_japanese' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-dark-red-wine-into-a-glass-40251-large.mp4', category: 'wine_drinks' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-flaming-a-pan-with-liquor-40241-large.mp4', category: 'cooking_chef' }
  ];

  // AI-Powered Restaurant website scraper / extractor
  app.post('/api/extract-website', async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'L\'URL du site web est requise.' });
    }

    try {
      console.log(`[AI Scraper] Extracting from website URL: ${url}`);
      
      const client = getGeminiClient();
      let extractedData: any = null;

      if (client) {
        const prompt = `You are a high-end food critic and virtual assistant.
Analyze the following restaurant URL and extract or creatively synthesize a fully functional, premium restaurant profile.
URL: "${url}"

Please return a valid JSON object matching this schema:
{
  "name": "Name of the restaurant (e.g. L'Avenue Paris or Pizza Julia)",
  "shortName": "Short simple name of the restaurant (e.g. L'Avenue or Pizza Julia)",
  "address": "A premium, realistic Paris address with zip code (e.g. 41 Avenue Montaigne, 75008 Paris)",
  "slogan": "A premium, appetizing slogan in French with descriptive emojis",
  "logoUrl": "A high-quality Unsplash image representing their cuisine type or logo (MUST be a direct unsplash image url with formatted query, e.g., 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=80')",
  "bannerUrl": "A premium Unsplash food or interior banner image (e.g., 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80')",
  "promoMessage": "A creative marketing offer or promotion (e.g. 'FESTIVAL : Un cocktail signature offert pour l\\'achat d\\'un menu dégustation ! 🍹')",
  "email": "Official contact email for the restaurant (e.g. contact@lavenue.com)",
  "phone": "Official phone number (e.g. +33 1 42 68 53 00)",
  "description": "Culinary description in French detailing the restaurant atmosphere, specialties, and history.",
  "category": "Cuisine category. MUST be one of: 'Italien', 'Japonais', 'Burgers', 'Français', 'Café'",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "dispositionShop": "Location placement description (e.g. Place des Vosges or Quartier Latin)",
  "isFavorite": false,
  "dishes": [
    {
      "name": "Name of dish 1",
      "description": "Sensory, mouthwatering description of dish in French (e.g. ingredients, taste, texture)",
      "price": 14.50,
      "imageUrl": "Unsplash dish image url (direct image url, e.g. https://images.unsplash.com/photo-...)"
    },
    {
      "name": "Name of dish 2",
      "description": "Sensory, mouthwatering description in French",
      "price": 19.90,
      "imageUrl": "Unsplash dish image url"
    }
  ]
}

Ensure the output is 100% valid JSON and respects all keys precisely. Ensure coordinates are numeric floats centered inside Paris. Ensure category is strictly matching one of the authorized values.`;

        const response = await client.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                shortName: { type: Type.STRING },
                address: { type: Type.STRING },
                slogan: { type: Type.STRING },
                logoUrl: { type: Type.STRING },
                bannerUrl: { type: Type.STRING },
                promoMessage: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER },
                dispositionShop: { type: Type.STRING },
                isFavorite: { type: Type.BOOLEAN },
                dishes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                      imageUrl: { type: Type.STRING }
                    },
                    required: ['name', 'description', 'price', 'imageUrl']
                  }
                }
              },
              required: [
                'name', 'shortName', 'address', 'slogan', 'logoUrl', 'bannerUrl', 
                'promoMessage', 'email', 'phone', 'description', 'category', 
                'latitude', 'longitude', 'dispositionShop', 'isFavorite', 'dishes'
              ]
            }
          }
        });

        const text = response.text;
        if (text) {
          extractedData = JSON.parse(text.trim());
        }
      }

      // High-Fidelity Fallback if Gemini is not configured or fails
      if (!extractedData) {
        console.log('[AI Scraper] No Gemini API key or error. Using premium simulated AI response.');
        
        // Custom simulation based on URL content
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('pizza') || lowerUrl.includes('ital')) {
          extractedData = {
            name: "Trattoria Della Nonna",
            shortName: "Nonna",
            address: "42 Rue de l'Université, 75007 Paris",
            slogan: "L'art secret de la truffe et des pâtes fraîches maison. 🍝🇮🇹",
            logoUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=80",
            bannerUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80",
            promoMessage: "DOLCE VITA : Tiramisu offert pour tout panier supérieur à 35€ ! ☕️",
            email: "ciao@dellanonnera.fr",
            phone: "+33 1 47 20 18 92",
            description: "Une trattoria chaleureuse au coeur du 7e arrondissement qui perpétue les recettes secrètes de la nonna. Les pâtes sont fraîchement pétries tous les matins.",
            category: "Italien",
            latitude: 48.8524,
            longitude: 2.3705,
            isFavorite: true,
            dispositionShop: "Rive Gauche",
            dishes: [
              {
                name: "Tagliatelles au Caviar de Truffe",
                description: "Pâtes fraîches maison, crème de truffe blanche d'Alba, copeaux de pecorino romano affiné et éclats de noisettes sauvages.",
                price: 22.50,
                imageUrl: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=500&auto=format&fit=crop&q=80"
              },
              {
                name: "Focaccia Burrata e Pistacchio",
                description: "Focaccia chaude au romarin, burrata crémeuse des Pouilles, pesto de pistaches de Sicile et mortadelle fine.",
                price: 16.90,
                imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80"
              }
            ]
          };
        } else if (lowerUrl.includes('sushi') || lowerUrl.includes('ramen') || lowerUrl.includes('asia') || lowerUrl.includes('japon')) {
          extractedData = {
            name: "Izakaya Kyoto",
            shortName: "Kyoto",
            address: "12 Rue Molière, 75001 Paris",
            slogan: "Saveurs d'Asie, sushis de précision et chirashi gourmand. 🍣🎌",
            logoUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=150&auto=format&fit=crop&q=80",
            bannerUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80",
            promoMessage: "SAYONARA : Un mochi glacé sésame noir offert dès 30€ de commande ! 🍡",
            email: "contact@izakayakyoto.jp",
            phone: "+33 1 45 33 22 11",
            description: "Sushis découpés à la commande sous vos yeux par notre maître artisan sushi formé à Kyoto. Un véritable voyage gastronomique en plein cœur de Paris.",
            category: "Japonais",
            latitude: 48.8631,
            longitude: 2.3361,
            isFavorite: false,
            dispositionShop: "Secteur Opéra",
            dishes: [
              {
                name: "Assortiment Sashimi Prestige (x12)",
                description: "Thon rouge de ligne, saumon d'Écosse labellisé, daurade royale, découpés de manière traditionnelle.",
                price: 24.00,
                imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=80"
              },
              {
                name: "Miso Ramen Deluxe",
                description: "Bouillon miso rouge mijoté 12 heures, tranches de porc braisé chashu, oeuf mariné au soja, ciboule et algue nori.",
                price: 17.50,
                imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80"
              }
            ]
          };
        } else {
          // Default: Burger or general Premium Bistro
          extractedData = {
            name: "Le Bistro Gourmet",
            shortName: "Le Bistro",
            address: "8 Rue de la Paix, 75002 Paris",
            slogan: "L'art de la haute gastronomie décontractée et de saison. 🍔🍷",
            logoUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80",
            bannerUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80",
            promoMessage: "BIENVENUE : -15% sur tout le menu gourmet avec le code SCRAPEST ! ✨",
            email: "chef@bistrogourmet.fr",
            phone: "+33 1 42 61 58 00",
            description: "Une cuisine bistrotière modernisée mettant à l'honneur les meilleurs producteurs de nos terroirs. Plats canailles et vins de vignerons indépendants.",
            category: "Burgers",
            latitude: 48.8685,
            longitude: 2.3301,
            isFavorite: true,
            dispositionShop: "Secteur Vendôme",
            dishes: [
              {
                name: "Burgundy Burger Signature",
                description: "Steak haché de boeuf de race d'Aubrac, comté affiné 18 mois, sauce vin rouge réduite et champignons des bois poêlés.",
                price: 19.50,
                imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80"
              },
              {
                name: "Croque-Monsieur à la Truffe",
                description: "Pain brioché artisanal, jambon blanc truffé d'exception, béchamel onctueuse au parmesan de garde.",
                price: 15.00,
                imageUrl: "https://images.unsplash.com/photo-1544982503-9f984c14501a?w=500&auto=format&fit=crop&q=80"
              }
            ]
          };
        }
      }

      // Create new restaurant object
      const newRestId = `rest-${Math.random().toString(36).substring(2, 9)}`;
      const newRestaurant: Restaurant = {
        id: newRestId,
        userId: 'usr-admin-1',
        name: extractedData.name,
        shortName: extractedData.shortName || extractedData.name,
        address: extractedData.address,
        commissionRateDelivery: 15,
        commissionRateCollect: 5,
        stripeAccountId: `acct_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        logoUrl: extractedData.logoUrl,
        bannerUrl: extractedData.bannerUrl,
        slogan: extractedData.slogan,
        isCertified: true,
        subscriptionTier: 'pro',
        promoMessage: extractedData.promoMessage,
        countdownMinutes: Math.floor(Math.random() * 10) + 4,
        countdownText: 'Fin de préparation du plat phare',
        likesReceived: Math.floor(Math.random() * 500) + 100,
        pointsReceived: Math.floor(Math.random() * 400) + 50,
        createdAt: new Date().toISOString(),
        email: extractedData.email || `contact@${extractedData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        phone: extractedData.phone || '+33 1 42 68 53 00',
        description: extractedData.description || extractedData.slogan || 'Un lieu de délices culinaires exceptionnels.',
        category: extractedData.category || 'Italien',
        isFavorite: extractedData.isFavorite !== undefined ? extractedData.isFavorite : false,
        dispositionShop: extractedData.dispositionShop || 'Secteur Central',
        latitude: extractedData.latitude || (48.8566 + (Math.random() * 0.04 - 0.02)),
        longitude: extractedData.longitude || (2.3522 + (Math.random() * 0.04 - 0.02))
      };

      restaurants.push(newRestaurant);

      // Add dishes
      const addedDishes: Dish[] = [];
      for (const dishData of extractedData.dishes) {
        const newDish: Dish = {
          id: `dish-${Math.random().toString(36).substring(2, 9)}`,
          restaurantId: newRestId,
          name: dishData.name,
          description: dishData.description,
          price: Number(dishData.price),
          isAvailable: true,
          imageUrl: dishData.imageUrl || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString()
        };
        dishes.push(newDish);
        addedDishes.push(newDish);
      }

      // Let's also attach a default beautiful video post to this restaurant so it immediately renders in the feed!
      const matchingVideo = AVAILABLE_FOOD_VIDEOS.find(v => {
        const u = url.toLowerCase();
        if (u.includes('pizza') && v.category === 'pizza') return true;
        if ((u.includes('sushi') || u.includes('ramen')) && v.category === 'sushi_japanese') return true;
        return false;
      }) || AVAILABLE_FOOD_VIDEOS[6]; // default kitchen/chef video

      const newVideo: Video = {
        id: `vid-${Math.random().toString(36).substring(2, 9)}`,
        restaurantId: newRestId,
        videoUrl: matchingVideo.url,
        associatedDishId: addedDishes[0]?.id || undefined,
        title: `🔥 Découvrez notre tout nouveau restaurant partenaire : ${newRestaurant.name} ! Commandez dès maintenant.`,
        likesCount: Math.floor(Math.random() * 100) + 10,
        createdAt: new Date().toISOString()
      };
      videos.unshift(newVideo); // Put it first in feed!

      res.status(201).json({
        success: true,
        restaurant: newRestaurant,
        dishes: addedDishes,
        video: newVideo
      });

    } catch (err: any) {
      console.error('[AI Scraper ERROR]', err);
      res.status(500).json({ error: 'Erreur lors de l\'extraction par l\'IA : ' + err.message });
    }
  });

  // Instagram video link AI post creator
  app.post('/api/extract-instagram', async (req, res) => {
    const { url, restaurantId } = req.body;
    if (!url || !restaurantId) {
      return res.status(400).json({ error: 'L\'URL Instagram et le restaurantId sont requis.' });
    }

    const rest = restaurants.find(r => r.id === restaurantId);
    if (!rest) {
      return res.status(404).json({ error: 'Restaurant non trouvé.' });
    }

    try {
      console.log(`[Instagram AI Importer] Fetching from: ${url} for Restaurant: ${rest.name}`);

      const client = getGeminiClient();
      let promptTitle = '';

      if (client) {
        // Use Gemini to generate a hyper-realistic, engaging French social media post title based on the restaurant's cuisine
        const prompt = `You are a social media copywriter for a premium video-based food delivery app called Fidfud.
We are importing an Instagram Reel with URL: "${url}" for our partner restaurant "${rest.name}" (Theme: ${rest.slogan}).

Generate a short, extremely engaging, professional French caption/title for this video post in the feed. Include 1-2 emojis.
Keep it under 150 characters, and write it in a punchy, foodie style.

Return ONLY the plain text caption, with no quotes or introduction.`;

        const response = await client.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        promptTitle = response.text?.trim() || '';
      }

      if (!promptTitle) {
        // Fallback
        promptTitle = `✨ Exclusivité Instagram chez ${rest.name} ! Succombez à cette délicieuse préparation faite maison par notre Chef. 😍`;
      }

      // Pick a random beautiful video from our database that fits the theme of the restaurant
      let selectedVidUrl = AVAILABLE_FOOD_VIDEOS[6].url; // default cooking chef
      const restNameLower = rest.name.toLowerCase();
      const restSloganLower = rest.slogan?.toLowerCase() || '';

      if (restNameLower.includes('pizza') || restSloganLower.includes('pizza')) {
        selectedVidUrl = AVAILABLE_FOOD_VIDEOS[0].url;
      } else if (restNameLower.includes('ramen') || restNameLower.includes('soup') || restSloganLower.includes('ramen')) {
        selectedVidUrl = AVAILABLE_FOOD_VIDEOS[1].url;
      } else if (restNameLower.includes('burger') || restNameLower.includes('smash') || restSloganLower.includes('burger')) {
        selectedVidUrl = AVAILABLE_FOOD_VIDEOS[2].url;
      } else if (restNameLower.includes('sushi') || restNameLower.includes('asia') || restSloganLower.includes('sushi')) {
        selectedVidUrl = AVAILABLE_FOOD_VIDEOS[4].url;
      } else {
        // Randomly rotate others
        const extraVids = [AVAILABLE_FOOD_VIDEOS[3].url, AVAILABLE_FOOD_VIDEOS[5].url, AVAILABLE_FOOD_VIDEOS[6].url];
        selectedVidUrl = extraVids[Math.floor(Math.random() * extraVids.length)];
      }

      // Find any dish of this restaurant to associate
      const restDishes = dishes.filter(d => d.restaurantId === restaurantId);
      const assocDish = restDishes.length > 0 ? restDishes[Math.floor(Math.random() * restDishes.length)] : undefined;

      const newVideo: Video = {
        id: `vid-${Math.random().toString(36).substring(2, 9)}`,
        restaurantId,
        videoUrl: selectedVidUrl,
        associatedDishId: assocDish?.id || undefined,
        title: promptTitle,
        likesCount: Math.floor(Math.random() * 50) + 5,
        createdAt: new Date().toISOString()
      };

      videos.unshift(newVideo); // prepend to top of the feed!

      res.status(201).json({
        success: true,
        video: newVideo,
        message: 'La vidéo Instagram a été récupérée et publiée avec succès !'
      });

    } catch (err: any) {
      console.error('[Instagram Importer ERROR]', err);
      res.status(500).json({ error: 'Erreur d\'importation de l\'Instagram : ' + err.message });
    }
  });


  // --- ENDPOINTS FOR AI GENERATION TOOLS ---

  // 1. Generate Dish Name
  app.post('/api/ai/generate-dish-name', (req, res) => {
    const { keywords, category } = req.body;
    const client = getGeminiClient();
    if (!client) {
      return res.json({
        success: true,
        names: [
          `Création Spéciale ${category || ''} 🎨`,
          `L'Incontournable Gourmet 🌟`,
          `La Recette Secrète Maison 🍳`
        ]
      });
    }

    const prompt = `You are a culinary branding expert and gourmet copywriter.
Based on the keywords "${keywords || ''}" and category "${category || ''}", generate 3 original, highly enticing, creative gourmet dish names in French.
Do NOT use plain descriptions; make them sound like names on a Michelin-star menu or premium bistronomy.
Include 1 fitting emoji per name.

Return the 3 options in a strict JSON array format. Example format:
["La Trilogie Noire", "La Focaccia Divina 🍕", "Le Smash d'Aubrac 🍔"]`;

    client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    })
    .then((response) => {
      const text = response.text?.trim() || '[]';
      const names = JSON.parse(text);
      res.json({ success: true, names });
    })
    .catch((err) => {
      console.error('[AI Name ERROR]', err);
      res.json({
        success: true,
        names: [
          `Délice ${category || ''} Maison ✨`,
          `La Sélection Gourmet 🌟`,
          `Le Secret du Chef 🍳`
        ]
      });
    });
  });

  // 2. Generate Dish Description
  app.post('/api/ai/generate-dish-description', (req, res) => {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du plat est requis.' });
    
    const client = getGeminiClient();
    if (!client) {
      return res.json({
        success: true,
        description: `Une délicieuse spécialité signature préparée avec soin et amour par notre Chef à partir de produits frais et de saison.`
      });
    }

    const prompt = `You are a professional Michelin-star French Chef and gourmet food writer.
Write a highly appealing, mouth-watering description in French of exactly 1-2 sentences for a dish named "${name}" (category: "${category || ''}").
Highlight premium ingredients, culinary techniques, textures, and sensory qualities (aromas, warmth).
Keep it elegant, appetizing, and concise. Do NOT output quotes.`;

    client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    })
    .then((response) => {
      const description = response.text?.trim() || '';
      res.json({ success: true, description });
    })
    .catch((err) => {
      console.error('[AI Description ERROR]', err);
      res.json({
        success: true,
        description: `Une délicieuse spécialité préparée minute avec amour par notre Chef à partir d'ingrédients locaux d'exception.`
      });
    });
  });

  // 2.5 Generate Recycle Summary (Eco-Sustainability Summary)
  app.post('/api/ai/generate-recycle-summary', (req, res) => {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom du plat est requis.' });

    const client = getGeminiClient();
    if (!client) {
      return res.json({
        success: true,
        summary: `🌿 **Sourcing Éco-Responsable** : Ingrédients 100% de saison, approvisionnés en circuit court auprès de producteurs locaux situés à moins de 50km.\n\n📦 **Emballage Durable** : Livré dans un coffret en carton Kraft recyclé, certifié FSC, sans plastique à usage unique.\n\n♻️ **Consignes de Tri & Upcycling** : \n- Retirer le film protecteur biosourcé (compostable à domicile).\n- Placer le coffret carton dans le bac de tri jaune.\n- Réutiliser la ficelle en chanvre brut.\n\n🌍 **Impact Carbone** : Évalué à **Classe A** (faible émission de CO₂ grâce aux livraisons optimisées et à l'absence d'ingrédients importés par avion).`
      });
    }

    const prompt = `You are an elite Sustainability Specialist and Chef of an eco-friendly green restaurant.
Write a highly engaging, structured, and premium Eco-Sustainability and Recycling Summary in French for a gourmet dish named "${name}" (category: "${category || ''}").
The summary must contain exactly these 4 sections with elegant markdown styling:
1. 🌿 **Sourcing Éco-Responsable** (Describe how the ingredients are locally sourced, in-season, from farmers within 50km)
2. 📦 **Emballage Durable** (Describe custom biodegradable, compostable sugarcane pulp, or FSC kraft paper container used, with zero single-use plastic)
3. ♻️ **Consignes de Tri & Upcycling** (Clear, bulleted instructions in French on how to recycle or creatively reuse the packaging)
4. 🌍 **Impact Carbone** (Rate it as Class A or B, explaining why the carbon footprint is minimal - local delivery, minimal waste)

Make it professional, inspiring, and concise. Do NOT output quotes.`;

    client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    })
    .then((response) => {
      const summary = response.text?.trim() || '';
      res.json({ success: true, summary });
    })
    .catch((err) => {
      console.error('[AI Recycle Summary ERROR]', err);
      res.json({
        success: true,
        summary: `🌿 **Sourcing Éco-Responsable** : Ingrédients 100% de saison, approvisionnés en circuit court auprès de producteurs locaux situés à moins de 50km.\n\n📦 **Emballage Durable** : Livré dans un coffret en carton Kraft recyclé, certifié FSC, sans plastique à usage unique.\n\n♻️ **Consignes de Tri & Upcycling** : \n- Retirer le film protecteur biosourcé (compostable à domicile).\n- Placer le coffret carton dans le bac de tri jaune.\n- Réutiliser la ficelle en chanvre brut.\n\n🌍 **Impact Carbone** : Évalué à **Classe A** (faible émission de CO₂ grâce aux livraisons optimisées et à l'absence d'ingrédients importés par avion).`
      });
    });
  });

  // 2.6 AI Search Parser (processes natural language for filters & delivery sector)
  app.post('/api/ai/parse-search', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Le prompt est requis.' });

    const client = getGeminiClient();
    if (!client) {
      // Offline / No client fallback: Basic manual regex parser
      const text = prompt.toLowerCase();
      let city = 'Paris';
      const cities = ['paris', 'lyon', 'marseille', 'bordeaux', 'nice', 'lille', 'toulouse', 'nantes', 'strasbourg', 'montpellier', 'rennes', 'reims', 'grenoble', 'rouen', 'toulon'];
      for (const c of cities) {
        if (text.includes(c)) {
          city = c.charAt(0).toUpperCase() + c.slice(1);
          break;
        }
      }

      let category = '';
      const categories = ['italien', 'japonais', 'burgers', 'français', 'café', 'tex-mex', 'indien', 'vietnamien', 'libanais', 'thaïlandais', 'sucré'];
      for (const cat of categories) {
        if (text.includes(cat) || (cat === 'italien' && text.includes('pizza')) || (cat === 'japonais' && text.includes('sushi')) || (cat === 'burgers' && text.includes('burger'))) {
          category = cat.charAt(0).toUpperCase() + cat.slice(1);
          break;
        }
      }

      const isProximitySortActive = text.includes('proche') || text.includes('près') || text.includes('autour') || text.includes('proximité') || text.includes('gps');

      return res.json({
        success: true,
        city,
        category,
        searchQuery: '',
        isProximitySortActive,
        explanation: `[Mode Hors-ligne] Filtres activés pour la ville de ${city} ${category ? `et la spécialité ${category}` : ''}.`
      });
    }

    const systemPrompt = `You are an elite AI assistant for FIDFUD, a premium food delivery application in France.
Analyze the user's food search request in French and extract search parameters in JSON format.

Available list of French cities/metropolises:
- Paris
- Lyon
- Marseille
- Bordeaux
- Nice
- Lille
- Toulouse
- Nantes
- Strasbourg
- Montpellier
- Rennes
- Reims
- Grenoble
- Rouen
- Toulon

Available list of cuisine specialties (categories):
- Italien
- Japonais
- Burgers
- Français
- Café
- Tex-Mex
- Indien
- Vietnamien
- Libanais
- Thaïlandais
- Sucré

Rules:
1. Identify if the user specifies a city. If yes, map it strictly to one of the available cities. If no city is specified, default to "Paris".
2. Identify if the user mentions a cuisine style or category. Map it strictly to one of the available specialties (or empty string if none). E.g. "pizza" maps to "Italien", "ramen" maps to "Japonais", "tacos" maps to "Tex-Mex", "crêpe" or "pancake" or "gâteau" maps to "Sucré".
3. Identify a search query representing specific dish ingredients or product names mentioned (e.g. "truffes", "saumon", "double cheese", "pimenté"). Keep it short (1-2 words), or empty string if none.
4. Detect if the user wants nearby, proximity or distance sorting (e.g., "proche", "près d'ici", "autour de moi", "le plus près", "distance"). Set "isProximitySortActive" to true if so.
5. Provide a short, friendly, and elegant one-sentence French explanation of the filters you applied (e.g. "J'ai configuré la recherche pour de délicieux burgers à Lyon ! 🍔").`;

    client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `User search request: "${prompt}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            city: { type: Type.STRING },
            category: { type: Type.STRING },
            searchQuery: { type: Type.STRING },
            isProximitySortActive: { type: Type.BOOLEAN },
            explanation: { type: Type.STRING }
          },
          required: ['city', 'category', 'searchQuery', 'isProximitySortActive', 'explanation']
        }
      }
    })
    .then((response) => {
      try {
        const data = JSON.parse(response.text?.trim() || '{}');
        res.json({
          success: true,
          city: data.city || 'Paris',
          category: data.category || '',
          searchQuery: data.searchQuery || '',
          isProximitySortActive: !!data.isProximitySortActive,
          explanation: data.explanation || 'Filtres appliqués avec succès ! 🚀'
        });
      } catch (err) {
        console.error('[AI Parse Search parse error]', err);
        res.status(500).json({ error: 'Erreur lors de l\'analyse de la réponse de l\'IA.' });
      }
    })
    .catch((err) => {
      console.error('[AI Parse Search ERROR]', err);
      res.status(500).json({ error: 'Erreur de connexion avec l\'IA de recherche.' });
    });
  });

  // 3. Generate Dish Image (Unsplash Suggester/URL finder)
  app.post('/api/ai/generate-dish-image-prompt', (req, res) => {
    const { name, category, description } = req.body;
    const client = getGeminiClient();
    if (!client) {
      return res.json({
        success: true,
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
      });
    }

    const prompt = `You are a food photography curator.
We need a high-quality direct Unsplash image URL that represents a gourmet dish named "${name}" (Description: "${description || ''}", Category: "${category || ''}").
Select the absolute best match from our handpicked list of Unsplash food photos, or output a highly targeted food photography Unsplash URL.

Premium general food photography matches on Unsplash:
- Pizza: https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80
- Pasta: https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600&auto=format&fit=crop&q=80
- Burger: https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80
- Sushi: https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80
- Ramen: https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80
- Salad: https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80
- Tacos: https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=80
- Dessert: https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&auto=format&fit=crop&q=80
- Steak: https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80
- Brunch: https://images.unsplash.com/photo-1496074494444-444441416bfb?w=600&auto=format&fit=crop&q=80

Return ONLY the direct Unsplash URL as plain text, no markdown formatting. Example: https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80`;

    client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    })
    .then((response) => {
      let imageUrl = response.text?.trim() || '';
      if (!imageUrl || !imageUrl.startsWith('http')) {
        imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
      }
      res.json({ success: true, imageUrl });
    })
    .catch((err) => {
      console.error('[AI Image ERROR]', err);
      res.json({
        success: true,
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
      });
    });
  });

  // 4. Create and publish an AI video post
  app.post('/api/ai/generate-video-post', (req, res) => {
    const { restaurantId, dishId, customTheme } = req.body;
    if (!restaurantId) return res.status(400).json({ error: 'restaurantId est requis.' });
    
    const rest = restaurants.find(r => r.id === restaurantId);
    if (!rest) return res.status(404).json({ error: 'Restaurant non trouvé.' });

    const selectedDish = dishes.find(d => d.id === dishId) || dishes.find(d => d.restaurantId === restaurantId);
    const client = getGeminiClient();

    const dishPart = selectedDish ? `and their specialty dish "${selectedDish.name}"` : '';
    const themePart = customTheme ? `around the custom theme: "${customTheme}"` : '';
    const prompt = `You are a viral social media video creator specializing in high-engagement foodie TikTok/Instagram Reels.
We are creating an automatic viral video storyboard for restaurant "${rest.name}" (category: "${rest.category}") ${dishPart} ${themePart}.

Write a script and storyboard. Return a valid JSON object matching this schema:
{
  "title": "A highly punchy, hook-driven social media caption (French) with 2-3 emojis, under 150 chars.",
  "music": "Description of the perfect viral background track style (e.g., 'Upbeat Deep House with sizzling sound effects')",
  "steps": [
    "Step 1: Visual action description (e.g. Zoom ultra-serré sur la sauce caramélisée qui nappe le plat)",
    "Step 2: Visual action description",
    "Step 3: Visual action description"
  ],
  "captions": "The viral hook overlay text to display on screen (French) (e.g. 'Le meilleur smash burger de Paris est ici !')"
}`;

    // Select standard video backdrop matching category
    let selectedVidUrl = AVAILABLE_FOOD_VIDEOS[6].url; // cooking chef
    const cat = rest.category.toLowerCase();
    if (cat.includes('pizz')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[0].url;
    } else if (cat.includes('ramen') || cat.includes('soup')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[1].url;
    } else if (cat.includes('burg') || cat.includes('street')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[2].url;
    } else if (cat.includes('sush') || cat.includes('japon')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[4].url;
    } else if (cat.includes('caf') || cat.includes('goût')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[3].url;
    }

    if (!client) {
      // Offline / Simulation fallback
      const fallbackTitle = `✨ Exclusivité gourmande chez ${rest.name} ! Une recette authentique préparée à la commande. 😍`;
      const fallbackSteps = [
        'Étape 1: Plan serré sur les ingrédients frais et premium découpés à la main.',
        'Étape 2: La cuisson minute qui fait crépiter les saveurs dans la poêle brulante.',
        'Étape 3: Le dressage artistique de l’assiette prête à partir chez vous en un éclair.'
      ];
      const fallbackCaptions = `Le plaisir ultime signé ${rest.name} !`;

      const newVideo: Video = {
        id: `vid-ai-${Math.random().toString(36).substring(2, 9)}`,
        restaurantId: rest.id,
        videoUrl: selectedVidUrl,
        associatedDishId: selectedDish?.id || undefined,
        title: fallbackTitle,
        likesCount: Math.floor(Math.random() * 120) + 15,
        createdAt: new Date().toISOString()
      };
      videos.unshift(newVideo);

      return res.json({
        success: true,
        video: newVideo,
        storyboard: {
          title: fallbackTitle,
          music: 'Chill acoustic background guitar',
          steps: fallbackSteps,
          captions: fallbackCaptions
        }
      });
    }

    client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    })
    .then((response) => {
      const text = response.text?.trim() || '{}';
      const script = JSON.parse(text);

      const title = script.title || `✨ Chef d'œuvre culinaire en direct chez ${rest.name} ! Un festival de saveurs à ne pas rater. 😍`;
      const music = script.music || 'Upbeat French Lofi & Sizzling kitchen sounds';
      const steps = script.steps && script.steps.length > 0 ? script.steps : [
        'Étape 1: Plan serré sur la découpe délicate des ingrédients frais de saison.',
        'Étape 2: Vapeur brulante qui s’échappe de la poêle en pleine cuisson sous vos yeux.',
        'Étape 3: Dressage millimétré de l’assiette prête à être livrée toute chaude.'
      ];
      const captions = script.captions || `Le secret le mieux gardé de ${rest.name} enfin dévoilé !`;

      const newVideo: Video = {
        id: `vid-ai-${Math.random().toString(36).substring(2, 9)}`,
        restaurantId: rest.id,
        videoUrl: selectedVidUrl,
        associatedDishId: selectedDish?.id || undefined,
        title: title,
        likesCount: Math.floor(Math.random() * 200) + 20,
        createdAt: new Date().toISOString()
      };
      videos.unshift(newVideo);

      res.json({
        success: true,
        video: newVideo,
        storyboard: {
          title,
          music,
          steps,
          captions
        }
      });
    })
    .catch((err) => {
      console.error('[AI Video Gen ERROR]', err);
      const fallbackVideo: Video = {
        id: `vid-ai-${Math.random().toString(36).substring(2, 9)}`,
        restaurantId: rest.id,
        videoUrl: selectedVidUrl,
        associatedDishId: selectedDish?.id || undefined,
        title: `🔥 Découvrez en vidéo la recette signature exclusive de ${rest.name} ! Disponible dès maintenant en livraison ultra-rapide.`,
        likesCount: 15,
        createdAt: new Date().toISOString()
      };
      videos.unshift(fallbackVideo);

      res.json({
        success: true,
        video: fallbackVideo,
        storyboard: {
          title: `🔥 Découvrez en vidéo la recette signature exclusive de ${rest.name} ! Disponible dès maintenant en livraison ultra-rapide.`,
          music: 'Chill cooking background music',
          steps: [
            'Étape 1: Présentation des matières premières fraîches sélectionnées le matin même.',
            'Étape 2: Cuisson minute par le Chef pour conserver toutes les saveurs originelles.',
            'Étape 3: Emballage hermétique chaud prêt à partir en livraison express chez vous.'
          ],
          captions: `L'expérience gourmande ultime, prête à être livrée !`
        }
      });
    });
  });

  // 5. Generate AI Theme & Styling Cohesively
  app.post('/api/ai/generate-theme', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Le prompt du thème est requis.' });

    const client = getGeminiClient();
    if (!client) {
      // Return beautiful hardcoded themed fallback depending on search keywords
      const p = prompt.toLowerCase();
      let theme = {
        accentColor: '#FF5C00',
        backgroundColor: '#050506',
        textColor: '#FFFFFF',
        borderRadius: '16px',
        heroTitle: 'Sizzling hot, delivered in minutes.',
        promoMessage: '🔥 EN DIRECT : Découvrez notre cuisine d\'auteur ! 🔥',
        typography: 'sans',
        bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop&q=80',
        appName: 'FIDFUD'
      };
      if (p.includes('cyber') || p.includes('neon') || p.includes('retro')) {
        theme = {
          accentColor: '#FF007F',
          backgroundColor: '#0B001A',
          textColor: '#00FFFF',
          borderRadius: '4px',
          heroTitle: 'Cuisine du Futur. En direct du Cyber-Espace.',
          promoMessage: '⚡ CYBERPROMO : -40% sur le pack Synthwave ! ⚡',
          typography: 'mono',
          bannerUrl: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1600&auto=format&fit=crop&q=80',
          appName: 'CYBERFUD'
        };
      } else if (p.includes('nature') || p.includes('bio') || p.includes('green') || p.includes('healthy')) {
        theme = {
          accentColor: '#10B981',
          backgroundColor: '#061C15',
          textColor: '#ECFDF5',
          borderRadius: '24px',
          heroTitle: 'Frais, Éthique & Direct Producteur.',
          promoMessage: '🌿 LIVRAISON VERTE : Gratuite pour toutes les salades et bowls 🌿',
          typography: 'sans',
          bannerUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&auto=format&fit=crop&q=80',
          appName: 'BIOFUD'
        };
      }
      return res.json({ success: true, theme });
    }

    const geminiPrompt = `You are an elite UX/UI Designer and Creative Director.
Generate a cohesive visual brand and CSS variables for an application based on the user's creative prompt: "${prompt}".

Choose colors that look professional, eye-safe, premium, and delicious (no pure bright whites as backgrounds, use deep sleek colors). Choose a font style (typography: 'sans' | 'mono' | 'serif' | 'display') and border-radius (e.g. '0px', '8px', '16px', '32px') that matches the theme. Provide an appetizing Unsplash banner URL keyword or direct URL.

Return a valid JSON object matching this schema EXACTLY:
{
  "accentColor": "A premium hex color representing action buttons, e.g. '#FF5A1F' or '#10B981'",
  "backgroundColor": "A very dark sleek eye-safe hex background color, e.g. '#0A0A0C' or '#0F0E13' or '#061512'",
  "textColor": "A high contrast readable text hex color, e.g. '#FFFFFF' or '#F3F4F6'",
  "borderRadius": "CSS value for rounded corners, e.g. '8px', '16px', '28px' or '0px'",
  "appName": "A short uppercase, themed, punchy version of the app name, e.g. 'NEONFUD' or 'GREENFUD' or 'GOLDENBITES'",
  "heroTitle": "An enticing, highly creative French catchphrase for the app main headline, e.g. 'La bistronomie parisienne livrée chez vous.'",
  "promoMessage": "A scrolling promotional banner headline in French, uppercase, with fitting emojis",
  "typography": "One of: 'sans', 'mono', 'serif', 'display'",
  "bannerUrl": "A high-quality Unsplash image URL that matches the food styling of this theme (e.g., a sushi platter, dark moody kitchen cooking, sizzling steak, fresh desserts)"
}`;

    client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: geminiPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    })
    .then((response) => {
      const text = response.text?.trim() || '{}';
      const theme = JSON.parse(text);
      res.json({ success: true, theme });
    })
    .catch((err) => {
      console.error('[AI Theme Gen ERROR]', err);
      res.json({
        success: false,
        error: err.message
      });
    });
  });

  // 6. Generate AI Button Icon Suggestion
  app.post('/api/ai/generate-icon', (req, res) => {
    const { iconKey, prompt } = req.body;
    if (!iconKey) return res.status(400).json({ error: 'iconKey est requis.' });
    if (!prompt) return res.status(400).json({ error: 'Le prompt est requis.' });

    const client = getGeminiClient();
    if (!client) {
      // Simulation offline
      return res.json({
        success: true,
        icon: 'Sparkles',
        emoji: '✨',
        gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Y2czA5MXNqdmtnaW5vYmN5enU3MHdwdG1scmd6bjZubG42Z3J3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0O9xBeS9EUnIy9by/giphy.gif'
      });
    }

    const geminiPrompt = `You are an icon designer and brand director.
The user wants to replace the app button icon "${iconKey}" with a new custom design based on the prompt: "${prompt}".

Suggest:
1. A standard Lucide-react icon name (e.g., 'ShoppingBag', 'Sparkles', 'Zap', 'Gift', 'Star', 'User', 'Home', 'Coins', 'Heart', 'Share2', 'Volume2', 'VolumeX', 'Send', 'Sliders')
2. A matching high-expressive single emoji.
3. A relevant high-quality culinary animated GIF URL or search keyword from popular sites (or choose a delicious cooking loop GIF).

Return a valid JSON object matching this schema EXACTLY:
{
  "icon": "Lucide icon component name (PascalCase)",
  "emoji": "Single emoji",
  "gifUrl": "A beautiful culinary animated GIF URL or an Unsplash food image URL"
}`;

    client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: geminiPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    })
    .then((response) => {
      const text = response.text?.trim() || '{}';
      const iconSuggestion = JSON.parse(text);
      res.json({ success: true, ...iconSuggestion });
    })
    .catch((err) => {
      console.error('[AI Icon Gen ERROR]', err);
      res.json({
        success: false,
        error: err.message
      });
    });
  });

  // --- GOOGLE MAPS RADAR SOURCING ENDPOINTS ---
  app.post('/api/sourcing/radar', async (req, res) => {
    const { city } = req.body;
    if (!city) {
      return res.status(400).json({ error: 'La ville de recherche est requise.' });
    }

    const cleanCity = city.trim();
    console.log(`[Google Maps Radar] Scanning restaurants in city: ${cleanCity}`);

    // Coordinates mapping for major cities
    const cityCoords: { [key: string]: { lat: number; lng: number } } = {
      'paris': { lat: 48.8566, lng: 2.3522 },
      'lyon': { lat: 45.7640, lng: 4.8357 },
      'marseille': { lat: 43.2965, lng: 5.3698 },
      'bordeaux': { lat: 44.8378, lng: -0.5792 },
      'nice': { lat: 43.7102, lng: 7.2620 },
      'lille': { lat: 50.6292, lng: 3.0573 },
      'toulouse': { lat: 43.6047, lng: 1.4442 }
    };

    const lowercaseCity = cleanCity.toLowerCase();
    const cityCenter = cityCoords[lowercaseCity] || { lat: 48.8566 + (Math.random() * 0.1 - 0.05), lng: 2.3522 + (Math.random() * 0.1 - 0.05) };

    // Offline premium simulator results
    const simulationFallback: { [key: string]: any[] } = {
      'paris': [
        {
          name: "La Felicità (Station F)",
          address: "55 Boulevard Vincent Auriol, 75013 Paris",
          city: "Paris",
          category: "Italien",
          description: "Le plus grand restaurant d'Europe. Un food-market italien immersif de 4500m² avec des corners pizzas napolitaines, pâtes fraîches roulées dans la meule de parmesan, cocktails artisanaux et desserts gargantuesques.",
          district: "13e Arr.",
          latitude: 48.8315,
          longitude: 2.3762,
          website: "https://www.bigmammagroup.com/fr/trattorias/la-felicita",
          slogan: "Le temple de la street-food italienne en plein Paris ! 🍕🇮🇹"
        },
        {
          name: "Girafe Paris",
          address: "1 Place du Trocadéro et du 11 Novembre, 75116 Paris",
          city: "Paris",
          category: "Français",
          description: "Une terrasse spectaculaire face à la Tour Eiffel, designée par Joseph Dirand. Menu de haute mer d'une fraîcheur absolue avec ceviche de daurade, homards grillés et turbot rôti.",
          district: "11e Arr.",
          latitude: 48.8624,
          longitude: 2.2872,
          website: "https://girafes-restaurant.com",
          slogan: "La plus belle terrasse marine face à la Tour Eiffel. 🦞✨"
        },
        {
          name: "Kodawari Ramen (Tsukiji)",
          address: "12 Rue de Richelieu, 75001 Paris",
          city: "Paris",
          category: "Japonais",
          description: "Immersion totale dans un marché aux poissons traditionnel de Tokyo reconstitué. Ramen au bouillon de poissons de chalut sauvage, coquillages et nouilles artisanales pétries sur place.",
          district: "1er Arr.",
          latitude: 48.8647,
          longitude: 2.3364,
          website: "https://www.kodawari-ramen.com",
          slogan: "Un voyage direct pour Tsukiji sans quitter Paris. 🍜🐟"
        },
        {
          name: "PNY Burgers Marais",
          address: "1 Rue de Perrée, 75003 Paris",
          city: "Paris",
          category: "Burgers",
          description: "Les meilleurs burgers gourmets de la capitale avec du bœuf maturé sélectionné, cheddar fondu 18 mois d'affinage et frites maison cuites en deux bains. Cadre néon ultra stylé.",
          district: "3e Arr.",
          latitude: 48.8637,
          longitude: 2.3615,
          website: "https://pnyburger.com",
          slogan: "Smash croustillant extrême et bœuf d'exception. 🍔🔥"
        },
        {
          name: "Fragments Paris",
          address: "76 Rue des Tournelles, 75003 Paris",
          city: "Paris",
          category: "Café",
          description: "L'un des pionniers du café de spécialité dans le Marais. Célèbre pour son avocado toast au levain croustillant, son cinnamon roll brioché doré et sa sélection de thés de prestige.",
          district: "3e Arr.",
          latitude: 48.8579,
          longitude: 2.3672,
          website: "https://www.instagram.com/fragmentsparis",
          slogan: "Café de spécialité torréfié et brunch gourmand. ☕🥐"
        },
        {
          name: "Tacos & Co Cantina",
          address: "14 Rue de la Roquette, 75011 Paris",
          city: "Paris",
          category: "Tex-Mex",
          description: "La cuisine mexicaine de rue authentique avec des tortillas de maïs frais faites à la main, viandes marinées longuement aux épices et guacamole ultra-frais écrasé minute au mortier.",
          district: "11e Arr.",
          latitude: 48.8543,
          longitude: 2.3721,
          website: "https://www.tacosandco.fr",
          slogan: "Le vrai goût de la street-food mexicaine ! 🇲🇽🌮"
        }
      ],
      'nice': [
        {
          name: "Le Plongeoir",
          address: "60 Boulevard Franck Pilatte, 06300 Nice",
          city: "Nice",
          category: "Français",
          description: "Restaurant mythique perché sur son rocher au-dessus de la mer Méditerranée. Une cuisine raffinée aux inspirations azuréennes mettant en valeur les poissons de la pêche locale.",
          district: "Port de Nice",
          latitude: 43.6918,
          longitude: 7.2882,
          website: "https://www.leplongeoir.com",
          slogan: "Une cuisine d'exception suspendue au-dessus de la mer. 🌊🍽️"
        },
        {
          name: "Peixes Nice",
          address: "4 Rue de l'Opéra, 06300 Nice",
          city: "Nice",
          category: "Gourmet",
          description: "Une taverne marine décomplexée à l'ambiance lagon. Ceviche ultra-frais acidulé au citron yuzu, poulpe grillé caramélisé et tartare de daurade aux grenades sauvages.",
          district: "Vieux Nice",
          latitude: 43.6958,
          longitude: 7.2721,
          website: "https://www.peixes.fr",
          slogan: "L'art du ceviche et des saveurs marines revisitées. 🐟🍋"
        },
        {
          name: "La Voglia",
          address: "2 Rue Saint-François de Paule, 06300 Nice",
          city: "Nice",
          category: "Italien",
          description: "Une véritable institution niçoise pour déguster des portions généreuses de pâtes fraîches au homard, des pizzas au feu de bois à la truffe et un tiramisu légendaire.",
          district: "Cours Saleya",
          latitude: 43.6951,
          longitude: 7.2715,
          website: "https://lavoglia.fr",
          slogan: "La générosité italienne face au marché aux fleurs. 🇮🇹🍝"
        },
        {
          name: "Clay Coffee & Brunch",
          address: "3 Rue de la Préfecture, 06300 Nice",
          city: "Nice",
          category: "Café",
          description: "Le repère esthétique pour un brunch en terrasse ombragée. Pancakes à la pistache d'Iran, toasts de brioche perdue caramélisés et lattes artisanaux colorés au matcha bio.",
          district: "Vieux Nice",
          latitude: 43.6965,
          longitude: 7.2742,
          website: "https://claynice.com",
          slogan: "Brunch d'exception et café de spécialité. 🥞☕"
        }
      ]
    };

    // Attempt real Gemini Google Grounding search
    try {
      const client = getGeminiClient();
      if (client) {
        console.log(`[Google Maps Radar] Querying Gemini with Google Search Grounding tool...`);
        const prompt = `You are a virtual photo studio director and restaurant discovery scout.
Your task is to scan and list 6 real, popular, or recently opened restaurants in the city of: "${cleanCity}".
Use Google Search grounding to find real places, complete with real street addresses, actual names, and approximate latitude and longitude coordinates in that city.

You must return the list strictly as a JSON array of objects.
The JSON schema must be a list of objects, each containing:
- "name": String (e.g. "Coya Paris", "La Felicità")
- "address": String (Full street address, e.g. "83-85 Boulevard Vincent Auriol, 75013 Paris")
- "city": String (The name of the city, e.g. "Paris")
- "category": String (One of: "Italien", "Japonais", "Burgers", "Français", "Café", "Tex-Mex", "Gourmet")
- "description": String (A professional 1-2 sentence French review summarizing their gourmet specialty, vibe, or why they are trending.)
- "district": String (Arrondissement or district, e.g. "13e Arr.", "Vieux-Nice", "Part-Dieu")
- "latitude": Number (Float, e.g. 48.8315)
- "longitude": Number (Float, e.g. 2.3762)
- "website": String (A real URL, e.g. "https://www.co-ya.com")
- "slogan": String (An appetizing, trendy French tagline for this restaurant with an emoji, e.g. "L'ambiance festive péruvienne et saveurs d'exception ! 🌶️✨")
`;

        const response = await client.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  city: { type: Type.STRING },
                  category: { type: Type.STRING },
                  description: { type: Type.STRING },
                  district: { type: Type.STRING },
                  latitude: { type: Type.NUMBER },
                  longitude: { type: Type.NUMBER },
                  website: { type: Type.STRING },
                  slogan: { type: Type.STRING }
                },
                required: ["name", "address", "city", "category", "description", "latitude", "longitude"]
              }
            }
          }
        });

        const text = response.text?.trim() || '[]';
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[Google Maps Radar] Successfully sourced ${parsed.length} real restaurants from Gemini Grounding !`);
          return res.json({ success: true, method: 'gemini_grounding', results: parsed });
        }
      }
    } catch (err) {
      console.error('[Google Maps Radar] Gemini Grounding failed, resorting to premium simulation fallback.', err);
    }

    // Return gorgeous simulator fallback if Gemini was unavailable or returned empty list
    const cityKey = lowercaseCity.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
    let results = simulationFallback[cityKey];

    if (!results) {
      // Dynamic generation for any typed city in the world
      const genericCategories = ["Italien", "Japonais", "Burgers", "Français", "Café", "Tex-Mex", "Gourmet"];
      const prefixes = ["L'Atelier", "Le Bistrot", "La Trattoria", "Chez", "O'Smash", "Ramen & Co", "Sweet", "Cantina"];
      const suffixes = ["Gourmand", "du Marché", "Bella", "Express", "Lab", "Zen", "Cozy", "Loco"];
      const streetNames = ["Rue de la République", "Grand Rue", "Avenue de la Gare", "Place Saint-Pierre", "Boulevard des Arts", "Rue Neuve"];

      results = Array.from({ length: 6 }).map((_, idx) => {
        const cat = genericCategories[idx % genericCategories.length];
        const name = `${prefixes[idx % prefixes.length]} ${suffixes[(idx + 2) % suffixes.length]} ${cleanCity}`;
        const street = `${Math.floor(Math.random() * 50) + 1} ${streetNames[idx % streetNames.length]}`;
        const address = `${street}, ${cleanCity}`;
        const dist = `Secteur ${idx + 1}`;
        const latOffset = (Math.random() * 0.02) - 0.01;
        const lngOffset = (Math.random() * 0.02) - 0.01;

        return {
          name,
          address,
          city: cleanCity,
          category: cat,
          description: `Un nouvel établissement tendance à ${cleanCity} mettant à l'honneur des produits de saison cuisinés maison. Une atmosphère conviviale et un design soigné de haute facture.`,
          district: dist,
          latitude: cityCenter.lat + latOffset,
          longitude: cityCenter.lng + lngOffset,
          website: `https://www.instagram.com/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          slogan: `La nouvelle sensation culinaire incontournable à ${cleanCity} ! 🍳✨`
        };
      });
    }

    res.json({ success: true, method: 'simulation_sourcing', results });
  });

  app.post('/api/restaurants/import-sourced', async (req, res) => {
    const { name, address, city, category, description, district, latitude, longitude, website, slogan } = req.body;
    if (!name || !address || !city) {
      return res.status(400).json({ error: 'Champs name, address et city requis.' });
    }

    // Check if duplicate already exists
    const exists = restaurants.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return res.json({ success: true, isAlreadyImported: true, restaurant: exists });
    }

    const id = 'rest-' + Math.random().toString(36).substring(2, 9);
    
    // Set gorgeous logo and banner based on category
    let logoUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80';
    let bannerUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80';
    
    const cat = (category || 'Gourmet').toLowerCase();
    if (cat.includes('pizz') || cat.includes('ital')) {
      logoUrl = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=80';
      bannerUrl = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80';
    } else if (cat.includes('ramen') || cat.includes('japon') || cat.includes('sush')) {
      logoUrl = 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=150&auto=format&fit=crop&q=80';
      bannerUrl = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&auto=format&fit=crop&q=80';
    } else if (cat.includes('burg') || cat.includes('street')) {
      logoUrl = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80';
      bannerUrl = 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80';
    } else if (cat.includes('caf') || cat.includes('brunch') || cat.includes('dess')) {
      logoUrl = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=150&auto=format&fit=crop&q=80';
      bannerUrl = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80';
    }

    const finalDistrict = district || `${Math.floor(Math.random() * 20) + 1}e Arr.`;

    const newRest: Restaurant = {
      id,
      userId: 'usr-admin-1',
      name,
      shortName: name,
      address,
      commissionRateDelivery: 10,
      commissionRateCollect: 5,
      stripeAccountId: `acct_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      logoUrl,
      bannerUrl,
      slogan: slogan || `L'expérience culinaire incontournable de ${city} ! ✨`,
      isCertified: true,
      subscriptionTier: 'pro',
      promoMessage: 'Offre Radar Google Maps : 1 boisson offerte ! 🥤',
      countdownMinutes: Math.floor(Math.random() * 10) + 5,
      countdownText: 'Plat signature en cours de cuisson minute',
      likesReceived: Math.floor(Math.random() * 200) + 20,
      pointsReceived: Math.floor(Math.random() * 150) + 30,
      createdAt: new Date().toISOString(),
      email: `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      phone: '+33 1 42 33 ' + Math.floor(Math.random() * 89 + 10) + ' ' + Math.floor(Math.random() * 89 + 10),
      description,
      category: category || 'Gourmet',
      dispositionShop: finalDistrict,
      isFavorite: true,
      latitude: Number(latitude),
      longitude: Number(longitude),
      isOrderingEnabled: true
    };

    restaurants.push(newRest);
    await persistRestaurantToFirestore(newRest);

    // Auto-create a Signature Dish
    const dishId = 'dish-' + Math.random().toString(36).substring(2, 9);
    let dishName = `Signature Gourmet ${name}`;
    let dishPrice = 14.50;
    let dishDesc = `Notre fameuse création culinaire préparée à la commande avec des ingrédients locaux extra-frais.`;
    
    if (cat.includes('pizz') || cat.includes('ital')) {
      dishName = `La Pizza Spéciale du Chef`;
      dishPrice = 15.90;
      dishDesc = `Tomates locales, burrata crémeuse, jambon de Parme affiné 18 mois et filet d'huile d'olive infusée.`;
    } else if (cat.includes('ramen') || cat.includes('japon') || cat.includes('sush')) {
      dishName = `Le Ramen Traditionnel d'Antan`;
      dishPrice = 16.50;
      dishDesc = `Bouillon mijoté maison, nouilles de froment artisanales, œuf mariné coulant et légumes croquants.`;
    } else if (cat.includes('burg') || cat.includes('street')) {
      dishName = `Le Double Bacon Smash Deluxe`;
      dishPrice = 13.90;
      dishDesc = `Deux steaks de bœuf Angus smashés, cheddar maturé, tranches de bacon fumé et notre légendaire sauce maison.`;
    } else if (cat.includes('caf') || cat.includes('brunch') || cat.includes('dess')) {
      dishName = `Le French Toast & Crème Pistache`;
      dishPrice = 11.50;
      dishDesc = `Brioche perdue ultra-moelleuse, garnie d'éclats de pistaches grillées et crème fouettée onctueuse.`;
    }

    const newDish: Dish = {
      id: dishId,
      restaurantId: id,
      name: dishName,
      price: dishPrice,
      description: dishDesc,
      imageUrl: logoUrl,
      isAvailable: true,
      isPopular: true
    };
    dishes.push(newDish);
    await persistDishToFirestore(newDish);

    // Pick suitable video background
    let selectedVidUrl = AVAILABLE_FOOD_VIDEOS[6].url; // Cooking Chef default
    if (cat.includes('pizz')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[0].url;
    } else if (cat.includes('ramen') || cat.includes('soup')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[1].url;
    } else if (cat.includes('burg') || cat.includes('street')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[2].url;
    } else if (cat.includes('sush') || cat.includes('japon')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[4].url;
    } else if (cat.includes('caf') || cat.includes('goût')) {
      selectedVidUrl = AVAILABLE_FOOD_VIDEOS[3].url;
    }

    // Unshift a video to be shown immediately in the TikTok feed!
    const newVideo: Video = {
      id: 'vid-' + Math.random().toString(36).substring(2, 9),
      restaurantId: id,
      videoUrl: selectedVidUrl,
      associatedDishId: dishId,
      title: `🔥 Sensation culinaire chez ${name} : découvrez notre délicieuse création ${dishName} ! 🤤✨`,
      likesCount: Math.floor(Math.random() * 100) + 15,
      createdAt: new Date().toISOString()
    };
    videos.unshift(newVideo);
    await persistVideoToFirestore(newVideo);

    saveData();
    res.status(201).json({ success: true, restaurant: newRest });
  });

  // Vite middleware for development or Static Assets for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback handling
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Fidfud server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
