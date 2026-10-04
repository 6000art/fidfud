// Offline Data Synchronization & Service Worker Controller backed by IndexedDB and LocalStorage fallback
import { Restaurant, Dish, Video, Order, CartItem } from '../types';
import { 
  saveOfflineItem, 
  getOfflineItem, 
  clearIndexedDBStorage, 
  saveMediaBlob, 
  getMediaBlob, 
  deleteMediaBlob,
  getIndexedDBStorageEstimate
} from './idbStorage';

const STORAGE_KEYS = {
  VIDEOS: 'fidfud_offline_videos_v2',
  RESTAURANTS: 'fidfud_offline_restaurants_v2',
  DISHES: 'fidfud_offline_dishes_v2',
  CART: 'fidfud_offline_cart_v2',
  PENDING_ORDERS: 'fidfud_pending_offline_orders_v2',
  PENDING_LIKES: 'fidfud_pending_offline_likes_v2',
  PENDING_COMMENTS: 'fidfud_pending_offline_comments_v2',
  DOWNLOADED_VIDEOS: 'fidfud_downloaded_videos_v3',
  DOWNLOADED_MENUS: 'fidfud_downloaded_menus_v3',
  LAST_SYNC: 'fidfud_last_sync_timestamp'
};

export interface DownloadedMenu {
  restaurant: Restaurant;
  dishes: Dish[];
  downloadedAt: string;
}

class OfflineCacheService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private downloadListeners: Set<() => void> = new Set();

  // In-memory mirrors for high performance
  private inMemoryVideos: Video[] = [];
  private inMemoryRestaurants: Restaurant[] = [];
  private inMemoryDishes: Dish[] = [];
  private inMemoryDownloadedVideos: Video[] = [];
  private inMemoryDownloadedMenus: DownloadedMenu[] = [];
  private isHydrated: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineState.bind(this));
      window.addEventListener('offline', this.handleOfflineState.bind(this));
      this.registerServiceWorker();
      this.hydrateFromIndexedDB();
    }
  }

  private async hydrateFromIndexedDB(): Promise<void> {
    try {
      const [vids, rests, dishes, downVids, downMenus] = await Promise.all([
        getOfflineItem<Video[]>(STORAGE_KEYS.VIDEOS),
        getOfflineItem<Restaurant[]>(STORAGE_KEYS.RESTAURANTS),
        getOfflineItem<Dish[]>(STORAGE_KEYS.DISHES),
        getOfflineItem<Video[]>(STORAGE_KEYS.DOWNLOADED_VIDEOS),
        getOfflineItem<DownloadedMenu[]>(STORAGE_KEYS.DOWNLOADED_MENUS)
      ]);

      if (vids && Array.isArray(vids)) this.inMemoryVideos = vids;
      if (rests && Array.isArray(rests)) this.inMemoryRestaurants = rests;
      if (dishes && Array.isArray(dishes)) this.inMemoryDishes = dishes;
      if (downVids && Array.isArray(downVids)) this.inMemoryDownloadedVideos = downVids;
      if (downMenus && Array.isArray(downMenus)) this.inMemoryDownloadedMenus = downMenus;

      // Also populate from localStorage if IndexedDB is empty on first migration
      if (this.inMemoryVideos.length === 0) {
        try {
          const lsVids = localStorage.getItem(STORAGE_KEYS.VIDEOS);
          if (lsVids) this.inMemoryVideos = JSON.parse(lsVids);
        } catch (_) {}
      }
      if (this.inMemoryRestaurants.length === 0) {
        try {
          const lsRests = localStorage.getItem(STORAGE_KEYS.RESTAURANTS);
          if (lsRests) this.inMemoryRestaurants = JSON.parse(lsRests);
        } catch (_) {}
      }

      this.isHydrated = true;
      this.notifyDownloadListeners();
    } catch (e) {
      console.warn('[OfflineCacheService] Hydration notice:', e);
      this.isHydrated = true;
    }
  }

  // Service worker registration
  public registerServiceWorker(): void {
    const isProd = Boolean(import.meta.env?.PROD);
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && isProd) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('⚡ [PWA Sync] Service Worker enregistré avec succès:', reg.scope);
          })
          .catch((err) => {
            console.warn('⚡ [PWA Sync] Erreur enregistrement Service Worker:', err);
          });
      });
    }
  }

  private handleOnlineState() {
    this.isOnline = true;
    this.notifyListeners(true);
    this.syncPendingData();
  }

  private handleOfflineState() {
    this.isOnline = false;
    this.notifyListeners(false);
  }

  public subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isOnline);
    return () => this.listeners.delete(listener);
  }

  public subscribeDownloads(listener: () => void): () => void {
    this.downloadListeners.add(listener);
    listener();
    return () => this.downloadListeners.delete(listener);
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach((l) => l(isOnline));
  }

  private notifyDownloadListeners() {
    this.downloadListeners.forEach((l) => l());
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  // --- MANUAL USER DOWNLOADS FOR OFFLINE MODE ---
  public getDownloadedVideos(): Video[] {
    return this.inMemoryDownloadedVideos;
  }

  public isVideoDownloaded(videoId: string): boolean {
    return this.inMemoryDownloadedVideos.some((v) => v.id === videoId);
  }

  public async downloadVideo(video: Video): Promise<boolean> {
    try {
      if (!this.inMemoryDownloadedVideos.some((v) => v.id === video.id)) {
        this.inMemoryDownloadedVideos.unshift(video);
        await saveOfflineItem(STORAGE_KEYS.DOWNLOADED_VIDEOS, this.inMemoryDownloadedVideos);
        
        // Also add to general videos if missing
        if (!this.inMemoryVideos.some((v) => v.id === video.id)) {
          this.inMemoryVideos.unshift(video);
          await this.saveVideos(this.inMemoryVideos);
        }
        this.notifyDownloadListeners();
      }
      return true;
    } catch (e) {
      console.warn('Erreur lors du téléchargement de la vidéo:', e);
      return false;
    }
  }

  public async removeDownloadedVideo(videoId: string): Promise<void> {
    try {
      this.inMemoryDownloadedVideos = this.inMemoryDownloadedVideos.filter((v) => v.id !== videoId);
      await saveOfflineItem(STORAGE_KEYS.DOWNLOADED_VIDEOS, this.inMemoryDownloadedVideos);
      await deleteMediaBlob(`video_${videoId}`);
      this.notifyDownloadListeners();
    } catch (e) {
      console.warn('Erreur lors de la suppression de la vidéo téléchargée:', e);
    }
  }

  public async toggleVideoDownload(video: Video): Promise<boolean> {
    if (this.isVideoDownloaded(video.id)) {
      await this.removeDownloadedVideo(video.id);
      return false;
    } else {
      await this.downloadVideo(video);
      return true;
    }
  }

  public getDownloadedMenus(): DownloadedMenu[] {
    return this.inMemoryDownloadedMenus;
  }

  public isMenuDownloaded(restaurantId: string): boolean {
    return this.inMemoryDownloadedMenus.some((m) => m.restaurant.id === restaurantId);
  }

  public async downloadMenu(restaurant: Restaurant, dishes: Dish[]): Promise<boolean> {
    try {
      const existingIdx = this.inMemoryDownloadedMenus.findIndex((m) => m.restaurant.id === restaurant.id);
      const filteredDishes = dishes.filter((d) => d.restaurantId === restaurant.id || !d.restaurantId);

      const entry: DownloadedMenu = {
        restaurant,
        dishes: filteredDishes,
        downloadedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        this.inMemoryDownloadedMenus[existingIdx] = entry;
      } else {
        this.inMemoryDownloadedMenus.unshift(entry);
      }

      await saveOfflineItem(STORAGE_KEYS.DOWNLOADED_MENUS, this.inMemoryDownloadedMenus);

      // Also ensure restaurant & dishes are saved in general cache
      if (!this.inMemoryRestaurants.some((r) => r.id === restaurant.id)) {
        this.inMemoryRestaurants.unshift(restaurant);
        await this.saveRestaurants(this.inMemoryRestaurants);
      }
      const newDishes = filteredDishes.filter((d) => !this.inMemoryDishes.some((cd) => cd.id === d.id));
      if (newDishes.length > 0) {
        this.inMemoryDishes = [...newDishes, ...this.inMemoryDishes];
        await this.saveDishes(this.inMemoryDishes);
      }

      this.notifyDownloadListeners();
      return true;
    } catch (e) {
      console.warn('Erreur lors du téléchargement du menu:', e);
      return false;
    }
  }

  public async removeDownloadedMenu(restaurantId: string): Promise<void> {
    try {
      this.inMemoryDownloadedMenus = this.inMemoryDownloadedMenus.filter((m) => m.restaurant.id !== restaurantId);
      await saveOfflineItem(STORAGE_KEYS.DOWNLOADED_MENUS, this.inMemoryDownloadedMenus);
      this.notifyDownloadListeners();
    } catch (e) {
      console.warn('Erreur lors de la suppression du menu téléchargé:', e);
    }
  }

  public async toggleMenuDownload(restaurant: Restaurant, dishes: Dish[]): Promise<boolean> {
    if (this.isMenuDownloaded(restaurant.id)) {
      await this.removeDownloadedMenu(restaurant.id);
      return false;
    } else {
      await this.downloadMenu(restaurant, dishes);
      return true;
    }
  }

  public async getStorageUsageEstimate(): Promise<{ usedBytes: number; usedMB: string; videoCount: number; menuCount: number }> {
    try {
      const idbEstimate = await getIndexedDBStorageEstimate();
      let total = idbEstimate.totalBytes;
      
      // Add any leftover localStorage fidfud keys
      if (typeof localStorage !== 'undefined') {
        for (const key in localStorage) {
          if (key.startsWith('fidfud_')) {
            total += (localStorage.getItem(key) || '').length * 2;
          }
        }
      }
      const usedMB = (total / (1024 * 1024)).toFixed(2);
      return { 
        usedBytes: total, 
        usedMB, 
        videoCount: this.inMemoryDownloadedVideos.length, 
        menuCount: this.inMemoryDownloadedMenus.length 
      };
    } catch (e) {
      return { usedBytes: 0, usedMB: '0.00', videoCount: 0, menuCount: 0 };
    }
  }

  public async clearAllOfflineDownloads(): Promise<void> {
    try {
      this.inMemoryDownloadedVideos = [];
      this.inMemoryDownloadedMenus = [];
      await saveOfflineItem(STORAGE_KEYS.DOWNLOADED_VIDEOS, []);
      await saveOfflineItem(STORAGE_KEYS.DOWNLOADED_MENUS, []);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.DOWNLOADED_VIDEOS);
        localStorage.removeItem(STORAGE_KEYS.DOWNLOADED_MENUS);
      }
      this.notifyDownloadListeners();
    } catch (e) {}
  }

  // --- SAVE DATA LOCALLY IN INDEXEDDB (NO QUOTA EXCEEDED ERROR) ---
  public async saveVideos(videos: Video[]): Promise<void> {
    try {
      if (videos) {
        this.inMemoryVideos = videos;
        await saveOfflineItem(STORAGE_KEYS.VIDEOS, videos);
        await saveOfflineItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      }
    } catch (e) {
      console.warn('[OfflineCacheService] Failed to cache videos to IndexedDB', e);
    }
  }

  public getCachedVideos(): Video[] {
    return this.inMemoryVideos;
  }

  public async saveRestaurants(restaurants: Restaurant[]): Promise<void> {
    try {
      if (restaurants) {
        this.inMemoryRestaurants = restaurants;
        await saveOfflineItem(STORAGE_KEYS.RESTAURANTS, restaurants);
      }
    } catch (e) {
      console.warn('[OfflineCacheService] Failed to cache restaurants to IndexedDB', e);
    }
  }

  public getCachedRestaurants(): Restaurant[] {
    return this.inMemoryRestaurants;
  }

  public async saveDishes(dishes: Dish[]): Promise<void> {
    try {
      if (dishes) {
        this.inMemoryDishes = dishes;
        await saveOfflineItem(STORAGE_KEYS.DISHES, dishes);
      }
    } catch (e) {
      console.warn('[OfflineCacheService] Failed to cache dishes to IndexedDB', e);
    }
  }

  public getCachedDishes(): Dish[] {
    return this.inMemoryDishes;
  }

  public getLastSyncTime(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    }
    return null;
  }

  // --- OFFLINE QUEUE & AUTO-SYNC WHEN NETWORK RECOVERY ---
  public queuePendingOrder(orderData: any): void {
    try {
      const existing = this.getPendingOrders();
      existing.push({ ...orderData, queuedAt: new Date().toISOString() });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.PENDING_ORDERS, JSON.stringify(existing));
      }
      saveOfflineItem(STORAGE_KEYS.PENDING_ORDERS, existing);
    } catch (e) {
      console.error('Erreur sauvegarde commande hors-ligne', e);
    }
  }

  public getPendingOrders(): any[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEYS.PENDING_ORDERS);
        return data ? JSON.parse(data) : [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  public async syncPendingData(): Promise<{ syncedOrders: number; errors: number }> {
    if (!this.isOnline) return { syncedOrders: 0, errors: 0 };

    let syncedOrders = 0;
    let errors = 0;

    const pendingOrders = this.getPendingOrders();
    if (pendingOrders.length > 0) {
      const remaining: any[] = [];
      for (const ord of pendingOrders) {
        try {
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ord)
          });
          if (res.ok) {
            syncedOrders++;
          } else {
            remaining.push(ord);
            errors++;
          }
        } catch (err) {
          remaining.push(ord);
          errors++;
        }
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.PENDING_ORDERS, JSON.stringify(remaining));
      }
      await saveOfflineItem(STORAGE_KEYS.PENDING_ORDERS, remaining);
    }

    return { syncedOrders, errors };
  }

  // --- ABSOLUTE PURGE OF DELETED & UNUSED STORAGE ---
  public async purgeVideoFromLocalCache(videoId: string): Promise<void> {
    try {
      this.inMemoryVideos = this.inMemoryVideos.filter((v) => v.id !== videoId);
      await saveOfflineItem(STORAGE_KEYS.VIDEOS, this.inMemoryVideos);
      await deleteMediaBlob(`video_${videoId}`);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.VIDEOS);
      }
    } catch (e) {
      console.warn('Erreur purge locale vidéo:', e);
    }
  }

  public async purgeAllInactiveFromLocalCache(validOnlineIds: string[]): Promise<void> {
    try {
      const validSet = new Set(validOnlineIds);
      this.inMemoryVideos = this.inMemoryVideos.filter((v) => validSet.has(v.id) && v.isOnline !== false);
      await saveOfflineItem(STORAGE_KEYS.VIDEOS, this.inMemoryVideos);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.VIDEOS);
      }
      console.log(`🧹 [Cache Scrub] IndexedDB vidéos nettoyé avec succès.`);
    } catch (e) {
      console.warn('Erreur purge intégrale cache local:', e);
    }
  }

  public async clearAllLocalAndIndexedDBStorage(): Promise<void> {
    try {
      this.inMemoryVideos = [];
      this.inMemoryRestaurants = [];
      this.inMemoryDishes = [];
      this.inMemoryDownloadedVideos = [];
      this.inMemoryDownloadedMenus = [];
      
      await clearIndexedDBStorage();

      if (typeof localStorage !== 'undefined') {
        const keysToKeep = ['fidfud_user', 'currentUser', 'firebase:authUser'];
        Object.keys(localStorage).forEach(key => {
          if (!keysToKeep.some(k => key.includes(k))) {
            localStorage.removeItem(key);
          }
        });
      }
      console.log('🧹 [Storage Clean] Storage & IndexedDB purgent avec succès.');
    } catch (e) {
      console.warn('Erreur lors du nettoyage complet du stockage:', e);
    }
  }

  public clearAllErrorCaches(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.PENDING_ORDERS);
        localStorage.removeItem(STORAGE_KEYS.PENDING_LIKES);
        localStorage.removeItem(STORAGE_KEYS.PENDING_COMMENTS);
      }
      console.log('🧹 [Cache Scrub] Caches d\'erreurs et files d\'attente réinitialisés.');
    } catch (e) {}
  }
}

export const offlineCacheService = new OfflineCacheService();
