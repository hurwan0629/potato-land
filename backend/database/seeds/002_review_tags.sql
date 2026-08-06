INSERT INTO review_tags (idx, label, sentiment, sort_order, is_active)
VALUES
  (1, '친절해요', 'STRENGTH', 1, TRUE),
  (2, '응답이 빨라요', 'STRENGTH', 2, TRUE),
  (3, '약속을 잘 지켜요', 'STRENGTH', 3, TRUE),
  (4, '상품 설명이 정확해요', 'STRENGTH', 4, TRUE),
  (5, '시간 약속이 아쉬워요', 'WEAKNESS', 1, TRUE),
  (6, '응답이 느려요', 'WEAKNESS', 2, TRUE),
  (7, '상품 설명과 달라요', 'WEAKNESS', 3, TRUE)
ON CONFLICT (idx) DO UPDATE
SET label = EXCLUDED.label,
    sentiment = EXCLUDED.sentiment,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

SELECT setval(
  pg_get_serial_sequence('review_tags', 'idx'),
  (SELECT MAX(idx) FROM review_tags),
  TRUE
);
