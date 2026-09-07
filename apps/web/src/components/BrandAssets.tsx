import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../api/resources.js";

// Runtime brand assets, driven by the admin Site Settings page
// ("Logo & Icon Settings" section). Mounted once in App.tsx alongside SeoHead.
//
// This is a client-rendered SPA with no SSR, so — exactly like SeoHead — the
// favicon / apple-touch-icon / web app manifest / theme colour are written
// into <head> after the bundle runs. index.html still ships a sensible inline
// default favicon for the pre-hydration / no-JS case.
//
// There is no separate "User Panel Update" build step in this codebase (the
// reference UI's button comes from a stock PHP panel); saving the settings is
// all that's needed — this component regenerates the manifest and icon links
// on the next load, and re-runs immediately in any open tab once the
// "public-settings" query is invalidated.

interface BrandSettings {
  siteName?: string;
  icon512?: string | null;
  icon192?: string | null;
  icon512Alt?: string | null;
  siteColor?: string | null;
}

/** "#6D28D9" -> "109 40 217" (space-separated RGB channels), or null if malformed. */
function hexToChannels(hex: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m || !m[1]) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Mix a channel triple toward white — used to derive the hover / gradient-top shade. */
function lightenChannels(channels: string, amount = 0.3): string {
  const parts = channels.split(" ").map(Number);
  return parts.map((c) => Math.round(c + (255 - c) * amount)).join(" ");
}

function upsert<T extends HTMLElement>(selector: string, create: () => T): T {
  let el = document.head.querySelector<T>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

export default function BrandAssets() {
  const { data } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });

  useEffect(() => {
    const s = data as BrandSettings | undefined;
    if (!s) return;

    // ── Site colour → brand-primary CSS custom properties ──────────────────
    const channels = s.siteColor ? hexToChannels(s.siteColor) : null;
    const styleEl = upsert<HTMLStyleElement>("style#brand-color-vars", () => {
      const el = document.createElement("style");
      el.id = "brand-color-vars";
      return el;
    });
    styleEl.textContent = channels
      ? `:root{--brand-primary:${channels};--brand-primary-light:${lightenChannels(channels)};}`
      : "";

    // ── theme-color (browser chrome / PWA splash) ──────────────────────────
    if (s.siteColor) {
      upsert<HTMLMetaElement>('meta[name="theme-color"]', () => {
        const el = document.createElement("meta");
        el.name = "theme-color";
        return el;
      }).setAttribute("content", s.siteColor);
    }

    // ── Favicon + apple-touch-icon ────────────────────────────────────────
    const favicon = (s.icon512 || s.icon192)?.trim();
    if (favicon) {
      const el = upsert<HTMLLinkElement>('link[rel="icon"]', () => {
        const l = document.createElement("link");
        l.rel = "icon";
        return l;
      });
      el.removeAttribute("type");
      el.href = favicon;
    }
    const appleIcon = (s.icon512Alt || s.icon512)?.trim();
    if (appleIcon) {
      upsert<HTMLLinkElement>('link[rel="apple-touch-icon"]', () => {
        const l = document.createElement("link");
        l.rel = "apple-touch-icon";
        return l;
      }).href = appleIcon;
    }

    // ── Web app manifest (built at runtime, served as a blob) ─────────────
    const icons = [
      s.icon192?.trim() && { src: s.icon192.trim(), sizes: "192x192", type: "image/png", purpose: "any" },
      s.icon512?.trim() && { src: s.icon512.trim(), sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ].filter(Boolean);

    let blobUrl: string | null = null;
    if (icons.length > 0) {
      const manifest = {
        name: s.siteName || "All In One Service",
        short_name: s.siteName || "All In One Service",
        start_url: "/",
        display: "standalone",
        background_color: s.siteColor || "#031427",
        theme_color: s.siteColor || "#6D28D9",
        icons,
      };
      blobUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
      upsert<HTMLLinkElement>('link[rel="manifest"]', () => {
        const l = document.createElement("link");
        l.rel = "manifest";
        return l;
      }).href = blobUrl;
    }

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [data]);

  return null;
}
