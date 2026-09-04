/**
 * Style: Samadhan civic editorial log-in — precise paper form controls with a forest-landscape narrative panel.
 */
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import {
  signInWithEmail,
  signInWithFacebook,
  signInWithGoogle,
} from "@/lib/firebase";
import { dashboardPathForRole } from "@/lib/roles";
import { trpc } from "@/lib/trpc";
import { Facebook } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

function firebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  )
    return "That email and password combination doesn't match an account.";
  if (code === "auth/too-many-requests")
    return "Too many attempts. Please wait a moment and try again.";
  if (code === "auth/popup-closed-by-user") return "";
  return "Something went wrong while signing in. Please try again.";
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const utils = trpc.useUtils();
  const inviteToken = useMemo(() => new URLSearchParams(window.location.search).get("invite"), []);
  const inviteQuery = trpc.workflow.validateInvite.useQuery({ token: inviteToken! }, { enabled: !!inviteToken });
  const inviteData = inviteQuery.data as any;
  const isInviteFlow = !!inviteToken && !!inviteData;

  const consumeInvite = trpc.workflow.consumeInvite.useMutation();

  async function redirectToDashboard() {
    if (inviteToken && inviteData) {
      try {
        const user = auth.currentUser!;
        const { updateUserProfile } = await import("@/lib/userProfile");
        await updateUserProfile(user, { role: "institution" as any, memberRole: inviteData.invite.memberRole as any, organizationId: inviteData.invite.organizationId } as any);
        try { await consumeInvite.mutateAsync({ token: inviteToken, uid: user.uid }); } catch {}
        toast.success("Invite accepted", { description: `Joined ${inviteData.organization?.name}` });
        if (inviteData.invite.memberRole === "student") { setLocation("/student/onboarding"); return; }
        if (inviteData.invite.memberRole === "faculty") { setLocation("/institute/dashboard"); return; }
      } catch (e: any) { console.warn("invite link after login failed", e); }
    }
    const profile = await utils.auth.me.fetch();
    setLocation(profile ? dashboardPathForRole(profile.role, profile.organizationId ?? null) : "/");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await signInWithEmail(email, password);
      await redirectToDashboard();
    } catch (issue) {
      setError(firebaseErrorMessage(issue));
    } finally {
      setPending(false);
    }
  }

  async function withSocial(fn: () => Promise<unknown>) {
    setError("");
    setPending(true);
    try {
      await fn();
      await redirectToDashboard();
    } catch (issue) {
      setError(firebaseErrorMessage(issue));
    } finally {
      setPending(false);
    }
  }

  const inviteOrgName = (inviteData as any)?.organization?.name ?? "";
  const inviteRole = (inviteData as any)?.invite?.memberRole ?? "member";

  return (
    <AuthLayout
      eyebrow={inviteToken ? "You've been invited" : "Welcome back"}
      title={inviteToken && inviteData ? `Join ${inviteOrgName} as ${inviteRole}` : "Continue the work."}
      description={inviteToken && inviteData ? `Log in with your existing account to accept the invite to ${inviteOrgName} as ${inviteRole}.` : "Log in to follow the challenges that matter to your community and help move their solutions forward."}
      footer={
        <p className="font-body text-[0.82rem] text-[#436056]">
          New to Samadhan?{" "}
          <a
            href="/signup"
            className="font-semibold text-[#b4401d] underline decoration-[#b4401d]/45 underline-offset-4 transition-colors hover:text-[#062f22]"
          >
            Create your account
          </a>
          .
        </p>
      }
    >
      {inviteToken && inviteData && (
        <div className="mb-6 border border-[#7ea68a] bg-[#e2ede3]/50 p-4">
          <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#2e5a3a]">Invite from {inviteOrgName}</p>
          <p className="mt-1 font-body text-[0.8rem] text-[#2e5a3a]">Log in to join as <span className="font-semibold capitalize">{inviteRole}</span>. Your account will be linked automatically.</p>
        </div>
      )}
      {inviteToken && inviteQuery.isError && (
        <div className="mb-4 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-3 font-body text-[0.8rem] text-[#934325]">{(inviteQuery.error as Error).message}</div>
      )}
      <form onSubmit={submit} className="space-y-6">
        <label className="block">
          <span className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#25463a]">
            Email address
          </span>
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="auth-input mt-2"
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#25463a]">
            Password
          </span>
          <input
            required
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="auth-input mt-2"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="font-body text-[0.78rem] text-[#b44929]">
            {error}
          </p>
        )}
        <button
          disabled={pending}
          type="submit"
          className="rounded-full w-full bg-[#d84a1b] px-6 py-4 font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_25px_rgba(124,42,13,0.17)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e45627] active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Signing in…" : "Log in"}
        </button>
      </form>
      <div className="mt-6 flex items-center gap-3 font-mono-ui text-[0.6rem] uppercase tracking-[0.14em] text-[#8a9a90]">
        <span className="h-px flex-1 bg-[#a88d67]/40" />
        Or continue with
        <span className="h-px flex-1 bg-[#a88d67]/40" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => withSocial(signInWithGoogle)}
          className="rounded-full flex items-center justify-center gap-2 border border-[#dadce0] bg-white px-4 py-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#3c4043] shadow-sm transition hover:bg-[#f7f8f8] hover:shadow disabled:opacity-60"
        >
          <GoogleIcon size={16} />
          Google
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => withSocial(signInWithFacebook)}
          className="rounded-full flex items-center justify-center gap-2 border border-[#1877F2] bg-[#1877F2] px-4 py-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white shadow-sm transition hover:bg-[#166fe5] disabled:opacity-60"
        >
          <Facebook size={16} className="text-white" fill="white" />
          Facebook
        </button>
      </div>
    </AuthLayout>
  );
}
