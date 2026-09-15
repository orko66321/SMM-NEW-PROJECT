// Small typed wrapper around the Crisp SDK's `$crisp.push([...])` command
// queue (https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/).
// `$crisp` is a plain array acting as a queue until the real script (loaded
// by LiveChatLoader.tsx) boots and starts draining it — pushing onto it is
// safe at any time, script-loaded or not, and a no-op (never throws) when
// Crisp isn't configured at all, so call sites don't need to guard on
// whether the widget happens to be ready yet.
type CrispCommand = [string, string, ...unknown[]] | [string, string];

function crispQueue(): CrispCommand[] | undefined {
  return (window as unknown as { $crisp?: CrispCommand[] }).$crisp;
}

/**
 * LiveChatLoader hides Crisp's own floating launcher on load (so it never
 * sits in the bottom-right corner colliding with the site's "Need help?"
 * button) — this is how the rest of the UI brings the chat back: from the
 * Help widget's tray, or the "Live Chat with Support" button on the
 * Tickets page. `chat:show` re-reveals the widget, `chat:open` opens the
 * conversation panel.
 */
export function openCrispChat(): void {
  const q = crispQueue();
  if (!q) return;
  q.push(["do", "chat:show"]);
  q.push(["do", "chat:open"]);
}
