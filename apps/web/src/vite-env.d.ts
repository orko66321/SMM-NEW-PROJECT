/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Optional — a Google OAuth client ID is not a secret, safe to ship in
  // the bundle. Leave unset to hide the "Continue with Google" button
  // entirely (see components/auth/GoogleSignInButton.tsx).
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
