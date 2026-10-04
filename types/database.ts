/**
 * Supabase Database TypeScript Definitions
 * Matching the Fidfud PostgreSQL migration schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'client' | 'restaurant' | 'courier' | 'admin';
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: 'client' | 'restaurant' | 'courier' | 'admin';
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'client' | 'restaurant' | 'courier' | 'admin';
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      restaurants: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string;
          commission_rate: number;
          stripe_account_id: string | null;
          logo_url: string | null;
          banner_url: string | null;
          slogan: string | null;
          category: string | null;
          latitude: number | null;
          longitude: number | null;
          is_published: boolean;
          is_ordering_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address: string;
          commission_rate?: number;
          stripe_account_id?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          slogan?: string | null;
          category?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_published?: boolean;
          is_ordering_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string;
          commission_rate?: number;
          stripe_account_id?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          slogan?: string | null;
          category?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_published?: boolean;
          is_ordering_enabled?: boolean;
          created_at?: string;
        };
      };
      dishes: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          price: number;
          is_available: boolean;
          image_url: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          price: number;
          is_available?: boolean;
          image_url?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          is_available?: boolean;
          image_url?: string | null;
          category?: string | null;
          created_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          restaurant_id: string;
          video_url: string;
          associated_dish_id: string | null;
          title: string;
          thumbnail_url: string | null;
          likes_count: number;
          views_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          video_url: string;
          associated_dish_id?: string | null;
          title?: string;
          thumbnail_url?: string | null;
          likes_count?: number;
          views_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          video_url?: string;
          associated_dish_id?: string | null;
          title?: string;
          thumbnail_url?: string | null;
          likes_count?: number;
          views_count?: number;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          restaurant_id: string;
          total_amount: number;
          service_fee: number;
          delivery_type: 'click_and_collect' | 'restaurant_delivery';
          status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
          stripe_charge_id: string | null;
          customer_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          restaurant_id: string;
          total_amount: number;
          service_fee?: number;
          delivery_type?: 'click_and_collect' | 'restaurant_delivery';
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
          stripe_charge_id?: string | null;
          customer_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          restaurant_id?: string;
          total_amount?: number;
          service_fee?: number;
          delivery_type?: 'click_and_collect' | 'restaurant_delivery';
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
          stripe_charge_id?: string | null;
          customer_address?: string | null;
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          dish_id: string;
          quantity: number;
          price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          dish_id: string;
          quantity: number;
          price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          dish_id?: string;
          quantity?: number;
          price?: number;
        };
      };
    };
  };
}
