-- Faza 3: Auth, opponent history, leagues
USE yamb;

ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER username,
  ADD COLUMN avatar_url VARCHAR(500) NULL AFTER display_name;

CREATE TABLE IF NOT EXISTS opponent_stats (
  user_id           VARCHAR(36) NOT NULL,
  opponent_id       VARCHAR(36) NOT NULL,
  matches_played    INT NOT NULL DEFAULT 0,
  wins              INT NOT NULL DEFAULT 0,
  losses            INT NOT NULL DEFAULT 0,
  draws             INT NOT NULL DEFAULT 0,
  total_my_score    INT NOT NULL DEFAULT 0,
  total_opponent_score INT NOT NULL DEFAULT 0,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, opponent_id),
  CONSTRAINT fk_opponent_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_opponent_stats_opponent FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leagues (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  season      VARCHAR(50) NOT NULL,
  created_by  VARCHAR(36) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leagues_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS league_members (
  league_id   VARCHAR(36) NOT NULL,
  user_id     VARCHAR(36) NOT NULL,
  joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (league_id, user_id),
  CONSTRAINT fk_league_members_league FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  CONSTRAINT fk_league_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS league_matches (
  league_id   VARCHAR(36) NOT NULL,
  game_id     VARCHAR(36) NOT NULL,
  added_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (league_id, game_id),
  UNIQUE KEY uq_league_matches_game (game_id),
  CONSTRAINT fk_league_matches_league FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  CONSTRAINT fk_league_matches_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB;
