function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

export function LeaderboardAvatar({
  name,
  avatarUrl,
  size = "md",
  ringClassName,
}: {
  name: string;
  avatarUrl: string | null;
  size?: "sm" | "md" | "lg";
  ringClassName?: string;
}) {
  const dims = size === "lg" ? "h-20 w-20 text-xl" : size === "md" ? "h-14 w-14 text-base" : "h-10 w-10 text-sm";

  return (
    <div
      className={`relative shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-surface-container ${ringClassName ?? "ring-outline-variant"}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className={`${dims} rounded-full object-cover`}
        />
      ) : (
        <div
          role="img"
          aria-label={name}
          className={`${dims} flex items-center justify-center rounded-full bg-surface-container-highest font-display font-bold text-on-surface-variant`}
        >
          {initialsOf(name)}
        </div>
      )}
    </div>
  );
}
