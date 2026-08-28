import { useState } from "react";

// Responsive 16:9 YouTube embed. Lazy by default: shows the poster frame
// with a play button and only mounts the iframe once the visitor clicks —
// keeps the post page light when a post has a video it may never watch.
// Uses youtube-nocookie.com (no tracking cookie until playback).

export default function YouTubeEmbed({ videoId, title }: { videoId: string; title?: string }) {
  const [active, setActive] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-outline-variant bg-black">
      {active ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title ?? "YouTube video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={title ? `Play video: ${title}` : "Play video"}
        >
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-error/90 shadow-lg transition group-hover:scale-110">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
