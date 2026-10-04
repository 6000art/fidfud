// Shared TypeScript Interfaces for Fidfud

export type PartnerProfileType = 'restaurateur' | 'foodie_reviewer' | 'culinary_show_host';

export interface MerchantApplication {
  id: string;
  partnerType: PartnerProfileType;
  applicantName: string;
  email: string;
  phone: string;
  city: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  // Profile specific details
  establishmentName?: string;
  siret?: string;
  cuisineCategory?: string;
  channelName?: string;
  platformHandle?: string;
  socialPlatform?: 'youtube' | 'tiktok' | 'instagram' | 'other';
  followerCount?: string;
  showTitle?: string;
  cookingDiscipline?: string;
  masterclassPrice?: string;
  notes?: string;
}

export type UserRole = 'client' | 'restaurant' | 'admin' | 'courier';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  phone?: string;
  address?: string;
  siret?: string;
  createdAt?: string;
  savedRestaurantIds?: string[];
  favoriteRestaurantIds?: string[];
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
  giftEarningsEuros?: number;
  createdAt?: string;
  email?: string;
  phone?: string;
  description?: string;
  isFavorite?: boolean;
  category?: string;
  categories?: string[];
  seoKeywords?: string[];
  seoMetaDescription?: string;
  videoCategories?: string[];
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
  certifications?: string[];
  dietary_info?: string[] | string;
  dietaryInfo?: string[] | string;
  isHalalCertified?: boolean;
  isKosherCertified?: boolean;
  isBioCertified?: boolean;
  isHomemadeCertified?: boolean;
  preparationTimeMinutes?: number;
  avgPreparationTimeMinutes?: number;
  rating?: number;
  reviewCount?: number;
  ratingDistribution?: Record<number, number>;
  cuisineType?: string;
  city?: string;
  imageUrl?: string;
  website?: string;
  websiteUrl?: string;
  siret?: string;
}

export interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string;
  galleryImages?: string[];
  videoId?: string;
  videoUrl?: string;
  cookingVideoUrl?: string;
  prepVideoUrl?: string;
  createdAt?: string;
  isPopular?: boolean;
  stockCount?: number;
  category?: string;
  isFastPreparation?: boolean;
  preparationTimeMinutes?: number;
  isHalal?: boolean;
  isHalalCertified?: boolean;
  isKosher?: boolean;
  isKosherCertified?: boolean;
  isKasher?: boolean;
  isBio?: boolean;
  isBioCertified?: boolean;
  isVegan?: boolean;
  isVegetarian?: boolean;
  isGlutenFree?: boolean;
  isHomemade?: boolean;
  isHomemadeCertified?: boolean;
  isSpicy?: boolean;
  spicyLevel?: number; // 0 = non piquant, 1 = doux/léger, 2 = moyen/relevé, 3 = très piquant/fort, 4 = explosif
  originMeat?: string; // e.g. "Bœuf Charolais 100% Français", "Poulet Fermier Label Rouge"
  allergens?: string[]; // e.g. ["Gluten", "Lactose", "Œufs", "Fruits à coque"]
  ingredients?: string[]; // e.g. ["Mascarpone d'Isigny", "Café Espresso 100% Arabica", "Biscuits Savoiardi"]
  chefNotes?: string; // e.g. "Préparé chaque matin dans notre laboratoire pâtissier."
  nutritionalInfo?: {
    calories?: number;
    proteins?: number;
    carbs?: number;
    fats?: number;
  };
  portionSize?: string; // e.g. "Portion généreuse 220g"
  isFormula?: boolean;
  formulaIncludes?: string[];
  dietary_info?: string[] | string;
  dietaryInfo?: string[] | string;
  dietaryBadges?: string[];
  dietaryTags?: string[];
  certifications?: string[];
  rating?: number;
  reviewCount?: number;
  ratingDistribution?: Record<number, number>;
}

export type VideoSourceType = 'direct' | 'instagram' | 'tiktok' | 'youtube_link' | 'youtube_channel' | 'pinterest';

export interface RecipeIngredient {
  name: string;
  quantity?: string; // e.g. "3", "200g", "1 cuillère à soupe"
  emoji?: string;
}

export interface RecipeStep {
  stepNumber: number;
  title?: string;
  instruction: string;
  tip?: string;
  timerSeconds?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  category: string; // e.g. "Omelettes", "Desserts rapides", "Apéro", etc.
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorRole?: UserRole;
  authorAvatar?: string;
  prepTimeMinutes: number; // e.g. 3
  cookTimeMinutes?: number; // e.g. 5
  difficulty: 'Facile' | 'Moyen' | 'Expert';
  budgetLevel?: '€' | '€€' | '€€€';
  servings?: number; // e.g. 2
  calories?: number;
  videoUrl: string;
  thumbnailUrl?: string;
  videoSourceType?: VideoSourceType;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips?: string[];
  dietaryTags?: string[]; // e.g. ["Végétarien", "Sans Gluten", "Express < 5 min", "Protéiné"]
  likesCount: number;
  sharesCount?: number;
  commentsCount?: number;
  createdAt: string;
  isApproved?: boolean;
  isFeatured?: boolean;
  associatedDishId?: string;
  restaurantId?: string;
}

export interface RecipeCategory {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  createdBy?: string;
  isSystem?: boolean;
  createdAt?: string;
}

export interface Video {
  id: string;
  restaurantId: string;
  restaurantName?: string; // Hydrated for UI
  videoUrl: string;
  thumbnailUrl?: string;
  associatedDishId?: string;
  associatedDish?: Dish;    // Hydrated for UI
  dishId?: string;
  dishName?: string;
  dishPrice?: number;
  title: string;
  description?: string;
  likesCount: number;
  sharesCount?: number;
  createdAt?: string;
  promoOverlay?: string;
  isOnline?: boolean;
  videoSourceType?: VideoSourceType;
  isLiveContinuous?: boolean;
  category?: string;
  categories?: string[];
  viewsCount?: number;
  averageWatchTime?: number;
  validationStatus?: 'pending' | 'valid' | 'invalid';
  validationCheckedAt?: string;
  validationError?: string;
  duration?: number;
  isTooLong?: boolean;
  isRecipe?: boolean;
  recipeId?: string;
  recipe?: Recipe;
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
  pointsEarned?: number;
  stripeChargeId?: string;
  paymentMethod?: 'card' | 'apple_pay' | 'google_pay' | 'cash' | 'offline_queue';
  paymentStatus?: 'paid' | 'pending' | 'failed' | 'refunded';
  transactionId?: string;
  customerLocation?: { latitude: number; longitude: number; address?: string };
  issueReported?: { date: string; category: string; description: string; status: 'open' | 'investigating' | 'resolved'; resolutionNotes?: string };
  createdAt: string;
  items?: OrderItem[];
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  courierStatus?: 'assigned' | 'at_restaurant' | 'en_route' | 'delivered';
  courierLat?: number;
  courierLng?: number;
  cancelReason?: string;
  cancelledAt?: string;
  cancellationRefundAmount?: number;
  originVideoId?: string;
  isFromVideoClick?: boolean;
  estimatedPrepMinutes?: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  dishId: string;
  dishName?: string; // Hydrated
  quantity: number;
  price: number;
}

export interface SupplementOption {
  id: string;
  name: string;
  price: number;
  category?: 'sauces' | 'extras' | 'drinks' | 'sides';
  emoji?: string;
}

export interface CartItem {
  dish: Dish;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
  selectedSupplements?: SupplementOption[];
}

export interface DJSession {
  id: string;
  djName: string;
  djAvatar: string;
  restaurantId?: string;
  restaurantName: string;
  genre: string;
  currentMood: string;
  listenersCount: number;
  videoUrl: string;
  coverImage: string;
  isLive: boolean;
  bpm: number;
  currentTrack: {
    title: string;
    artist: string;
    releaseYear?: string;
  };
  upcomingTracks?: { title: string; artist: string }[];
  bio?: string;
  youtubeChannelUrl?: string;
}

export interface DJTrackRequest {
  id: string;
  djId: string;
  senderName: string;
  trackName: string;
  artistName: string;
  message?: string;
  tipAmount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userEmail: string;
  text: string;
  createdAt: string;
  chefReply?: {
    text: string;
    chefName?: string;
    repliedAt: string;
  };
}

export interface Review {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  dishId?: string;
  dishName?: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  rating: number; // 1-5
  title?: string;
  text: string;
  createdAt: string;
  likesCount?: number;
  isVerifiedBuyer?: boolean;
  chefReply?: {
    text: string;
    repliedAt: string;
    chefName?: string;
  };
}

export interface SearchResult {
  query: string;
  totalCount: number;
  restaurants: Restaurant[];
  dishes: (Dish & { restaurantName?: string })[];
  matchedCategories: string[];
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
  euroValue?: number;
  createdAt: string;
}

export interface UserPoints {
  userId: string;
  points: number;
}

export interface LoyaltyOrderBreakdown {
  orderId: string;
  createdAt: string;
  restaurantName: string;
  totalAmount: number;
  pointsEarned: number;
}

export interface LoyaltySummary {
  userId: string;
  points: number;
  totalOrdersCount: number;
  orderPointsEarned: number;
  ordersBreakdown: LoyaltyOrderBreakdown[];
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

export interface SupportTicket {
  id: string;
  orderId?: string;
  userId: string;
  userEmail?: string;
  category: 'order_delay' | 'payment_issue' | 'video_error' | 'wrong_item' | 'quality' | 'app_bug';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  title: string;
  description: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  refundAmount?: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  module: 'PAYMENT' | 'VIDEO' | 'GEOLOCATION' | 'AUTH' | 'CACHE' | 'DB';
  message: string;
  details?: string;
}

export interface CulinaryShow {
  id: string;
  showName: string;
  hostName: string;
  avatar?: string;
  coverUrl: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  description: string;
  youtubeChannelUrl: string;
  featuredRestaurantName?: string;
  rating?: number;
  active: boolean;
  createdAt?: string;
}

export interface FoodYouTuber {
  id: string;
  creatorName: string;
  channelName: string;
  subscribersCount?: string;
  avatar?: string;
  coverUrl: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  bio: string;
  youtubeChannelUrl: string;
  featuredVideoUrl?: string;
  rating?: number;
  active: boolean;
  createdAt?: string;
}

export type FeedSortOrder = 'taste_profile' | 'recommended' | 'recent' | 'oldest' | 'likes' | 'distance';

export interface TasteProfile {
  personaTitle: string;
  personaDescription: string;
  primaryCuisines: { cuisine: string; score: number; count: number }[];
  topFlavorAttributes: { attribute: string; label: string; score: number; icon: string; count: number }[];
  dietaryAffinities: string[];
  preferredPriceRange: { min: number; max: number; average: number };
  favoriteRestaurantIds: string[];
  topEngagedRestaurants: { restaurantId: string; restaurantName: string; score: number; orderCount: number; likesCount: number }[];
  totalDishSelectionsCount: number;
  totalOrdersCount: number;
  totalVideosLikedCount: number;
  lastUpdated: string;
  customTasteTags: string[];
}

export interface TasteMatchScore {
  score: number;
  matchPercentage: number;
  matchReason: string;
  matchRationale: string;
  badgeLabel: string;
  tasteBadges: string[];
  affinityBreakdown: {
    dishFlavorScore: number;
    restaurantEngagementScore: number;
    cuisineCategoryScore: number;
    priceSweetSpotScore: number;
    noveltyDiscoveryScore: number;
  };
}



