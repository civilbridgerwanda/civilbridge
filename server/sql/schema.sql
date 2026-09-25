-- CivilBridge database schema
-- Run with: npm run migrate   (from server/), which executes this file
-- automatically - see server/src/scripts/migrate.js.
-- Manual alternative: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS civilbridge
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE civilbridge;

-- All primary keys are UUIDs (CHAR(36)), not auto-increment integers.
-- Rows created through the app get their UUID from Sequelize
-- (DataTypes.UUIDV4); rows seeded here via raw SQL generate one with
-- MySQL's UUID() function so both paths work identically.

-- Users (clients, experts, admins)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('client', 'expert', 'property_owner', 'admin') NOT NULL DEFAULT 'client',
  phone VARCHAR(30),
  email_verified BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  plan ENUM('starter', 'professional', 'business') NOT NULL DEFAULT 'starter',
  -- Freemium daily-credit system: starter-plan users get a fixed number of
  -- credits that reset every 24h, spent only on actions where the AI does
  -- real work (BOQ generation, deep analysis) - not on browsing or casual
  -- chat. Paid plans (professional/business) bypass this check entirely.
  credits_remaining INT NOT NULL DEFAULT 5,
  credits_reset_at TIMESTAMP NULL DEFAULT NULL,
  -- Set when a user asks to upgrade from Pricing; cleared once an admin
  -- actually changes their `plan` (billing isn't wired up yet, so upgrades
  -- are a manual admin action for now, not self-service checkout).
  requested_plan ENUM('professional', 'business') NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- One-time codes for email verification / password reset
CREATE TABLE IF NOT EXISTS otps (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  purpose ENUM('email_verification', 'password_reset') NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Verified construction experts (engineers, architects, contractors)
CREATE TABLE IF NOT EXISTS experts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  category ENUM('engineer', 'architect', 'contractor', 'surveyor', 'interior_designer') NOT NULL,
  specialty VARCHAR(120) NOT NULL,
  specialization VARCHAR(150),
  bio TEXT,
  years_experience INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(2,1) DEFAULT 0.0,
  review_count INT DEFAULT 0,
  completed_projects INT DEFAULT 0,
  avatar_url VARCHAR(500),
  city VARCHAR(100),
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_expert_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Properties / land plots marketplace
CREATE TABLE IF NOT EXISTS properties (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_id CHAR(36),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  property_type ENUM('house', 'apartment', 'land', 'commercial') NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RWF',
  city VARCHAR(100),
  district VARCHAR(100),
  size_sqm DECIMAL(10,2),
  bedrooms INT NULL,
  bathrooms INT NULL,
  image_url VARCHAR(500),
  images JSON NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  -- Listings an admin creates default to TRUE (trusted); ones a property
  -- owner submits themselves are set FALSE at creation (see properties
  -- controller) and hidden from public browsing until an admin approves
  -- them from the dashboard.
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  status ENUM('available', 'pending', 'sold') DEFAULT 'available',
  rating DECIMAL(2,1) DEFAULT 0.0,
  review_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Seed rows below use UUID() for `id`, a fresh value every migrate run,
  -- so INSERT IGNORE can't detect them as duplicates by primary key alone.
  -- image_url is already guaranteed unique across every property (see the
  -- assertNoDuplicateImages check in migrate.js) so this constraint is what
  -- actually makes re-running the seed idempotent.
  UNIQUE KEY unique_property_image (image_url),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Cost estimator requests (AI-generated, then expert-reviewed)
CREATE TABLE IF NOT EXISTS estimates (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36),
  project_name VARCHAR(200) NOT NULL,
  project_type VARCHAR(100),
  description TEXT,
  estimated_cost DECIMAL(14,2),
  currency VARCHAR(10) DEFAULT 'RWF',
  status ENUM('draft', 'ai_generated', 'under_review', 'verified') DEFAULT 'draft',
  reviewed_by CHAR(36) NULL,
  assigned_expert_id CHAR(36) NULL,
  attachment_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES experts(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_expert_id) REFERENCES experts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Bill of quantities line items tied to an estimate
CREATE TABLE IF NOT EXISTS estimate_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  estimate_id CHAR(36) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  unit VARCHAR(30),
  quantity DECIMAL(12,2),
  unit_price DECIMAL(14,2),
  total_price DECIMAL(14,2),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pre-designed building plans catalog (Plans page)
CREATE TABLE IF NOT EXISTS plans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  plan_type ENUM('house', 'apartment', 'land', 'commercial') NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RWF',
  city VARCHAR(100),
  bedrooms INT NULL,
  bathrooms INT NULL,
  size_sqm DECIMAL(10,2),
  rating DECIMAL(2,1) DEFAULT 0.0,
  review_count INT DEFAULT 0,
  badge ENUM('new', 'hot') NULL,
  is_prime_location BOOLEAN DEFAULT FALSE,
  image_url VARCHAR(500),
  images JSON NULL,
  document_url VARCHAR(500) NULL,
  video_url VARCHAR(500) NULL,
  -- The actual paid deliverable (full drawing pack/CAD files, zipped) -
  -- distinct from document_url's PDF preview. Only ever exposed to admins
  -- or an entitled purchaser, never in the public API response otherwise.
  zip_url VARCHAR(500) NULL,
  -- Separate from `price` (the construction estimate) - what unlocking the
  -- full drawing pack costs on its own. NULL means the admin hasn't set one
  -- yet, in which case the detail page just doesn't show that price line.
  license_price DECIMAL(14,2) NULL,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- See the matching comment on properties.image_url - same idempotency fix.
  UNIQUE KEY unique_plan_image (image_url)
) ENGINE=InnoDB;

-- AI Studio conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NULL,
  title VARCHAR(200) NOT NULL DEFAULT 'New Conversation',
  share_token VARCHAR(32) NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- created_at uses microsecond precision here (DATETIME(6)) specifically so
-- messages can be ordered reliably by timestamp - UUID primary keys are
-- random, not sequential, so "ORDER BY id" (which worked with the old
-- auto-increment ids) no longer reflects insertion order.
CREATE TABLE IF NOT EXISTS ai_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Links a user to their Google/Facebook/X identity. A user can have
-- multiple linked providers; each (provider, provider_user_id) pair is
-- unique so the same social account can't be linked to two users.
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  provider ENUM('google', 'facebook', 'x') NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_provider_account (provider, provider_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Payments. The workflow/records here are real (create, list, admin
-- reconciliation), but no payment gateway is wired up yet - see
-- server/src/config/paymentProvider.js. Until a real provider (Flutterwave
-- is the practical choice for Rwanda: card + MTN/Airtel Mobile Money) is
-- connected, payments are created as "pending" and an admin manually marks
-- them completed/failed once money actually changes hands elsewhere.
CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  payer_id CHAR(36) NOT NULL,
  recipient_type ENUM('platform', 'expert') NOT NULL DEFAULT 'platform',
  recipient_id CHAR(36) NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RWF',
  purpose VARCHAR(150) NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id CHAR(36) NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  payment_method VARCHAR(30) NULL,
  target_plan VARCHAR(30) NULL,
  notes VARCHAR(500) NULL,
  provider VARCHAR(50) NULL,
  provider_reference VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES experts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- A record of each newsletter campaign an admin has sent, for history in
-- the admin dashboard - not the subscribers themselves (see above).
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  sent_count INT DEFAULT 0,
  sent_by CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- In-app notifications (bell icon). Delivered live via Socket.IO when the
-- recipient is online, and always readable later from this table.
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Direct 1:1 conversations between any two users (client <-> expert, etc.)
CREATE TABLE IF NOT EXISTS conversations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_a_id CHAR(36) NOT NULL,
  user_b_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_pair (user_a_id, user_b_id),
  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- created_at uses microsecond precision for reliable message ordering,
-- same reasoning as ai_messages: UUID primary keys aren't sequential.
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- "Talk to an Expert" requests submitted from a plan's detail page. Public
-- (no login required) - identified by the name/email/whatsapp they type in,
-- not an account.
CREATE TABLE IF NOT EXISTS plan_inquiries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  plan_id CHAR(36) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  whatsapp VARCHAR(30) NOT NULL,
  message TEXT,
  -- Set when the inquiry is really a "book a site tour" request - optional,
  -- since the same form/endpoint covers both a general question and a
  -- scheduling request.
  preferred_date DATETIME NULL,
  status ENUM('new', 'contacted', 'closed') DEFAULT 'new',
  assigned_expert_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_expert_id) REFERENCES experts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- One review per (expert, reviewer) pair - submitting again updates the
-- existing review rather than creating a duplicate.
CREATE TABLE IF NOT EXISTS expert_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  expert_id CHAR(36) NOT NULL,
  reviewer_id CHAR(36) NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_review (expert_id, reviewer_id),
  FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- "Recent work" portfolio items an expert can add to their own profile.
CREATE TABLE IF NOT EXISTS expert_portfolio (
  id CHAR(36) NOT NULL PRIMARY KEY,
  expert_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- One review per (property, reviewer) pair - submitting again updates the
-- existing review rather than creating a duplicate. Mirrors expert_reviews.
CREATE TABLE IF NOT EXISTS property_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  property_id CHAR(36) NOT NULL,
  reviewer_id CHAR(36) NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_property_review (property_id, reviewer_id),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- One review per (plan, reviewer) pair - submitting again updates the
-- existing review rather than creating a duplicate. Mirrors expert_reviews.
CREATE TABLE IF NOT EXISTS plan_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  plan_id CHAR(36) NOT NULL,
  reviewer_id CHAR(36) NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_plan_review (plan_id, reviewer_id),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==SEED DATA BELOW== (migrate.js splits the file on this exact comment
-- to run column backfills between table creation and seeding - see its
-- comment for why that order matters)

-- Fixed test accounts for local development - real, loginable credentials
-- (unlike the placeholder sample users below). Fixed UUIDs + ON DUPLICATE
-- KEY UPDATE make this rigid by design: every `npm run migrate` resets
-- these three accounts back to exactly this role/password, so they're
-- always available for testing regardless of what's been done to them.
INSERT INTO users (id, full_name, email, password_hash, role, email_verified)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Samuel', 'samuelnizeyimana505@gmail.com',
    '$2a$10$6uwdzl7wjPeEYNf2Xd0u/el9SPS77UaRClukXLSitgD7jGdWKuxbW', 'admin', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'Sx Nizeyimana', 'sxnizeyimana@gmail.com',
    '$2a$10$5wfSe6vuk/tEFQmCa9eKAuRXRrV1.n19eXpRSreXyGGH/G36fU9sq', 'expert', TRUE),
  ('33333333-3333-3333-3333-333333333333', 'Kendo Lama', 'kendotlama12@gmail.com',
    '$2a$10$HQpWzpQFTt93tJge75GwGe7lVI1ghf4ML4M23Leap2bFloCHhHP7a', 'client', TRUE)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  email_verified = VALUES(email_verified);

-- Backing expert profile for the fixed engineer account above, so it shows
-- up properly in the Expert Directory instead of just being a bare login.
INSERT INTO experts
  (id, user_id, category, specialty, specialization, years_experience, is_verified, rating, review_count, completed_projects, avatar_url, city, view_count)
VALUES
  ('22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222',
   'engineer', 'Structural Engineer', 'Residential & Commercial', 8, TRUE, 5.0, 0, 0,
   'https://i.pravatar.cc/300?img=33', 'Kigali', 0)
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  specialty = VALUES(specialty);

-- Sample users backing the sample experts below
-- (password_hash is a placeholder - these aren't real, loginable accounts)
INSERT IGNORE INTO users (id, full_name, email, password_hash, role, email_verified)
VALUES
  (UUID(), 'Marie Uwase', 'marie.uwase@example.com', 'placeholder', 'expert', TRUE),
  (UUID(), 'Jean Bosco Mugabo', 'jean.mugabo@example.com', 'placeholder', 'expert', TRUE),
  (UUID(), 'Aisha Kamara', 'aisha.kamara@example.com', 'placeholder', 'expert', TRUE),
  (UUID(), 'Patrick Niyonzima', 'patrick.niyonzima@example.com', 'placeholder', 'expert', TRUE),
  (UUID(), 'Grace Mukamana', 'grace.mukamana@example.com', 'placeholder', 'expert', TRUE),
  (UUID(), 'Emmanuel Habimana', 'emmanuel.habimana@example.com', 'placeholder', 'expert', TRUE);

-- Sample verified experts
INSERT IGNORE INTO experts
  (id, user_id, category, specialty, specialization, years_experience, is_verified, rating, review_count, completed_projects, avatar_url, city, view_count)
VALUES
  (UUID(), (SELECT id FROM users WHERE email = 'marie.uwase@example.com'),
   'engineer', 'Structural Engineer', 'Residential & Commercial', 12, TRUE, 5.0, 47, 92,
   'https://i.pravatar.cc/300?img=47', 'Kigali', 892),
  (UUID(), (SELECT id FROM users WHERE email = 'jean.mugabo@example.com'),
   'architect', 'Architect', 'Modern Architecture', 15, TRUE, 4.9, 63, 118,
   'https://i.pravatar.cc/300?img=12', 'Kigali', 1043),
  (UUID(), (SELECT id FROM users WHERE email = 'aisha.kamara@example.com'),
   'engineer', 'Civil Engineer', 'Infrastructure & Roads', 10, TRUE, 5.0, 55, 85,
   'https://i.pravatar.cc/300?img=32', 'Kigali', 764),
  (UUID(), (SELECT id FROM users WHERE email = 'patrick.niyonzima@example.com'),
   'contractor', 'General Contractor', 'Residential Construction', 9, TRUE, 4.8, 71, 76,
   'https://i.pravatar.cc/300?img=51', 'Kigali', 621),
  (UUID(), (SELECT id FROM users WHERE email = 'grace.mukamana@example.com'),
   'interior_designer', 'Interior Designer', 'Modern Interiors', 7, TRUE, 4.9, 42, 58,
   'https://i.pravatar.cc/300?img=45', 'Kigali', 533),
  (UUID(), (SELECT id FROM users WHERE email = 'emmanuel.habimana@example.com'),
   'surveyor', 'Quantity Surveyor', 'Cost Estimation', 11, TRUE, 5.0, 28, 64,
   'https://i.pravatar.cc/300?img=13', 'Kigali', 407);

-- Sample data
-- Each image below is a real, geotagged Kigali/Rwanda photo (verified against
-- the location metadata on its Unsplash detail page - not just keyword search
-- relevance, which returns plenty of mismatched results). Every image_url in
-- this file is used on exactly one row; see the "duplicate image_url" check
-- in migrate.js, which fails the migration if that ever stops being true.
INSERT IGNORE INTO properties (id, title, description, property_type, price, city, district, size_sqm, bedrooms, bathrooms, image_url, view_count)
VALUES
  (UUID(), 'Modern 4-Bedroom House', 'Newly built family home with an open-plan living area and secure parking.', 'house', 85000000, 'Kigali', 'Gasabo', 350, 4, 3,
    'https://images.unsplash.com/photo-1565349479047-d6211d4efc90?w=800&q=80', 412),
  (UUID(), 'Luxury Villa with Pool', 'High-end villa with a private pool, landscaped garden, and staff quarters.', 'house', 150000000, 'Kigali', 'Nyarutarama', 600, 6, 5,
    'https://images.unsplash.com/photo-1756245994834-61974c290b61?w=800&q=80', 587),
  (UUID(), 'Prime Land - 0.8 Acres', 'Serviced land plot close to the main road, ready to build.', 'land', 45000000, 'Kigali', 'Gacuriro', 3237, NULL, NULL,
    'https://images.unsplash.com/photo-1727797716658-469836019c90?w=800&q=80', 203),
  (UUID(), 'Commercial Complex', 'Multi-unit commercial building suited for retail or office space.', 'commercial', 280000000, 'Kigali', 'Kimihurura', 1200, NULL, NULL,
    'https://images.unsplash.com/photo-1648708511872-5426c0f29c27?w=800&q=80', 298),
  (UUID(), 'Cozy 3-Bedroom Home', 'Comfortable starter home in a quiet residential neighborhood.', 'house', 52000000, 'Kigali', 'Remera', 220, 3, 2,
    'https://images.unsplash.com/photo-1708772565588-33785e13aa46?w=800&q=80', 156),
  (UUID(), 'Executive 5-Bedroom Villa', 'Spacious executive villa with a home office and rooftop terrace.', 'house', 120000000, 'Kigali', 'Kacyiru', 480, 5, 4,
    'https://images.unsplash.com/photo-1756245994882-cf32d49fde5a?w=800&q=80', 344);

-- Sample building plans
INSERT IGNORE INTO plans (id, title, plan_type, price, city, bedrooms, bathrooms, size_sqm, rating, badge, is_prime_location, image_url, view_count)
VALUES
  (UUID(), '4-Bedroom Family House', 'house', 58000000, 'Kimihurura', 4, 3, 280, 4.0, 'new', TRUE,
    'https://images.unsplash.com/photo-1708772565599-2c4e4b3ed9db?w=800&q=80', 298),
  (UUID(), 'Contemporary 3-Bedroom Villa', 'house', 62000000, 'Gacuriro', 3, 2, 240, 5.0, 'hot', FALSE,
    'https://images.unsplash.com/photo-1717960331841-a36791e8d2f5?w=800&q=80', 456),
  (UUID(), '1 Acre Prime Land', 'land', 55000000, 'Rusororo', NULL, NULL, 4047, 4.0, 'new', FALSE,
    'https://images.unsplash.com/photo-1779900275257-aaadab6d9285?w=800&q=80', 187),
  (UUID(), 'Compact 2-Bedroom Starter Home', 'house', 38000000, 'Nyamirambo', 2, 1, 140, 5.0, NULL, FALSE,
    'https://images.unsplash.com/photo-1756245994848-1eb2be3b9b63?w=800&q=80', 321),
  (UUID(), 'Commercial Building Plan', 'commercial', 180000000, 'City Center', NULL, NULL, 1500, 5.0, 'hot', TRUE,
    'https://images.unsplash.com/photo-1687986261123-b17f08f2796c?w=800&q=80', 209),
  (UUID(), 'Modern 1-Bedroom Apartment', 'apartment', 28000000, 'Kacyiru', 1, 1, 65, 4.5, NULL, TRUE,
    'https://images.unsplash.com/photo-1672597238213-fe76a82b50cb?w=800&q=80', 143),
  (UUID(), 'Duplex 6-Bedroom Family Home', 'house', 95000000, 'Nyarutarama', 6, 4, 420, 4.5, NULL, TRUE,
    'https://images.unsplash.com/photo-1689013398932-b576a11e07a1?w=800&q=80', 178),
  (UUID(), 'Half-Acre Residential Plot', 'land', 30000000, 'Bugesera', NULL, NULL, 2023, 3.5, NULL, FALSE,
    'https://images.unsplash.com/photo-1647891684895-15c5b831fde1?w=800&q=80', 92),
  (UUID(), 'Retail Storefront Plan', 'commercial', 65000000, 'Remera', NULL, NULL, 180, 4.0, NULL, FALSE,
    'https://images.unsplash.com/photo-1668875438994-4388304392ef?w=800&q=80', 118),
  (UUID(), 'Minimalist 2-Bedroom Bungalow', 'house', 42000000, 'Kimironko', 2, 2, 160, 4.5, 'new', FALSE,
    'https://images.unsplash.com/photo-1786795468102-84cd1ac41cd8?w=800&q=80', 205);

-- Sample client users, so the sample payments below have realistic payers
-- (password_hash is a placeholder - these aren't real, loginable accounts)
INSERT IGNORE INTO users (id, full_name, email, password_hash, role, email_verified)
VALUES
  (UUID(), 'David Nkusi', 'david.nkusi@example.com', 'placeholder', 'client', TRUE),
  (UUID(), 'Sarah Ingabire', 'sarah.ingabire@example.com', 'placeholder', 'client', TRUE);

-- Sample payments. No gateway is connected (see config/paymentProvider.js) -
-- these rows exist purely so the Payments dashboards have realistic sample
-- data to display instead of being empty on a fresh install.
-- Fixed UUIDs (not UUID()) so this seed is actually idempotent - see the
-- comment on the fixed test accounts above for why that matters. A business
-- rule like "one payment per (payer, purpose, amount, status)" would be
-- wrong here since real users legitimately can pay for the same thing
-- twice, so a schema-level UNIQUE constraint isn't the right fix for this
-- table the way it was for properties/plans/experts.
INSERT IGNORE INTO payments (id, payer_id, recipient_type, recipient_id, amount, purpose, status, created_at)
VALUES
  ('44444444-4444-4444-4444-444444444441', (SELECT id FROM users WHERE email = 'david.nkusi@example.com'), 'expert',
   (SELECT e.id FROM experts e JOIN users u ON e.user_id = u.id WHERE u.email = 'marie.uwase@example.com'),
   45000, 'expert_consultation', 'completed', DATE_SUB(NOW(), INTERVAL 12 DAY)),
  ('44444444-4444-4444-4444-444444444442', (SELECT id FROM users WHERE email = 'sarah.ingabire@example.com'), 'expert',
   (SELECT e.id FROM experts e JOIN users u ON e.user_id = u.id WHERE u.email = 'jean.mugabo@example.com'),
   60000, 'expert_consultation', 'completed', DATE_SUB(NOW(), INTERVAL 8 DAY)),
  ('44444444-4444-4444-4444-444444444443', (SELECT id FROM users WHERE email = 'david.nkusi@example.com'), 'platform', NULL,
   15000, 'priority_review', 'completed', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  ('44444444-4444-4444-4444-444444444444', (SELECT id FROM users WHERE email = 'sarah.ingabire@example.com'), 'platform', NULL,
   25000, 'listing_boost', 'pending', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  ('44444444-4444-4444-4444-444444444445', (SELECT id FROM users WHERE email = 'david.nkusi@example.com'), 'expert',
   (SELECT e.id FROM experts e JOIN users u ON e.user_id = u.id WHERE u.email = 'emmanuel.habimana@example.com'),
   35000, 'expert_consultation', 'pending', DATE_SUB(NOW(), INTERVAL 1 DAY));
