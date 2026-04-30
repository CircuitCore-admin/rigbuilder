-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS', 'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS');

-- CreateEnum
CREATE TYPE "ProductSubcategory" AS ENUM ('DIRECT_DRIVE', 'BELT_DRIVE', 'GEAR_DRIVE', 'POTENTIOMETER', 'LOAD_CELL', 'HYDRAULIC', 'SEQUENTIAL', 'H_PATTERN', 'DUAL_MODE', 'MONITOR', 'VR_HEADSET', 'BUCKET', 'GT_STYLE', 'OEM', 'BASS_SHAKER', 'BUTTON_BOX', 'HANDBRAKE', 'KEYBOARD_TRAY', 'CABLE_MANAGEMENT');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('PC', 'PLAYSTATION', 'XBOX');

-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('DESK', 'DEDICATED_ROOM', 'SHARED_ROOM', 'COCKPIT_ONLY');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('FORMULA', 'GT', 'RALLY', 'DRIFT', 'OVAL', 'TRUCK', 'MULTI');

-- CreateEnum
CREATE TYPE "CompatibilityStatus" AS ENUM ('CONFIRMED', 'REPORTED_ISSUE', 'INCOMPATIBLE');

-- CreateEnum
CREATE TYPE "CompatibilitySeverity" AS ENUM ('OK', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN', 'MANUFACTURER', 'CREATOR');

-- CreateEnum
CREATE TYPE "ForumCategory" AS ENUM ('BUILD_ADVICE', 'DIY_MODS', 'SHOWROOM', 'TELEMETRY', 'DEALS', 'GENERAL', 'TROUBLESHOOTING');

-- CreateEnum
CREATE TYPE "GuideCategory" AS ENUM ('BEGINNER', 'BUYING', 'MAINTENANCE', 'SETUP', 'DIY', 'COMPARISON', 'TUTORIAL');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('FIRST_POST', 'TEN_POSTS', 'FIFTY_POSTS', 'FIRST_REPLY', 'HELPFUL', 'SUPER_HELPFUL', 'TOP_CONTRIBUTOR', 'VERIFIED_OWNER', 'EXPERT', 'FIRST_SALE', 'FIVE_SALES', 'TRUSTED_SELLER', 'FIRST_PURCHASE', 'BIG_SPENDER', 'POPULAR', 'INFLUENCER', 'EARLY_ADOPTER', 'VERIFIED_EMAIL', 'PROFILE_COMPLETE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REPLY', 'MENTION', 'FOLLOW', 'NEW_FOLLOWER', 'QUESTION_ANSWERED', 'PRICE_ALERT');

-- CreateEnum
CREATE TYPE "MarketplaceListingType" AS ENUM ('SELLING', 'LOOKING_FOR', 'TRADING');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'FOR_PARTS');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('GBP', 'EUR', 'USD');

-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('FIXED', 'NEGOTIABLE', 'OPEN_TO_OFFERS', 'AUCTION');

-- CreateEnum
CREATE TYPE "ShippingOption" AS ENUM ('LOCAL_PICKUP', 'NATIONAL_SHIPPING', 'INTERNATIONAL_SHIPPING');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'RESERVED', 'SOLD', 'FOUND', 'EXPIRED', 'REMOVED_BY_MOD');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SCAM_FRAUDULENT', 'PROHIBITED_ITEM', 'MISLEADING_DESCRIPTION', 'DUPLICATE_LISTING', 'OFFENSIVE_CONTENT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED_APPROVED', 'REVIEWED_REMOVED');

-- CreateEnum
CREATE TYPE "MarketplaceNotificationType" AS ENUM ('NEW_OFFER', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'OFFER_EXPIRED', 'NEW_MESSAGE', 'LISTING_MATCH', 'LISTING_EXPIRING_SOON', 'LISTING_EXPIRED', 'LISTING_REPORTED', 'LISTING_REMOVED', 'REVIEW_RECEIVED', 'PRICE_DROP');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "banner_url" TEXT,
    "banner_color" TEXT DEFAULT '#1a1a2e',
    "discord_username" TEXT,
    "profile_visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "is_pro" BOOLEAN NOT NULL DEFAULT false,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "pit_cred" INTEGER NOT NULL DEFAULT 0,
    "seller_rating" DOUBLE PRECISION,
    "seller_review_count" INTEGER NOT NULL DEFAULT 0,
    "completed_sales" INTEGER NOT NULL DEFAULT 0,
    "avg_response_minutes" INTEGER,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_token" TEXT,
    "email_verify_expiry" TIMESTAMP(3),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "digest_frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "last_digest_sent_at" TIMESTAMP(3),
    "password_reset_token" TEXT,
    "password_reset_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "subcategory" "ProductSubcategory",
    "specs" JSONB NOT NULL,
    "release_year" INTEGER,
    "weight" DOUBLE PRECISION,
    "dimensions" JSONB,
    "platforms" "Platform"[] DEFAULT ARRAY[]::"Platform"[],
    "affiliate_links" JSONB,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avg_rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "build_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "builds" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "space_type" "SpaceType",
    "disciplines" "Discipline"[] DEFAULT ARRAY[]::"Discipline"[],
    "platforms" "Platform"[] DEFAULT ARRAY[]::"Platform"[],
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratings" JSONB,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_parts" (
    "id" TEXT NOT NULL,
    "build_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "category_slot" "ProductCategory" NOT NULL,
    "price_paid" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "build_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "rating_overall" DOUBLE PRECISION NOT NULL,
    "sub_ratings" JSONB,
    "ownership_duration" TEXT,
    "upgraded_from_product_id" TEXT,
    "pros" TEXT NOT NULL,
    "cons" TEXT NOT NULL,
    "would_buy_again" BOOLEAN NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compatibility_links" (
    "id" TEXT NOT NULL,
    "product_a_id" TEXT NOT NULL,
    "product_b_id" TEXT NOT NULL,
    "status" "CompatibilityStatus" NOT NULL,
    "severity" "CompatibilitySeverity" NOT NULL DEFAULT 'OK',
    "reason" TEXT,
    "confirmed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compatibility_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upgrade_paths" (
    "id" TEXT NOT NULL,
    "from_product_id" TEXT NOT NULL,
    "to_product_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "avg_satisfaction_delta" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "upgrade_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "commentable_type" TEXT NOT NULL,
    "commentable_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upvotes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "upvoteable_type" TEXT NOT NULL,
    "upvoteable_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_threads" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "category" "ForumCategory" NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "flair" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_replies" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parent_id" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_votes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reply_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "forum_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_votes" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "category" "GuideCategory" NOT NULL,
    "cover_image" TEXT,
    "author_id" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "product_mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_title" TEXT,
    "seo_description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "cover_image" TEXT,
    "author_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "badge" "BadgeType" NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_followers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_followers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "thread_id" TEXT,
    "reply_id" TEXT,
    "actor_id" TEXT,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "MarketplaceListingType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "condition" "ItemCondition",
    "price" DECIMAL(10,2),
    "minimum_offer" DECIMAL(10,2),
    "currency" "Currency" NOT NULL DEFAULT 'GBP',
    "pricing_type" "PricingType" NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "shipping_options" "ShippingOption"[],
    "discord_username" TEXT,
    "product_id" TEXT,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "premium_until" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "wishlist_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_offers" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "message" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "decrypted_body" TEXT,
    "is_decrypted" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_reports" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_reviews" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "MarketplaceNotificationType" NOT NULL,
    "listing_id" TEXT,
    "reference_id" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlisted_listings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlisted_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_polls" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_poll_options" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "forum_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_poll_votes" (
    "id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "followed_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_questions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_answers" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "target_price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "triggered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at" DESC);

-- CreateIndex
CREATE INDEX "users_pit_cred_idx" ON "users"("pit_cred" DESC);

-- CreateIndex
CREATE INDEX "users_seller_rating_idx" ON "users"("seller_rating" DESC);

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_manufacturer_idx" ON "products"("manufacturer");

-- CreateIndex
CREATE INDEX "products_category_manufacturer_idx" ON "products"("category", "manufacturer");

-- CreateIndex
CREATE INDEX "products_avg_rating_idx" ON "products"("avg_rating" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "builds_slug_key" ON "builds"("slug");

-- CreateIndex
CREATE INDEX "builds_user_id_idx" ON "builds"("user_id");

-- CreateIndex
CREATE INDEX "builds_slug_idx" ON "builds"("slug");

-- CreateIndex
CREATE INDEX "builds_is_public_upvote_count_idx" ON "builds"("is_public", "upvote_count" DESC);

-- CreateIndex
CREATE INDEX "builds_is_public_created_at_idx" ON "builds"("is_public", "created_at" DESC);

-- CreateIndex
CREATE INDEX "builds_user_id_created_at_idx" ON "builds"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "build_parts_build_id_idx" ON "build_parts"("build_id");

-- CreateIndex
CREATE INDEX "build_parts_product_id_idx" ON "build_parts"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "build_parts_build_id_category_slot_key" ON "build_parts"("build_id", "category_slot");

-- CreateIndex
CREATE INDEX "reviews_product_id_rating_overall_idx" ON "reviews"("product_id", "rating_overall" DESC);

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_product_id_key" ON "reviews"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "compatibility_links_product_a_id_idx" ON "compatibility_links"("product_a_id");

-- CreateIndex
CREATE INDEX "compatibility_links_product_b_id_idx" ON "compatibility_links"("product_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "compatibility_links_product_a_id_product_b_id_key" ON "compatibility_links"("product_a_id", "product_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "upgrade_paths_from_product_id_to_product_id_key" ON "upgrade_paths"("from_product_id", "to_product_id");

-- CreateIndex
CREATE INDEX "comments_commentable_type_commentable_id_idx" ON "comments"("commentable_type", "commentable_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "upvotes_upvoteable_type_upvoteable_id_idx" ON "upvotes"("upvoteable_type", "upvoteable_id");

-- CreateIndex
CREATE UNIQUE INDEX "upvotes_user_id_upvoteable_type_upvoteable_id_key" ON "upvotes"("user_id", "upvoteable_type", "upvoteable_id");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_user_id_product_id_key" ON "wishlist_items"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "price_history_product_id_recorded_at_idx" ON "price_history"("product_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "price_history_product_id_currency_idx" ON "price_history"("product_id", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "forum_threads_slug_key" ON "forum_threads"("slug");

-- CreateIndex
CREATE INDEX "forum_threads_category_created_at_idx" ON "forum_threads"("category", "created_at" DESC);

-- CreateIndex
CREATE INDEX "forum_threads_product_id_idx" ON "forum_threads"("product_id");

-- CreateIndex
CREATE INDEX "forum_threads_user_id_idx" ON "forum_threads"("user_id");

-- CreateIndex
CREATE INDEX "forum_threads_slug_idx" ON "forum_threads"("slug");

-- CreateIndex
CREATE INDEX "forum_threads_category_is_pinned_created_at_idx" ON "forum_threads"("category", "is_pinned" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "forum_threads_user_id_created_at_idx" ON "forum_threads"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "forum_threads_category_view_count_idx" ON "forum_threads"("category", "view_count" DESC);

-- CreateIndex
CREATE INDEX "forum_threads_category_reply_count_idx" ON "forum_threads"("category", "reply_count" DESC);

-- CreateIndex
CREATE INDEX "forum_threads_is_anonymous_user_id_idx" ON "forum_threads"("is_anonymous", "user_id");

-- CreateIndex
CREATE INDEX "forum_replies_thread_id_created_at_idx" ON "forum_replies"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "forum_replies_user_id_idx" ON "forum_replies"("user_id");

-- CreateIndex
CREATE INDEX "forum_replies_thread_id_parent_id_created_at_idx" ON "forum_replies"("thread_id", "parent_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "forum_votes_user_id_reply_id_key" ON "forum_votes"("user_id", "reply_id");

-- CreateIndex
CREATE INDEX "thread_votes_thread_id_idx" ON "thread_votes"("thread_id");

-- CreateIndex
CREATE INDEX "thread_votes_user_id_idx" ON "thread_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "thread_votes_thread_id_user_id_key" ON "thread_votes"("thread_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "guides_slug_key" ON "guides"("slug");

-- CreateIndex
CREATE INDEX "guides_slug_idx" ON "guides"("slug");

-- CreateIndex
CREATE INDEX "guides_category_is_published_idx" ON "guides"("category", "is_published");

-- CreateIndex
CREATE INDEX "guides_author_id_idx" ON "guides"("author_id");

-- CreateIndex
CREATE INDEX "guides_status_idx" ON "guides"("status");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_is_published_published_at_idx" ON "blog_posts"("is_published", "published_at" DESC);

-- CreateIndex
CREATE INDEX "blog_posts_category_is_published_idx" ON "blog_posts"("category", "is_published");

-- CreateIndex
CREATE INDEX "blog_posts_author_id_idx" ON "blog_posts"("author_id");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_key" ON "user_badges"("user_id", "badge");

-- CreateIndex
CREATE INDEX "thread_followers_thread_id_idx" ON "thread_followers"("thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "thread_followers_user_id_thread_id_key" ON "thread_followers"("user_id", "thread_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "marketplace_listings_user_id_idx" ON "marketplace_listings"("user_id");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_created_at_idx" ON "marketplace_listings"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "marketplace_listings_category_idx" ON "marketplace_listings"("category");

-- CreateIndex
CREATE INDEX "marketplace_listings_type_status_idx" ON "marketplace_listings"("type", "status");

-- CreateIndex
CREATE INDEX "marketplace_listings_product_id_idx" ON "marketplace_listings"("product_id");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_category_idx" ON "marketplace_listings"("status", "category");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_type_idx" ON "marketplace_listings"("status", "type");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_condition_idx" ON "marketplace_listings"("status", "condition");

-- CreateIndex
CREATE INDEX "marketplace_listings_user_id_status_idx" ON "marketplace_listings"("user_id", "status");

-- CreateIndex
CREATE INDEX "marketplace_listings_user_id_created_at_idx" ON "marketplace_listings"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "marketplace_listings_category_status_created_at_idx" ON "marketplace_listings"("category", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "marketplace_listings_status_price_idx" ON "marketplace_listings"("status", "price");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_view_count_idx" ON "marketplace_listings"("status", "view_count" DESC);

-- CreateIndex
CREATE INDEX "marketplace_offers_listing_id_idx" ON "marketplace_offers"("listing_id");

-- CreateIndex
CREATE INDEX "marketplace_offers_user_id_idx" ON "marketplace_offers"("user_id");

-- CreateIndex
CREATE INDEX "marketplace_offers_listing_id_status_idx" ON "marketplace_offers"("listing_id", "status");

-- CreateIndex
CREATE INDEX "marketplace_offers_user_id_status_idx" ON "marketplace_offers"("user_id", "status");

-- CreateIndex
CREATE INDEX "marketplace_messages_conversation_id_idx" ON "marketplace_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "marketplace_messages_listing_id_idx" ON "marketplace_messages"("listing_id");

-- CreateIndex
CREATE INDEX "marketplace_messages_sender_id_idx" ON "marketplace_messages"("sender_id");

-- CreateIndex
CREATE INDEX "marketplace_messages_recipient_id_idx" ON "marketplace_messages"("recipient_id");

-- CreateIndex
CREATE INDEX "marketplace_messages_sender_id_created_at_idx" ON "marketplace_messages"("sender_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "marketplace_messages_recipient_id_read_at_idx" ON "marketplace_messages"("recipient_id", "read_at");

-- CreateIndex
CREATE INDEX "marketplace_messages_conversation_id_created_at_idx" ON "marketplace_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "marketplace_reports_listing_id_idx" ON "marketplace_reports"("listing_id");

-- CreateIndex
CREATE INDEX "marketplace_reports_status_idx" ON "marketplace_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_reports_reporter_id_listing_id_key" ON "marketplace_reports"("reporter_id", "listing_id");

-- CreateIndex
CREATE INDEX "marketplace_reviews_seller_id_idx" ON "marketplace_reviews"("seller_id");

-- CreateIndex
CREATE INDEX "marketplace_reviews_listing_id_idx" ON "marketplace_reviews"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_reviews_reviewer_id_listing_id_key" ON "marketplace_reviews"("reviewer_id", "listing_id");

-- CreateIndex
CREATE INDEX "marketplace_notifications_user_id_read_idx" ON "marketplace_notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "marketplace_notifications_created_at_idx" ON "marketplace_notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "marketplace_notifications_user_id_created_at_idx" ON "marketplace_notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wishlisted_listings_user_id_idx" ON "wishlisted_listings"("user_id");

-- CreateIndex
CREATE INDEX "wishlisted_listings_listing_id_idx" ON "wishlisted_listings"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "wishlisted_listings_user_id_listing_id_key" ON "wishlisted_listings"("user_id", "listing_id");

-- CreateIndex
CREATE INDEX "user_blocks_blocker_id_idx" ON "user_blocks"("blocker_id");

-- CreateIndex
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blocker_id_blocked_id_key" ON "user_blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_polls_thread_id_key" ON "forum_polls"("thread_id");

-- CreateIndex
CREATE INDEX "forum_poll_options_poll_id_idx" ON "forum_poll_options"("poll_id");

-- CreateIndex
CREATE INDEX "forum_poll_votes_user_id_idx" ON "forum_poll_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_poll_votes_option_id_user_id_key" ON "forum_poll_votes"("option_id", "user_id");

-- CreateIndex
CREATE INDEX "user_follows_follower_id_idx" ON "user_follows"("follower_id");

-- CreateIndex
CREATE INDEX "user_follows_followed_id_idx" ON "user_follows"("followed_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_follower_id_followed_id_key" ON "user_follows"("follower_id", "followed_id");

-- CreateIndex
CREATE INDEX "product_questions_product_id_created_at_idx" ON "product_questions"("product_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "product_answers_question_id_idx" ON "product_answers"("question_id");

-- CreateIndex
CREATE INDEX "price_alerts_product_id_triggered_idx" ON "price_alerts"("product_id", "triggered");

-- CreateIndex
CREATE UNIQUE INDEX "price_alerts_user_id_product_id_key" ON "price_alerts"("user_id", "product_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_parts" ADD CONSTRAINT "build_parts_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_parts" ADD CONSTRAINT "build_parts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_upgraded_from_product_id_fkey" FOREIGN KEY ("upgraded_from_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_links" ADD CONSTRAINT "compatibility_links_product_a_id_fkey" FOREIGN KEY ("product_a_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_links" ADD CONSTRAINT "compatibility_links_product_b_id_fkey" FOREIGN KEY ("product_b_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_links" ADD CONSTRAINT "compatibility_links_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrade_paths" ADD CONSTRAINT "upgrade_paths_from_product_id_fkey" FOREIGN KEY ("from_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrade_paths" ADD CONSTRAINT "upgrade_paths_to_product_id_fkey" FOREIGN KEY ("to_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_commentable_id_fkey" FOREIGN KEY ("commentable_id") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_upvoteable_id_fkey" FOREIGN KEY ("upvoteable_id") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "forum_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "forum_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_votes" ADD CONSTRAINT "thread_votes_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_votes" ADD CONSTRAINT "thread_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_followers" ADD CONSTRAINT "thread_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_followers" ADD CONSTRAINT "thread_followers_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_offers" ADD CONSTRAINT "marketplace_offers_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_offers" ADD CONSTRAINT "marketplace_offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_notifications" ADD CONSTRAINT "marketplace_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_notifications" ADD CONSTRAINT "marketplace_notifications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlisted_listings" ADD CONSTRAINT "wishlisted_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlisted_listings" ADD CONSTRAINT "wishlisted_listings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_polls" ADD CONSTRAINT "forum_polls_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_poll_options" ADD CONSTRAINT "forum_poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "forum_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_poll_votes" ADD CONSTRAINT "forum_poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "forum_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_poll_votes" ADD CONSTRAINT "forum_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_answers" ADD CONSTRAINT "product_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "product_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_answers" ADD CONSTRAINT "product_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

