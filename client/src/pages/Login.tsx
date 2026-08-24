/**
 * Style: Samadhan civic editorial log-in — precise paper form controls with a forest-landscape narrative panel.
 */
import AuthLayout from "@/components/AuthLayout";

export default function Login() {
  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Continue the work."
      description="Log in to follow the challenges that matter to your community and help move their solutions forward."
      footer={<p className="font-body text-[0.82rem] text-[#436056]">New to Samadhan? <a href="/signup" className="font-semibold text-[#b4401d] underline decoration-[#b4401d]/45 underline-offset-4 transition-colors hover:text-[#062f22]">Create your account</a>.</p>}
    >
      <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
        <label className="block"><span className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#25463a]">Email address</span><input required type="email" autoComplete="email" placeholder="you@example.com" className="auth-input mt-2" /></label>
        <label className="block"><span className="flex items-baseline justify-between font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#25463a]">Password <a href="#top" className="font-body text-[0.66rem] font-normal normal-case tracking-normal text-[#b4401d] underline decoration-[#b4401d]/45 underline-offset-4">Forgot password?</a></span><input required type="password" autoComplete="current-password" placeholder="Enter your password" className="auth-input mt-2" /></label>
        <label className="flex items-center gap-3 font-body text-[0.74rem] text-[#436056]"><input type="checkbox" className="size-4 accent-[#d84a1b]" />Remember me on this device</label>
        <button type="submit" className="w-full bg-[#d84a1b] px-6 py-4 font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_25px_rgba(124,42,13,0.17)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e45627] active:translate-y-0 active:scale-[0.98]">Log in</button>
      </form>
    </AuthLayout>
  );
}
