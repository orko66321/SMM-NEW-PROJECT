import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../../api/resources.js";

export default function WhatsAppButton() {
  const { data: settings } = useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: 60_000 });

  if (!settings?.whatsappEnabled || !settings.whatsappNumber) return null;

  const digitsOnly = settings.whatsappNumber.replace(/[^0-9]/g, "");

  return (
    <a
      href={`https://wa.me/${digitsOnly}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition hover:scale-105"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7C17.17 3.03 14.68 2 12.04 2zm0 18.1h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.39c0-4.53 3.69-8.22 8.24-8.22 2.2 0 4.27.86 5.83 2.42a8.17 8.17 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.15.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09 0 1.23.9 2.42 1.02 2.59.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.28z" />
      </svg>
    </a>
  );
}
