// Shared TypeScript Interfaces for Fidfud

export type UserRole = 'client' | 'restaurant' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface Restaurant {
  id: string;
  userId: string;
  name: string;
  address: string;
  commissionRateDelivery: number; // e.g. 15 for 15%
  commissionRateCollect: number;  // e.g. 5 for 5%
  stripeAccountId?: string;
  logoUrl?: string;
  bannerUrl?: string;
  slogan?: string;
  isCertified?: boolean;
  subscriptionTier?: 'free' | 'pro' | 'gold';
  promoMessage?: string;
  countdownMinutes?: number;
  countdownText?: string;
  orderButtonDelaySeconds?: number;
  marketingPopupDelaySeconds?: number;
  showPromoPopup?: boolean;
  showCountdownPopup?: boolean;
  showLoyaltyPopup?: boolean;
  likesReceived?: number;
  pointsReceived?: number;
  createdAt?: string;
  email?: string;
  phone?: string;
  description?: string;
  isFavorite?: boolean;
  category?: string;
  dispositionShop?: string;
  shortName?: string;
  latitude?: number;
  longitude?: number;
  isOrderingEnabled?: boolean;
  isPublished?: boolean;
  videoUrl?: string;
  videoTitle?: string;
  videoSourceType?: 'direct' | 'instagram' | 'tiktok' | 'youtube_link' | 'youtube_channel';
  isLiveContinuous?: boolean;
}

export interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string;
  createdAt?: string;
  isPopular?: boolean;
  stockCount?: number;
  category?: string;
}

export interface Video {
  id: string;
  restaurantId: string;
  restaurantName?: string; // Hydrated for UI
  videoUrl: string;
  associatedDishId?: string;
  associatedDish?: Dish;    // Hydrated for UI
  title: string;
  likesCount: number;
  createdAt?: string;
  promoOverlay?: string;
  isOnline?: boolean;
  videoSourceType?: 'direct' | 'instagram' | 'tiktok' | 'youtube_link' | 'youtube_channel';
  isLiveContinuous?: boolean;
  viewsCount?: number;
  averageWatchTime?: number;
  validationStatus?: 'pending' | 'valid' | 'invalid';
  validationCheckedAt?: string;
  validationError?: string;
  duration?: number;
  isTooLong?: boolean;
}

export type DeliveryType = 'click_and_collect' | 'restaurant_delivery';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName?: string; // Hydrated
  totalAmount: number;
  serviceFee: number; // 0.99
  deliveryType: DeliveryType;
  status: OrderStatus;
  stripeChargeId?: string;
  createdAt: string;
  items?: OrderItem[];
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  courierStatus?: 'assigned' | 'at_restaurant' | 'en_route' | 'delivered';
  courierLat?: number;
  courierLng?: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  dishId: string;
  dishName?: string; // Hydrated
  quantity: number;
  price: number;
}

export interface CartItem {
  dish: Dish;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userEmail: string;
  text: string;
  createdAt: string;
}

export interface Review {
  id: string;
  restaurantId: string;
  dishId?: string;
  userName: string;
  rating: number; // 1-5
  text: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  restaurantId: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  userId: string;
  userEmail: string;
  restaurantId: string;
  restaurantName: string;
  date: string;
  time: string;
  guests: number;
  notes?: string;
  createdAt: string;
}

export interface Tip {
  id: string;
  videoId: string;
  userId: string;
  userEmail: string;
  restaurantId: string;
  icon: string;
  pointsSent: number;
  createdAt: string;
}

export interface UserPoints {
  userId: string;
  points: number;
}

export interface StripeSplitResult {
  totalAmount: number;
  serviceFee: number; // 0.99
  deliveryType: DeliveryType;
  commissionRateUsed: number; // e.g. 15 or 5
  fidfudCommissionAmount: number; // price * rate / 100
  fidfudTotalTake: number; // commissionAmount + 0.99
  restaurantPayoutAmount: number; // price - commissionAmount
  stripeAccountId?: string;
}

export interface UserRewardClaim {
  id: string;
  userId: string;
  rewardId: string;
  rewardName: string;
  code: string;
  isUsed: boolean;
  createdAt: string;
}

export interface Restaurateur {
  id: string;
  restaurantId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio?: string;
  profileImageUrl?: string;
  createdAt: string;
}

export interface RestaurateurMedia {
  id: string;
  restaurateurId: string;
  restaurantId: string;
  mediaType: 'image' | 'video';
  url: string;
  title: string;
  associatedDishId?: string;
  isPosted: boolean;
  tags?: string[];
  createdAt: string;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicle: 'Velo' | 'Scooter' | 'Voiture';
  status: 'available' | 'delivering' | 'offline';
  assignedOrderId?: string;
  email?: string;
  password?: string;
  avatarUrl?: string;
  identityVerified?: boolean;
  kbisVerified?: boolean;
  siret?: string;
  drivingLicense?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
}


