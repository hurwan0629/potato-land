import { Star } from "lucide-react";

export default function RatingStar({ rating = 0, size = 14, max = 5 }) {
  const filledCount = Math.round(Math.min(Math.max(rating, 0), max));

  return (
    <div className="rating-star" aria-label={`${rating} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < filledCount ? "#F5B039" : "none"}
          color="#F5B039"
        />
      ))}
    </div>
  );
}
