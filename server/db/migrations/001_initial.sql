-- YAMB MySQL Schema (Faza 2)
-- Run: mysql -u root -p < server/db/migrations/001_initial.sql

CREATE DATABASE IF NOT EXISTS yamb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE yamb;

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  display_name  VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS games (
  id                    VARCHAR(36)  NOT NULL PRIMARY KEY,
  room_code             VARCHAR(8)   NOT NULL UNIQUE,
  status                ENUM('LOBBY','IN_PROGRESS','FINISHED','CANCELLED') NOT NULL DEFAULT 'LOBBY',
  max_players           TINYINT UNSIGNED NOT NULL DEFAULT 6,
  current_player_index  TINYINT UNSIGNED NULL,
  host_user_id          VARCHAR(36)  NOT NULL,
  winner_user_id        VARCHAR(36)  NULL,
  dice_mode             ENUM('VIRTUAL','PHYSICAL') NOT NULL DEFAULT 'VIRTUAL',
  state_version         INT          NOT NULL DEFAULT 0,
  started_at            TIMESTAMP    NULL,
  finished_at           TIMESTAMP    NULL,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_games_host FOREIGN KEY (host_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS game_players (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  game_id     VARCHAR(36)  NOT NULL,
  user_id     VARCHAR(36)  NOT NULL,
  seat_order  TINYINT UNSIGNED NOT NULL,
  final_score INT          NULL,
  placement   TINYINT UNSIGNED NULL,
  joined_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_game_players_game_user (game_id, user_id),
  UNIQUE KEY uq_game_players_game_seat (game_id, seat_order),
  CONSTRAINT fk_game_players_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_game_players_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS score_entries (
  id               VARCHAR(36)  NOT NULL PRIMARY KEY,
  game_player_id   VARCHAR(36)  NOT NULL,
  column_type      ENUM('REDOVNA','PREKOREDA','OBRNUTA','NAJAVA','RUCNA','DOJAVA','DVOSTRUKA','UKRSTENA','OBAVEZNA','MAKSIMALNA') NOT NULL,
  row_key          ENUM('ROW_1','ROW_2','ROW_3','ROW_4','ROW_5','ROW_6','MAXIMUM','MINIMUM','KENTA','TRILING','FUL','POKER','JAMB') NOT NULL,
  score            INT          NOT NULL,
  dice_snapshot    JSON         NOT NULL,
  is_manual        BOOLEAN      NOT NULL DEFAULT FALSE,
  is_najava        BOOLEAN      NOT NULL DEFAULT FALSE,
  dojava_accepted  BOOLEAN      NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_score_entry_cell (game_player_id, column_type, row_key),
  CONSTRAINT fk_score_entries_player FOREIGN KEY (game_player_id) REFERENCES game_players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS turns (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  game_id         VARCHAR(36)  NOT NULL,
  game_player_id  VARCHAR(36)  NOT NULL,
  column_type     ENUM('REDOVNA','PREKOREDA','OBRNUTA','NAJAVA','RUCNA','DOJAVA','DVOSTRUKA','UKRSTENA','OBAVEZNA','MAKSIMALNA') NOT NULL,
  najava_row_key  ENUM('ROW_1','ROW_2','ROW_3','ROW_4','ROW_5','ROW_6','MAXIMUM','MINIMUM','KENTA','TRILING','FUL','POKER','JAMB') NULL,
  roll_count      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  dice            JSON         NOT NULL,
  held_dice       JSON         NOT NULL,
  status          ENUM('ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  started_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP    NULL,
  CONSTRAINT fk_turns_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_turns_player FOREIGN KEY (game_player_id) REFERENCES game_players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roll_events (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  turn_id      VARCHAR(36)  NOT NULL,
  roll_number  TINYINT UNSIGNED NOT NULL,
  dice         JSON         NOT NULL,
  held_before  JSON         NOT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roll_events (turn_id, roll_number),
  CONSTRAINT fk_roll_events_turn FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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
