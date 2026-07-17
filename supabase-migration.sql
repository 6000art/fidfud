-- Fidfud PostgreSQL / Supabase Schema Migration
-- Designed for high-performance video-commerce delivery
-- Supports user authentication, merchant stores, menus, vertical video metadata, and Stripe-enabled orders

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Linked to Supabase Auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(30) DEFAULT 'client' CHECK (role IN ('client', 'restaurant', 'admin')),
    points_balance INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    commission_rate_delivery NUMERIC(5,2) DEFAULT 15.00 NOT NULL, -- e.g., 15.00%
    commission_rate_collect NUMERIC(5,2) DEFAULT 5.00 NOT NULL,   -- e.g., 5.00%
    stripe_account_id VARCHAR(100) UNIQUE,
    logo_url TEXT,
    banner_url TEXT,
    slogan VARCHAR(255),
    is_certified BOOLEAN DEFAULT false NOT NULL,
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'gold')),
    promo_message VARCHAR(255),
    countdown_minutes INTEGER DEFAULT 10,
    countdown_text VARCHAR(255),
    order_button_delay_seconds INTEGER DEFAULT 5 NOT NULL,
    marketing_popup_delay_seconds INTEGER DEFAULT 30 NOT NULL,
    show_promo_popup BOOLEAN DEFAULT true NOT NULL,
    show_countdown_popup BOOLEAN DEFAULT true NOT NULL,
    show_loyalty_popup BOOLEAN DEFAULT true NOT NULL,
    category VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_ordering_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to restaurants" ON public.restaurants
    FOR SELECT USING (true);

CREATE POLICY "Allow owners to manage their restaurants" ON public.restaurants
    FOR ALL USING (auth.uid() = user_id);

-- 3. DISHES TABLE
CREATE TABLE IF NOT EXISTS public.dishes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN DEFAULT true NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for dishes
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to dishes" ON public.dishes
    FOR SELECT USING (true);

CREATE POLICY "Allow owners to edit dishes" ON public.dishes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = dishes.restaurant_id AND restaurants.user_id = auth.uid()
        )
    );

-- 4. VIDEOS TABLE (Reels-style vertical video)
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    associated_dish_id UUID REFERENCES public.dishes(id) ON DELETE SET NULL,
    video_url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    likes_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to videos" ON public.videos
    FOR SELECT USING (true);

CREATE POLICY "Allow owners to publish/delete videos" ON public.videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = videos.restaurant_id AND restaurants.user_id = auth.uid()
        )
    );

-- 5. ORDERS TABLE (Stripe Connect Split Payouts Enabled)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    service_fee NUMERIC(5,2) DEFAULT 0.99 NOT NULL, -- Fidfud fixed service fee
    delivery_type VARCHAR(30) NOT NULL CHECK (delivery_type IN ('click_and_collect', 'restaurant_delivery')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
    stripe_charge_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow clients to view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow restaurants to view their restaurant orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = orders.restaurant_id AND restaurants.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow restaurants to update their order status" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE restaurants.id = orders.restaurant_id AND restaurants.user_id = auth.uid()
        )
    );

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    dish_id UUID REFERENCES public.dishes(id) ON DELETE SET NULL NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on items of accessible orders" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND (
                orders.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.restaurants 
                    WHERE restaurants.id = orders.restaurant_id AND restaurants.user_id = auth.uid()
                )
            )
        )
    );

-- Performance tuning indices
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON public.restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_dishes_restaurant_id ON public.dishes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_videos_restaurant_id ON public.videos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 7. SUPABASE AUTH TRIGGERS & ROLE-BASED CONTROLS
-- Automatically sync Supabase Auth users to public.profiles with metadata mapping
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, points_balance)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'client'),
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after a user registers
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to check if a user is a restaurant owner
CREATE OR REPLACE FUNCTION public.is_restaurant(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'restaurant'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extra secure policies using functions
CREATE POLICY "Allow update only for own restaurant records" ON public.restaurants
    FOR UPDATE USING (auth.uid() = user_id AND public.is_restaurant(auth.uid()));

