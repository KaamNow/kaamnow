import { Star } from "lucide-react";
import { useState } from "react";

export default function StarRating({ rating, setRating, max = 5 }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            className="focus:outline-none transition-transform hover:scale-110"
            onClick={() => setRating(starValue)}
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              size={28}
              className={`${
                starValue <= (hover || rating)
                  ? "fill-[#ff6b35] text-[#ff6b35]"
                  : "text-gray-300"
              } transition-colors`}
            />
          </button>
        );
      })}
    </div>
  );
}
