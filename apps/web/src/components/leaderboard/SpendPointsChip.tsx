import { StarIcon } from "./icons.js";

export function SpendPointsChip({
  points,
  suffix,
  size = "md",
}: {
  points: number;
  suffix: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizing =
    size === "lg"
      ? "px-4 py-1.5 text-base gap-1.5"
      : size === "md"
        ? "px-3 py-1 text-sm gap-1.5"
        : "px-2.5 py-1 text-xs gap-1";
  const starSize = size === "lg" ? "h-4 w-4" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <span
      className={`inline-flex items-center rounded-full border border-warning/25 bg-warning/10 font-mono font-semibold tabular-nums text-warning ${sizing}`}
    >
      <StarIcon className={`${starSize} shrink-0`} />
      {points.toLocaleString("en-US")} {suffix}
    </span>
  );
}
