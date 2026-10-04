import type { Database } from './database';

export type UserRow = Database['public']['Tables']['users']['Row'];
export type RestaurantRow = Database['public']['Tables']['restaurants']['Row'];
export type DishRow = Database['public']['Tables']['dishes']['Row'];
export type VideoRow = Database['public']['Tables']['videos']['Row'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

export type UserRole = 'client' | 'restaurant' | 'courier' | 'admin';
export type DeliveryType = 'click_and_collect' | 'restaurant_delivery';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  userId: string;
  name: string;
  address: string;
  commissionRate: number;
  stripeAccountId?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  slogan?: string | null;
  category?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPublished: boolean;
  isOrderingEnabled: boolean;
  createdAt: string;
}

export interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  price: number;
  isAvailable: boolean;
  imageUrl?: string | null;
  category?: string | null;
  createdAt: string;
}

export interface Video {
  id: string;
  restaurantId: string;
  videoUrl: string;
  associatedDishId?: string | null;
  title: string;
  thumbnailUrl?: string | null;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  // Associated entities populated via joins
  dish?: Dish | null;
  restaurant?: Restaurant | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  dishId: string;
  quantity: number;
  price: number;
  dishName?: string;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  totalAmount: number;
  serviceFee: number;
  deliveryType: DeliveryType;
  status: OrderStatus;
  stripeChargeId?: string | null;
  customerAddress?: string | null;
  createdAt: string;
  items?: OrderItem[];
  restaurantName?: string;
}

export interface CartItem {
  dish: Dish;
  quantity: number;
  restaurantId: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
