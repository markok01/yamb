-- Migration 002: dice mode, stats, state version
USE yamb;

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS dice_mode ENUM('VIRTUAL','PHYSICAL') NOT NULL DEFAULT 'VIRTUAL',
  ADD COLUMN IF NOT EXISTS state_version INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS player_stats (
  user_id        VARCHAR(36)  NOT NULL PRIMARY KEY,
  games_played   INT          NOT NULL DEFAULT 0,
  games_won      INT          NOT NULL DEFAULT 0,
  games_lost     INT          NOT NULL DEFAULT 0,
  total_score    INT          NOT NULL DEFAULT 0,
  average_score  INT          NOT NULL DEFAULT 0,
  best_score     INT          NULL,
  worst_score    INT          NULL,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_player_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS player_combination_stats (
  user_id        VARCHAR(36)  NOT NULL,
  combination    ENUM('KENTA','TRILING','FUL','POKER','JAMB') NOT NULL,
  count_success  INT          NOT NULL DEFAULT 0,
  count_failed   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, combination),
  CONSTRAINT fk_combo_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
