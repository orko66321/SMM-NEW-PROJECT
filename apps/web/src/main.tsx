import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext.js";
import { CurrencyProvider } from "./context/CurrencyContext.js";
import { LanguageProvider } from "./context/LanguageContext.js";
import App from "./App.js";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const appTree = (
  <LanguageProvider>
    <AuthProvider>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
    </AuthProvider>
  </LanguageProvider>
);

// Only mount the provider when a client ID is actually configured — with no
// provider, GoogleSignInButton's own clientId check (which never renders
// <GoogleLogin> in that case) means there's nothing left that would need
// this context, so skipping it entirely here is safe rather than mounting
// it with an empty/invalid ID.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider> : appTree}
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
