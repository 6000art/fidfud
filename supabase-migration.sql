-- ==============================================================================
-- Fidfud PostgreSQL / Supabase Migration Script
-- Version: 2.0.0
-- Target: Supabase (PostgreSQL 15+)
-- Tables:
--   1. public.users (id, email, role, created_at)
--   2. public.restaurants (id, user_id, name, address, commission_rate, stripe_account_id)
--   3. public.dishes (id, restaurant_id, name, description, price, is_available)
--   4. public.videos (id, restaurant_id, video_url, associated_dish_id, created_at)
--   5. public.orders (id, user_id, restaurant_id, total_amount, service_fee, delivery_type, status, created_at)
--   6. public.order_items (id, order_id, dish_id, quantity, price)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLE DEFINITIONS & CONSTRAINTS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- TABLE 1: users
-- Primary Key: id
-- Unique: email
-- Check: role IN ('client', 'restaurant', 'courier', 'admin')
-- Nullability: email, role, created_at are NOT NULL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'restaurant', 'courier', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Additional useful user metadata
    full_name VARCHAR(150),
    phone VARCHAR(30),
    avatar_url TEXT
);

-- ------------------------------------------------------------------------------
-- TABLE 2: restaurants
-- Primary Key: id
-- Foreign Key: user_id -> users(id)
-- Constraints: commission_rate between 0 and 100
-- Nullability: user_id, name, address, commission_rate are NOT NULL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
    stripe_account_id VARCHAR(120) UNIQUE,
    
    -- Additional store branding and geolocation
    logo_url TEXT,
    banner_url TEXT,
    slogan VARCHAR(255),
    category VARCHAR(100) DEFAULT 'Général',
    latitude NUMERIC(10, 7) CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
    longitude NUMERIC(10, 7) CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
    is_published BOOLEAN NOT NULL DEFAULT true,
    is_ordering_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- TABLE 3: dishes
-- Primary Key: id
-- Foreign Key: restaurant_id -> restaurants(id) ON DELETE CASCADE
-- Constraints: price >= 0
-- Nullability: restaurant_id, name, price, is_available are NOT NULL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0.00),
    is_available BOOLEAN NOT NULL DEFAULT true,
    
    -- Additional culinary media & categorisation
    image_url TEXT,
    category VARCHAR(100) DEFAULT 'Plats',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- TABLE 4: videos
-- Primary Key: id
-- Foreign Key: restaurant_id -> restaurants(id) ON DELETE CASCADE
-- Foreign Key: associated_dish_id -> dishes(id) ON DELETE SET NULL
-- Nullability: restaurant_id, video_url, created_at are NOT NULL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    video_url TEXT NOT NULL,
    associated_dish_id UUID REFERENCES public.dishes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Additional engagement metrics
    title VARCHAR(255) NOT NULL DEFAULT 'Moment Gourmand',
    thumbnail_url TEXT,
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0)
);

-- ------------------------------------------------------------------------------
-- TABLE 5: orders
-- Primary Key: id
-- Foreign Key: user_id -> users(id) ON DELETE RESTRICT
-- Foreign Key: restaurant_id -> restaurants(id) ON DELETE RESTRICT
-- Constraints: total_amount >= 0, service_fee >= 0
-- Nullability: user_id, restaurant_id, total_amount, service_fee, delivery_type, status, created_at are NOT NULL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0.00),
    service_fee NUMERIC(10,2) NOT NULL DEFAULT 0.99 CHECK (service_fee >= 0.00),
    delivery_type VARCHAR(50) NOT NULL DEFAULT 'click_and_collect' CHECK (delivery_type IN ('click_and_collect', 'restaurant_delivery')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Transaction reference
    stripe_charge_id VARCHAR(150),
    customer_address TEXT
);

-- ------------------------------------------------------------------------------
-- TABLE 6: order_items
-- Primary Key: id
-- Foreign Key: order_id -> orders(id) ON DELETE CASCADE
-- Foreign Key: dish_id -> dishes(id) ON DELETE RESTRICT
-- Constraints: quantity > 0, price >= 0
-- Nullability: order_id, dish_id, quantity, price are NOT NULL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0.00),
    
    CONSTRAINT uq_order_item_dish UNIQUE (order_id, dish_id)
);

-- ==============================================================================
-- 3. PERFORMANCE INDEXES (Foreign Keys & Search Filters)
-- ==============================================================================

-- Users Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Restaurants Indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON public.restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_published ON public.restaurants(is_published);
CREATE INDEX IF NOT EXISTS idx_restaurants_stripe_account_id ON public.restaurants(stripe_account_id);

-- Dishes Indexes
CREATE INDEX IF NOT EXISTS idx_dishes_restaurant_id ON public.dishes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dishes_is_available ON public.dishes(is_available);

-- Videos Indexes
CREATE INDEX IF NOT EXISTS idx_videos_restaurant_id ON public.videos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_videos_associated_dish_id ON public.videos(associated_dish_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);

-- Orders Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Order Items Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dish_id ON public.order_items(dish_id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Users RLS
CREATE POLICY "Allow public read users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update self" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Restaurants RLS
CREATE POLICY "Allow public read published restaurants" ON public.restaurants
    FOR SELECT USING (is_published = true OR auth.uid() = user_id);

CREATE POLICY "Allow restaurant owners to insert restaurant" ON public.restaurants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow restaurant owners to update their restaurant" ON public.restaurants
    FOR UPDATE USING (auth.uid() = user_id);

-- Dishes RLS
CREATE POLICY "Allow public read dishes" ON public.dishes
    FOR SELECT USING (true);

CREATE POLICY "Allow restaurant owners to manage dishes" ON public.dishes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants
            WHERE restaurants.id = dishes.restaurant_id AND restaurants.user_id = auth.uid()
        )
    );

-- Videos RLS
CREATE POLICY "Allow public read videos" ON public.videos
    FOR SELECT USING (true);

CREATE POLICY "Allow restaurant owners to manage videos" ON public.videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants
            WHERE restaurants.id = videos.restaurant_id AND restaurants.user_id = auth.uid()
        )
    );

-- Orders RLS
CREATE POLICY "Allow users to view own orders" ON public.orders
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.restaurants
            WHERE restaurants.id = orders.restaurant_id AND restaurants.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to create orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow restaurant owners to update order status" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.restaurants
            WHERE restaurants.id = orders.restaurant_id AND restaurants.user_id = auth.uid()
        )
    );

-- Order Items RLS
CREATE POLICY "Allow users and restaurants to read accessible order items" ON public.order_items
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

CREATE POLICY "Allow users to insert items for their own orders" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- 5. SUPABASE AUTH SYNCHRONIZATION TRIGGER
-- Automatically copies users from auth.users to public.users on signup
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_supabase_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'client'),
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_new_user();
