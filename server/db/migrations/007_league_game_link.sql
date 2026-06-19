-- Liga mečevi: partija vezan za ligu, statistika samo u ligi
ALTER TABLE games
  ADD COLUMN league_id VARCHAR(36) NULL AFTER host_user_id;

ALTER TABLE games
  ADD CONSTRAINT fk_games_league
    FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE SET NULL;

CREATE INDEX idx_games_league_id ON games (league_id);
