-- ==============================================================================
-- Fidfud PostgreSQL Database Schema & Migration Script
-- Version: 1.0.0
-- Tables: users, restaurants, dishes, videos, orders, order_items
-- Includes: Enums, Extensions, Constraints, Foreign Keys, Indexes & Triggers
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CUSTOM ENUMS & TYPES
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'restaurant', 'admin', 'courier');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'gold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_type AS ENUM ('click_and_collect', 'restaurant_delivery');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM ('card', 'apple_pay', 'google_pay', 'cash', 'offline_queue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM ('paid', 'pending', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_source_type AS ENUM ('direct', 'instagram', 'tiktok', 'youtube_link', 'youtube_channel', 'pinterest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================================================
-- 4. TABLE CREATION WITH CONSTRAINTS & RELATIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- TABLE: users
-- Description: Stores platform clients, restaurant managers, couriers and admins
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'client',
    full_name VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    siret VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Trigger for users updated_at
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABLE: restaurants
-- Description: Stores restaurant profiles, configuration, geolocation & branding
-- Relation: Belongs to users (user_id -> users.id)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    name VARCHAR(150) NOT NULL,
    short_name VARCHAR(100),
    address TEXT NOT NULL,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    latitude NUMERIC(10, 7) CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(10, 7) CHECK (longitude BETWEEN -180 AND 180),
    phone VARCHAR(30),
    email VARCHAR(255),
    website TEXT,
    siret VARCHAR(20),
    category VARCHAR(100) DEFAULT 'Général',
    categories TEXT[] DEFAULT '{}',
    cuisine_type VARCHAR(100),
    description TEXT,
    slogan VARCHAR(255),
    logo_url TEXT,
    banner_url TEXT,
    stripe_account_id VARCHAR(120) UNIQUE,
    commission_rate_delivery NUMERIC(5, 2) NOT NULL DEFAULT 15.00 CHECK (commission_rate_delivery >= 0 AND commission_rate_delivery <= 100),
    commission_rate_collect NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (commission_rate_collect >= 0 AND commission_rate_collect <= 100),
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    is_certified BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    is_ordering_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for restaurants updated_at
DROP TRIGGER IF EXISTS trigger_restaurants_updated_at ON restaurants;
CREATE TRIGGER trigger_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABLE: dishes
-- Description: Stores culinary menu items, ingredients, allergens & pricing
-- Relation: Belongs to restaurants (restaurant_id -> restaurants.id)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category VARCHAR(100) DEFAULT 'Plats',
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT,
    gallery_images TEXT[] DEFAULT '{}',
    video_url TEXT,
    cooking_video_url TEXT,
    stock_count INTEGER CHECK (stock_count IS NULL OR stock_count >= 0),
    preparation_time_minutes INTEGER DEFAULT 15 CHECK (preparation_time_minutes >= 0),
    is_halal BOOLEAN NOT NULL DEFAULT FALSE,
    is_kosher BOOLEAN NOT NULL DEFAULT FALSE,
    is_bio BOOLEAN NOT NULL DEFAULT FALSE,
    is_vegan BOOLEAN NOT NULL DEFAULT FALSE,
    is_vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
    is_gluten_free BOOLEAN NOT NULL DEFAULT FALSE,
    is_homemade BOOLEAN NOT NULL DEFAULT TRUE,
    is_spicy BOOLEAN NOT NULL DEFAULT FALSE,
    spicy_level INTEGER DEFAULT 0 CHECK (spicy_level BETWEEN 0 AND 4),
    origin_meat VARCHAR(150),
    allergens TEXT[] DEFAULT '{}',
    ingredients TEXT[] DEFAULT '{}',
    chef_notes TEXT,
    nutritional_calories INTEGER CHECK (nutritional_calories IS NULL OR nutritional_calories >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for dishes updated_at
DROP TRIGGER IF EXISTS trigger_dishes_updated_at ON dishes;
CREATE TRIGGER trigger_dishes_updated_at
    BEFORE UPDATE ON dishes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABLE: videos
-- Description: Vertical TikTok/Reels-style media feed linked to restaurants & dishes
-- Relations: 
--   - restaurant_id -> restaurants.id (CASCADE)
--   - associated_dish_id -> dishes.id (SET NULL if dish is deleted)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    associated_dish_id UUID REFERENCES dishes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_source_type video_source_type NOT NULL DEFAULT 'direct',
    duration_seconds NUMERIC(6, 2) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    shares_count INTEGER NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
    views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0),
    is_online BOOLEAN NOT NULL DEFAULT TRUE,
    is_live_continuous BOOLEAN NOT NULL DEFAULT FALSE,
    category VARCHAR(100),
    categories TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for videos updated_at
DROP TRIGGER IF EXISTS trigger_videos_updated_at ON videos;
CREATE TRIGGER trigger_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABLE: orders
-- Description: Client order records, transactions, payment status & delivery details
-- Relations:
--   - user_id -> users.id (RESTRICT/CASCADE)
--   - restaurant_id -> restaurants.id (RESTRICT)
--   - courier_id -> users.id (SET NULL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    courier_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    service_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.99 CHECK (service_fee >= 0),
    delivery_type delivery_type NOT NULL DEFAULT 'click_and_collect',
    status order_status NOT NULL DEFAULT 'pending',
    payment_method payment_method_type NOT NULL DEFAULT 'card',
    payment_status payment_status_type NOT NULL DEFAULT 'pending',
    stripe_charge_id VARCHAR(150),
    transaction_id VARCHAR(150),
    customer_address TEXT,
    customer_latitude NUMERIC(10, 7) CHECK (customer_latitude IS NULL OR (customer_latitude BETWEEN -90 AND 90)),
    customer_longitude NUMERIC(10, 7) CHECK (customer_longitude IS NULL OR (customer_longitude BETWEEN -180 AND 180)),
    cancel_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    estimated_prep_minutes INTEGER DEFAULT 20 CHECK (estimated_prep_minutes >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for orders updated_at
DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABLE: order_items
-- Description: Line items belonging to an order
-- Relations:
--   - order_id -> orders.id (CASCADE: deleting an order removes its line items)
--   - dish_id -> dishes.id (RESTRICT: prevents deleting a dish tied to active orders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    dish_name VARCHAR(150) NOT NULL, -- Stored redundantly to preserve historical receipt name
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_order_dish UNIQUE (order_id, dish_id)
);

-- ==============================================================================
-- 5. PERFORMANCE INDEXES (Foreign Keys & Frequent Search Fields)
-- ==============================================================================

-- Users Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Restaurants Indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_published ON restaurants(is_published);
CREATE INDEX IF NOT EXISTS idx_restaurants_geo ON restaurants(latitude, longitude);

-- Dishes Indexes
CREATE INDEX IF NOT EXISTS idx_dishes_restaurant_id ON dishes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category);
CREATE INDEX IF NOT EXISTS idx_dishes_is_available ON dishes(is_available);
CREATE INDEX IF NOT EXISTS idx_dishes_price ON dishes(price);

-- Videos Indexes
CREATE INDEX IF NOT EXISTS idx_videos_restaurant_id ON videos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_videos_associated_dish_id ON videos(associated_dish_id);
CREATE INDEX IF NOT EXISTS idx_videos_is_online ON videos(is_online);
CREATE INDEX IF NOT EXISTS idx_videos_likes_count ON videos(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- Orders Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier_id ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Order Items Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dish_id ON order_items(dish_id);
