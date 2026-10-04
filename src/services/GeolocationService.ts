import { Restaurant, Video } from '../types';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  addressLabel?: string;
  isCustom?: boolean;
  accuracy?: number;
  updatedAt?: string;
}

// Default Fallback: Paris Center (Châtelet - Les Halles)
export const DEFAULT_LOCATION: UserCoordinates = {
  latitude: 48.8566,
  longitude: 2.3522,
  addressLabel: 'Paris Center (75001)',
  isCustom: false
};

export class GeolocationService {
  private userCoords: UserCoordinates = { ...DEFAULT_LOCATION };
  private listeners: Set<(coords: UserCoordinates) => void> = new Set();
  private watchId: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSavedCoordinates();
    }
  }

  private loadSavedCoordinates() {
    try {
      const saved = localStorage.getItem('fidfud_user_geo_coords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          this.userCoords = parsed;
        }
      }
    } catch (e) {
      console.warn('Erreur lecture coordonnées sauvegardées:', e);
    }
  }

  public getCoordinates(): UserCoordinates {
    return { ...this.userCoords };
  }

  public subscribe(listener: (coords: UserCoordinates) => void): () => void {
    this.listeners.add(listener);
    listener(this.userCoords);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn({ ...this.userCoords }));
  }

  // Request actual browser GPS location
  public requestCurrentLocation(): Promise<UserCoordinates> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        this.notifyListeners();
        return resolve(this.userCoords);
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords: UserCoordinates = {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy),
            addressLabel: 'Position GPS Détectée',
            isCustom: false,
            updatedAt: new Date().toISOString()
          };
          this.userCoords = newCoords;
          try {
            localStorage.setItem('fidfud_user_geo_coords', JSON.stringify(newCoords));
          } catch (e) {}
          this.notifyListeners();
          resolve(newCoords);
        },
        (err) => {
          console.warn('Géolocalisation refusée ou indisponible:', err.message);
          this.notifyListeners();
          resolve(this.userCoords);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000
        }
      );
    });
  }

  public setCustomLocation(lat: number, lng: number, label?: string): UserCoordinates {
    const customCoords: UserCoordinates = {
      latitude: lat,
      longitude: lng,
      addressLabel: label || `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
      isCustom: true,
      updatedAt: new Date().toISOString()
    };
    this.userCoords = customCoords;
    try {
      localStorage.setItem('fidfud_user_geo_coords', JSON.stringify(customCoords));
    } catch (e) {}
    this.notifyListeners();
    return customCoords;
  }

  // Haversine Distance Calculation (returns distance in km)
  public calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 1.2; // Default reasonable fallback

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Format distance cleanly (e.g. "350 m" or "1.4 km")
  public formatDistance(distKm: number): string {
    if (distKm < 1) {
      const meters = Math.round(distKm * 1000);
      return `${meters} m`;
    }
    return `${distKm.toFixed(1)} km`;
  }

  // Get restaurant distance from current user position
  public getRestaurantDistance(restaurant: Restaurant): { distanceKm: number; formatted: string } {
    // If restaurant has no lat/lng, generate realistic mock coords near user
    let lat = restaurant.latitude;
    let lng = restaurant.longitude;

    if (!lat || !lng) {
      // Seed deterministic offset based on restaurant ID length/string
      const hash = (restaurant.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const latOffset = ((hash % 30) - 15) * 0.003;
      const lngOffset = (((hash * 7) % 30) - 15) * 0.003;
      lat = 48.8566 + latOffset;
      lng = 2.3522 + lngOffset;
    }

    const distKm = this.calculateDistanceKm(
      this.userCoords.latitude,
      this.userCoords.longitude,
      lat,
      lng
    );

    return {
      distanceKm: distKm,
      formatted: this.formatDistance(distKm)
    };
  }

  // Sort list of restaurants by distance from user (closest first)
  public sortRestaurantsByProximity(restaurants: Restaurant[]): Restaurant[] {
    return [...restaurants].sort((a, b) => {
      const distA = this.getRestaurantDistance(a).distanceKm;
      const distB = this.getRestaurantDistance(b).distanceKm;
      return distA - distB;
    });
  }

  // Sort list of videos by proximity of their associated restaurant
  public sortVideosByProximity(videos: Video[], restaurants: Restaurant[]): Video[] {
    const restMap = new Map<string, Restaurant>();
    restaurants.forEach((r) => restMap.set(r.id, r));

    return [...videos].sort((v1, v2) => {
      const r1 = restMap.get(v1.restaurantId);
      const r2 = restMap.get(v2.restaurantId);
      const dist1 = r1 ? this.getRestaurantDistance(r1).distanceKm : 999;
      const dist2 = r2 ? this.getRestaurantDistance(r2).distanceKm : 999;
      return dist1 - dist2;
    });
  }
}

export const geolocationService = new GeolocationService();
