-- The drawings saved from the wall on X. Their images are in R2, under
-- `drawings/<id>`. A hidden one stays out of the gallery.
CREATE TABLE drawings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX drawings_newest ON drawings (hidden, created DESC, id DESC);
