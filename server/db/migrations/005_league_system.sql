-- League system upgrade: settings, roles, notifications
USE yamb;

ALTER TABLE leagues
  ADD COLUMN description TEXT NULL AFTER season,
  ADD COLUMN status ENUM('ACTIVE', 'FINISHED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE' AFTER description,
  ADD COLUMN invite_code VARCHAR(8) NULL AFTER status,
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE AFTER invite_code,
  ADD COLUMN max_members TINYINT UNSIGNED NOT NULL DEFAULT 50 AFTER is_public,
  ADD COLUMN image_url VARCHAR(500) NULL AFTER max_members,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD COLUMN archived_at TIMESTAMP NULL AFTER updated_at;

UPDATE leagues SET invite_code = UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 8)) WHERE invite_code IS NULL;

ALTER TABLE leagues
  MODIFY COLUMN invite_code VARCHAR(8) NOT NULL,
  ADD UNIQUE KEY uq_leagues_invite_code (invite_code);

ALTER TABLE league_members
  ADD COLUMN role ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER' AFTER user_id;

UPDATE league_members lm
INNER JOIN leagues l ON l.id = lm.league_id AND l.created_by = lm.user_id
SET lm.role = 'OWNER';

CREATE TABLE IF NOT EXISTS league_notifications (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  league_id   VARCHAR(36) NOT NULL,
  type        VARCHAR(50) NOT NULL,
  message     VARCHAR(500) NOT NULL,
  actor_user_id VARCHAR(36) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_league_notifications_league FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  CONSTRAINT fk_league_notifications_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_league_notifications_league (league_id, created_at)
) ENGINE=InnoDB;
