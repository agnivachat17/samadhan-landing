import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { auth, initializeFirebaseAnalytics } from "./lib/firebase";
import "./index.css";

const queryClient = new QueryClient();

void initializeFirebaseAnalytics();

// Register PWA service worker (workbox). Auto-update, no prompt.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration may fail in dev or unsupported browsers — non-fatal
    });
  });
}

/**
 * `lib/trpc.ts` throws UNAUTHED_ERR_MSG when there is no signed-in user at
 * all - that genuinely means "you need to log in again". A Firestore
 * "permission-denied" is different: it means *this specific operation* was
 * rejected by `firestore.rules` (wrong owner, a duplicate write's rules
 * check, etc.), which can happen to a perfectly valid session. Treating
 * every permission-denied as "session expired" silently boots a signed-in
 * user to /login on any rules rejection - this exact bug misfired on the
 * upvote flow when a transactional rules check briefly rejected a valid,
 * signed-in request. Only force the redirect when there is genuinely no
 * session left.
 */
const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  if (auth.currentUser) return;

  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message;
  if (code !== "permission-denied" && message !== UNAUTHED_ERR_MSG) return;

  window.location.href = "/login";
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
