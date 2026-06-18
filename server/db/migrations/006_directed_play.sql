-- Dirigovana (D): direktor najavljuje polje, sledeći igrač baca i upisuje u D direktora
USE yamb;

ALTER TABLE games
  ADD COLUMN directed_row_key ENUM(
    'ROW_1','ROW_2','ROW_3','ROW_4','ROW_5','ROW_6',
    'MAXIMUM','MINIMUM','KENTA','TRILING','FUL','POKER','JAMB'
  ) NULL AFTER state_version,
  ADD COLUMN director_game_player_id VARCHAR(36) NULL AFTER directed_row_key,
  ADD CONSTRAINT fk_games_director_player
    FOREIGN KEY (director_game_player_id) REFERENCES game_players(id) ON DELETE SET NULL;
