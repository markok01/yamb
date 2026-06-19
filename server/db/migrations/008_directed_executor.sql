-- Dirigovani potez: tačno koji igrač (sledeći) mora da izvrši
ALTER TABLE games
  ADD COLUMN directed_executor_game_player_id VARCHAR(36) NULL AFTER director_game_player_id;
