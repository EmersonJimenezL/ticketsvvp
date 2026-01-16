import { useEffect, useMemo, useState } from "react";
import RatingStars from "./RatingStars";

type TicketRatingCardProps = {
  ticketId: string;
  ratingScore?: number;
  ratingComment?: string;
  disabled?: boolean;
  onSubmit: (score: number, comment: string) => Promise<void>;
};

const SCORE_LABELS: Record<number, string> = {
  1: "Muy mala",
  2: "Mala",
  3: "Regular",
  4: "Buena",
  5: "Excelente",
};

export default function TicketRatingCard({
  ticketId,
  ratingScore,
  ratingComment,
  disabled = false,
  onSubmit,
}: TicketRatingCardProps) {
  const [value, setValue] = useState<number>(ratingScore ?? 0);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState<string>(ratingComment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyRated =
    typeof ratingScore === "number" &&
    Number.isFinite(ratingScore) &&
    ratingScore >= 1;
  const displayValue = hover ?? value;

  useEffect(() => {
    if (typeof ratingScore === "number") {
      setValue(ratingScore);
    }
    if (typeof ratingComment === "string") {
      setComment(ratingComment);
    }
  }, [ratingScore, ratingComment]);

  const scoreLabel = useMemo(() => {
    if (!displayValue) return "Selecciona una calificacion";
    return SCORE_LABELS[displayValue] || "";
  }, [displayValue]);

  const canSubmit =
    !disabled && !alreadyRated && value >= 1 && value <= 5 && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const normalizedComment = comment.trim();
      await onSubmit(value, normalizedComment);
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar la calificacion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-neutral-100">
            Calificacion del ticket
          </h4>
          <p className="text-xs text-neutral-400">{scoreLabel}</p>
        </div>
        {alreadyRated && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            Calificado
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <RatingStars
          value={displayValue}
          readOnly={alreadyRated || disabled}
          onChange={alreadyRated || disabled ? undefined : setValue}
          onHover={alreadyRated || disabled ? undefined : setHover}
          label={`Calificacion ticket ${ticketId}`}
          sizeClassName="h-6 w-6"
        />
        <span className="text-xs text-neutral-400">{displayValue || "-"}</span>
      </div>

      <div className="mt-3">
        <textarea
          rows={3}
          value={comment}
          disabled={alreadyRated || disabled}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Comentario opcional"
          className="w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
        />
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {!alreadyRated && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Enviar calificacion"}
          </button>
        </div>
      )}
    </div>
  );
}
