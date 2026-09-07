import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../api/resources.js";

// Global SEO / social meta, driven by the admin Site Settings page
// (SEO / Meta Tags section). Mounted once in App.tsx.
//
// This is a client-rendered SPA — there is no SSR — so these tags are
// written into <head> after the bundle runs. Googlebot renders JS and will
// pick them up, and it fixes the browser-tab <title> for real users. The
// static fallbacks below also live in index.html so a non-JS request
// (curl, a social scraper that doesn't execute JS) still gets sensible
// values. Per-page overrides are a later addition; for now every page
// shows the one global value from admin settings.

const DEFAULT_TITLE = "All In One Service — SMM Panel";
const DEFAULT_DESCRIPTION =
  "High-speed, premium-quality social media marketing services with instant automated payment verification and a reseller-ready API.";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

interface SeoSettings {
  siteName?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  ogImageUrl?: string | null;
}

export default function SeoHead() {
  const { data } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });

  useEffect(() => {
    const s = data as SeoSettings | undefined;
    if (!s) return;

    const title = s.metaTitle?.trim() || s.siteName?.trim() || DEFAULT_TITLE;
    const description = s.metaDescription?.trim() || DEFAULT_DESCRIPTION;
    const keywords = s.metaKeywords?.trim() ?? "";
    const ogImage = s.ogImageUrl?.trim() ?? "";

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "website");
    // keywords / og:image are optional — only emit a tag when the admin set one
    if (keywords) upsertMeta("name", "keywords", keywords);
    if (ogImage) upsertMeta("property", "og:image", ogImage);
  }, [data]);

  return null;
}
