create unique index if not exists game_box_score_lines_game_source_line_key_uidx
on public.game_box_score_lines (game_id, source_line_key);
