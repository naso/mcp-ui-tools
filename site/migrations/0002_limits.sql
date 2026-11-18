-- What the gallery holds, kept up to date as drawings come and go, so its
-- limits and its count are read from one row rather than counted each time.
-- `size` is each image's bytes; the ones saved before it are taken as 0.
ALTER TABLE drawings ADD COLUMN size INTEGER NOT NULL DEFAULT 0;

CREATE TABLE totals (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  shown INTEGER NOT NULL,
  bytes INTEGER NOT NULL
);

INSERT INTO totals (id, shown, bytes)
SELECT
  1,
  (SELECT COUNT(*) FROM drawings WHERE hidden = 0),
  (SELECT COALESCE(SUM(size), 0) FROM drawings);

CREATE TRIGGER drawings_added AFTER INSERT ON drawings
BEGIN
  UPDATE totals
  SET shown = shown + (NEW.hidden = 0), bytes = bytes + NEW.size
  WHERE id = 1;
END;

CREATE TRIGGER drawings_shown AFTER UPDATE OF hidden ON drawings
BEGIN
  UPDATE totals
  SET shown = shown + (NEW.hidden = 0) - (OLD.hidden = 0)
  WHERE id = 1;
END;

CREATE TRIGGER drawings_removed AFTER DELETE ON drawings
BEGIN
  UPDATE totals
  SET shown = shown - (OLD.hidden = 0), bytes = bytes - OLD.size
  WHERE id = 1;
END;

-- For how many were saved in the last day.
CREATE INDEX drawings_created ON drawings (created);
