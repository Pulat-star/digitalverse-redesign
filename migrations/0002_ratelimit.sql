-- So'rovlarni IP bo'yicha cheklash uchun hisoblagich.
-- Kalit: "<nom>:<ip>:<oyna>" — oyna tugagach yozuv eskiradi va tozalanadi.
CREATE TABLE IF NOT EXISTS rate_limits (
  k   TEXT PRIMARY KEY,
  n   INTEGER NOT NULL DEFAULT 0,
  exp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_exp ON rate_limits(exp);
