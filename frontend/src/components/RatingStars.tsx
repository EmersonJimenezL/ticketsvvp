type RatingStarsProps = {
  value: number;
  onChange?: (value: number) => void;
  onHover?: (value: number | null) => void;
  readOnly?: boolean;
  label?: string;
  sizeClassName?: string;
};

const STAR_VALUES = [1, 2, 3, 4, 5];

export default function RatingStars({
  value,
  onChange,
  onHover,
  readOnly = false,
  label = "Calificacion",
  sizeClassName = "h-5 w-5",
}: RatingStarsProps) {
  const interactive = !readOnly && typeof onChange === "function";

  return (
    <div className="flex items-center gap-1" aria-label={label}>
      {STAR_VALUES.map((star) => {
        const filled = star <= value;
        const colorClass = filled ? "text-amber-400" : "text-neutral-600";

        if (!interactive) {
          return (
            <span key={star} className={`${sizeClassName} ${colorClass}`}>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.076 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
              </svg>
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            aria-label={`Calificar ${star} estrellas`}
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(null)}
            className={`${sizeClassName} ${colorClass} transition-colors`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.076 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
