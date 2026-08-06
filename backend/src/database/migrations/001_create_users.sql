DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  idx BIGSERIAL PRIMARY KEY,
  login_id VARCHAR(50) NOT NULL CONSTRAINT uq_users_login_id UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  nickname VARCHAR(50) NOT NULL CONSTRAINT uq_users_nickname UNIQUE,
  phone VARCHAR(30) NOT NULL CONSTRAINT uq_users_phone UNIQUE,
  email VARCHAR(255) CONSTRAINT uq_users_email UNIQUE,
  profile_image VARCHAR(2048),
  bio VARCHAR(255),
  role user_role NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  banned_at TIMESTAMPTZ,
  banned_until TIMESTAMPTZ,
  ban_reason TEXT,
  admin_memo TEXT
);
