import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { initializeFirebaseAnalytics } from "./lib/firebase";
import "./index.css";

const queryClient = new QueryClient();

void initializeFirebaseAnalytics();

/**
 * Firestore rejects unauthorised reads/writes with code "permission-denied";
 * the shim in lib/trpc.ts throws UNAUTHED_ERR_MSG when there is no signed-in
 * user at all. Both mean "you need to log in again".
 */
const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;

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
