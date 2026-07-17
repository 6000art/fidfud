-- Fidfud PostgreSQL Database Schema Migration Script
-- Designed for Supabase / PostgreSQL databases

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create roles type
CREATE TYPE user_role AS ENUM ('client', 'restaurant', 'admin');
CREATE TYPE delivery_option AS ENUM ('click_and_collect', 'restaurant_delivery');
CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Restaurants Table
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    commission_rate_delivery NUMERIC(4, 2) DEFAULT 15.00, -- 15% standard delivery fee
    commission_rate_collect NUMERIC(4, 2) DEFAULT 5.00,   -- 5% standard click & collect fee
    stripe_account_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Dishes (Plats) Table
CREATE TABLE IF NOT EXISTS dishes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Videos Table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    associated_dish_id UUID REFERENCES dishes(id) ON DELETE SET NULL,
    title VARCHAR(255),
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Orders (Commandes) Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    service_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.99, -- €0.99 fixed fee
    delivery_type delivery_option NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    stripe_charge_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Order Items (Lignes de commande) Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0)
);

-- Add sample indexes for queries optimization
CREATE INDEX IF NOT EXISTS idx_videos_restaurant ON videos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ==========================================================
-- SQL Seed Script to Populate Sample Data
-- ==========================================================

-- Clean previous data to ensure idempotent seeding (optional but highly recommended)
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE videos CASCADE;
TRUNCATE TABLE dishes CASCADE;
TRUNCATE TABLE restaurants CASCADE;
TRUNCATE TABLE users CASCADE;

-- 1. Seed Users (Client, Restaurateurs, Admin)
INSERT INTO users (id, email, role) VALUES
('11111111-1111-1111-1111-111111111111', 'foodie@fidfud.app', 'client'),
('22222222-2222-2222-2222-222222222222', 'partner@nonnapizza.fr', 'restaurant'),
('33333333-3333-3333-3333-333333333333', 'contact@tokyoramen.jp', 'restaurant'),
('44444444-4444-4444-4444-444444444444', 'chef@burgerlab.com', 'restaurant'),
('55555555-5555-5555-5555-555555555555', 'admin@fidfud.app', 'admin');

-- 2. Seed Restaurants
INSERT INTO restaurants (id, user_id, name, address, commission_rate_delivery, commission_rate_collect, stripe_account_id) VALUES
('aa11aa11-11aa-11aa-11aa-111111111111', '22222222-2222-2222-2222-222222222222', 'Nonna''s Neapolitan Pizza', '14 Rue de Charonne, 75011 Paris', 15.00, 5.00, 'acct_1NonnaPizzaConnect123'),
('bb22bb22-22bb-22bb-22bb-222222222222', '33333333-3333-3333-3333-333333333333', 'Tokyo Ramen Bar', '28 Rue Sainte-Anne, 75001 Paris', 15.00, 5.00, 'acct_2TokyoRamenConnect456'),
('cc33cc33-33cc-33cc-33cc-333333333333', '44444444-4444-4444-4444-444444444444', 'Smashed Burger Lab', '8 Boulevard Voltaire, 75011 Paris', 15.00, 5.00, 'acct_3BurgerLabConnect789');

-- 3. Seed Dishes
INSERT INTO dishes (id, restaurant_id, name, description, price, is_available, image_url) VALUES
-- Nonna's Pizzas
('d1111111-1111-1111-1111-111111111111', 'aa11aa11-11aa-11aa-11aa-111111111111', 'Marguerita D.O.C.', 'Tomates San Marzano, mozzarella di bufala, basilic frais, huile d’olive extra-vierge.', 13.50, TRUE, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80'),
('d1111111-2222-2222-2222-222222222222', 'aa11aa11-11aa-11aa-11aa-111111111111', 'La Truffe Royale', 'Crème de truffe blanche, mozzarella, champignons sauvages, roquette et parmesan 24 mois.', 18.90, TRUE, 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=500&auto=format&fit=crop&q=80'),
-- Tokyo Ramen
('d2222222-1111-1111-1111-111111111111', 'bb22bb22-22bb-22bb-22bb-222222222222', 'Tonkotsu Ramen Impérial', 'Bouillon crémeux de porc mijoté 16h, nouilles fraîches, chashu fondant, œuf ajitama bio coulant et oignons verts.', 15.90, TRUE, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80'),
('d2222222-2222-2222-2222-222222222222', 'bb22bb22-22bb-22bb-22bb-222222222222', 'Gyozas Maison au Poulet (x6)', 'Raviolis japonais grillés croustillants, farcis au poulet rôti, gingembre et ciboule.', 7.50, TRUE, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80'),
-- Smashed Burger
('d3333333-1111-1111-1111-111111111111', 'cc33cc33-33cc-33cc-33cc-333333333333', 'The OG Double Smashed', 'Deux patties de bœuf Black Angus smashés, cheddar américain affiné fondant, oignons caramélisés, cornichons, sauce secrète maison dans un pain bun brioché toasté.', 12.90, TRUE, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80'),
('d3333333-2222-2222-2222-222222222222', 'cc33cc33-33cc-33cc-33cc-333333333333', 'Cheesy Sweet Potatoes', 'Frites de patates douces croustillantes nappées de cheddar chaud fondu et bacon crispy.', 6.20, TRUE, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80');

-- 4. Seed Videos
INSERT INTO videos (id, restaurant_id, video_url, associated_dish_id, title, likes_count) VALUES
('v1111111-1111-1111-1111-111111111111', 'aa11aa11-11aa-11aa-11aa-111111111111', 'https://assets.mixkit.co/videos/preview/mixkit-putting-fresh-herbs-on-a-pizza-39981-large.mp4', 'd1111111-1111-1111-1111-111111111111', '🍕 Regardez le basilic frais se déposer sur la Marguerita DOC fumante !', 1420),
('v2222222-1111-1111-1111-111111111111', 'bb22bb22-22bb-22bb-22bb-222222222222', 'https://assets.mixkit.co/videos/preview/mixkit-serving-hot-soup-in-a-bowl-42247-large.mp4', 'd2222222-1111-1111-1111-111111111111', '🍜 Notre légendaire bouillon Tonkotsu fumant versé minute.', 890),
('v3333333-1111-1111-1111-111111111111', 'cc33cc33-33cc-33cc-33cc-333333333333', 'https://assets.mixkit.co/videos/preview/mixkit-cutting-slices-of-cooked-meat-39972-large.mp4', 'd3333333-1111-1111-1111-111111111111', '🍔 Sensationnel bœuf grillé préparé par le Chef. Smashé à l’extrême !', 2311),
('v1111111-2222-2222-2222-222222222222', 'aa11aa11-11aa-11aa-11aa-111111111111', 'https://assets.mixkit.co/videos/preview/mixkit-dripping-syrup-on-delicious-pancakes-34326-large.mp4', 'd1111111-2222-2222-2222-222222222222', '✨ Préparation méticuleuse de nos desserts gourmands.', 541),
('v2222222-2222-2222-2222-222222222222', 'bb22bb22-22bb-22bb-22bb-222222222222', 'https://assets.mixkit.co/videos/preview/mixkit-pouring-sauce-on-fresh-sushi-42323-large.mp4', 'd2222222-2222-2222-2222-222222222222', '🍣 Sauce soja nappée délicatement sur nos gyozas et sushis frais.', 615);

-- 5. Seed Orders
INSERT INTO orders (id, user_id, restaurant_id, total_amount, service_fee, delivery_type, status, stripe_charge_id) VALUES
('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aa11aa11-11aa-11aa-11aa-111111111111', 32.40, 0.99, 'restaurant_delivery', 'preparing', 'ch_mock_stripe_charge_777');

-- 6. Seed Order Items
INSERT INTO order_items (id, order_id, dish_id, quantity, price) VALUES
('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 2, 13.50),
('f1111111-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'd1111111-2222-2222-2222-222222222222', 1, 18.90);

