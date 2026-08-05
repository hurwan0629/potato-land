INSERT INTO categories (idx, name, sort_order, is_active)
VALUES
  (1, '의류', 1, TRUE),
  (2, '전자기기', 2, TRUE),
  (3, '뷰티', 3, TRUE),
  (4, '반려동물 용품', 4, TRUE),
  (5, '도서', 5, TRUE),
  (6, '악세사리', 6, TRUE),
  (7, '신발', 7, TRUE),
  (8, '헬스', 8, TRUE)
ON CONFLICT (idx) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

SELECT setval(
  pg_get_serial_sequence('categories', 'idx'),
  (SELECT MAX(idx) FROM categories),
  TRUE
);
