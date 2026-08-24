import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../../api/resources.js";

const SCRIPT_ID = "smm-live-chat-widget";

/**
 * Loads a known chat provider's OFFICIAL embed script by widget ID —
 * deliberately never renders admin-supplied HTML/script content
 * (dangerouslySetInnerHTML or eval) even though the widget ID itself is
 * admin-controlled via the Settings page. The ID is only ever used as a URL
 * path segment (Tawk.to, requested from tawk.to's own servers) or assigned
 * as a plain JS string property (Crisp's CRISP_WEBSITE_ID) — neither path
 * lets an admin-entered string execute as code in this page, closing off
 * the stored-XSS vector a raw "paste your chat script here" field would open.
 */
export default function LiveChatLoader() {
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });

  useEffect(() => {
    document.getElementById(SCRIPT_ID)?.remove();

    if (!settings || settings.liveChatProvider === "NONE" || !settings.liveChatWidgetId) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;

    if (settings.liveChatProvider === "TAWKTO") {
      script.src = `https://embed.tawk.to/${encodeURIComponent(settings.liveChatWidgetId)}/default`;
      script.crossOrigin = "*";
    } else if (settings.liveChatProvider === "CRISP") {
      (window as unknown as { CRISP_WEBSITE_ID?: string }).CRISP_WEBSITE_ID = settings.liveChatWidgetId;
      script.src = "https://client.crisp.chat/l.js";
    } else {
      return;
    }

    document.body.appendChild(script);
    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [settings]);

  return null;
}
