/**
 * Style: Samadhan public citizen settings — archival paper workspace, editorial serif hierarchy,
 * slim side navigation, squared form controls, and restrained ember feedback accents.
 */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { changePassword } from "@/lib/firebase";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

type SettingSection = "Profile" | "Notifications" | "Security";

export default function CitizenSettings() {
  const [activeSection, setActiveSection] = useState<SettingSection>("Profile");
  const { user } = useAuth();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <PublicPortalHeader />
      <div className="lg:grid lg:min-h-[calc(100vh-84px)] lg:grid-cols-[20.9rem_1fr]">
        <aside className="border-b border-[#a68d6d]/45 bg-[#f4eddf]/42 px-6 py-8 sm:px-10 lg:border-b-0 lg:border-r lg:px-11 lg:py-14">
          <p className="font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-[#314a40]">
            Settings
          </p>
          <nav
            className="mt-5 flex gap-1 overflow-x-auto lg:block lg:space-y-1"
            aria-label="Citizen settings"
          >
            {(["Profile", "Notifications", "Security"] as SettingSection[]).map(
              section => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`min-w-fit border-b-2 px-4 py-3 text-left font-display text-[1.2rem] transition lg:block lg:w-full lg:px-0 ${activeSection === section ? "border-[#c64b22] text-[#b54a28]" : "border-transparent text-[#142f24] hover:border-[#b6a183]/70"}`}
                >
                  {section}
                </button>
              )
            )}
          </nav>
          <a
            href="/citizen/dashboard"
            className="mt-9 inline-flex items-center gap-2 font-body text-[0.76rem] text-[#466257] transition-colors hover:text-[#c64b22]"
          >
            <ChevronLeft size={16} /> Back to my submissions
          </a>
        </aside>
        <section className="px-6 py-10 sm:px-10 lg:px-[5rem] lg:py-14 xl:px-[6.7rem]">
          <div className="max-w-[63rem]">
            {!user || me.isLoading ? (
              <LoadingState />
            ) : me.isError || !me.data ? (
              <ErrorState
                message={me.error?.message}
                retry={() => me.refetch()}
              />
            ) : activeSection === "Profile" ? (
              <ProfileSection
                profile={me.data}
                onSaved={() => void utils.auth.me.invalidate()}
              />
            ) : activeSection === "Notifications" ? (
              <NotificationsSection
                profile={me.data}
                onSaved={() => void utils.auth.me.invalidate()}
              />
            ) : (
              <SecuritySection user={user} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

type ProfileData = NonNullable<
  ReturnType<typeof trpc.auth.me.useQuery>["data"]
>;

function ProfileSection({
  profile,
  onSaved,
}: {
  profile: ProfileData;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saved, setSaved] = useState(false);
  const mutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      onSaved();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    },
  });

  useEffect(() => {
    setName(profile.name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile.name, profile.phone]);

  return (
    <div>
      <PageHeading
        title="Profile"
        description="Manage your personal information."
      />
      <form
        onSubmit={event => {
          event.preventDefault();
          mutation.mutate({
            name: name.trim(),
            phone: phone.trim() || undefined,
          });
        }}
        className="mt-11"
      >
        <SectionLabel>Personal information</SectionLabel>
        <div className="mt-8 space-y-6">
          <SettingsInput
            label="Full name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Add your name"
            autoComplete="name"
          />
          <label className="block">
            <span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#263f35]">
              Email address
            </span>
            <input
              value={profile.email ?? ""}
              readOnly
              disabled
              className="citizen-input mt-2 cursor-not-allowed opacity-60"
            />
            <span className="mt-2 block font-body text-[0.72rem] text-[#697b6f]">
              This is the email you signed in with and can&apos;t be changed
              here.
            </span>
          </label>
          <SettingsInput
            label="Phone number"
            type="tel"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            placeholder="Add a phone number (optional)"
            autoComplete="tel"
          />
        </div>
        {mutation.isError && (
          <p
            role="alert"
            className="mt-4 font-body text-[0.76rem] text-[#934325]"
          >
            {mutation.error.message}
          </p>
        )}
        <SaveButton saved={saved} pending={mutation.isPending} />
      </form>
    </div>
  );
}

function NotificationsSection({
  profile,
  onSaved,
}: {
  profile: ProfileData;
  onSaved: () => void;
}) {
  const defaults = profile.notificationPreferences ?? {
    email: true,
    sms: false,
    weeklySummary: true,
  };
  const [prefs, setPrefs] = useState(defaults);
  const [saved, setSaved] = useState(false);
  const mutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      onSaved();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    },
  });

  useEffect(() => {
    setPrefs(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.notificationPreferences]);

  return (
    <div>
      <PageHeading
        title="Notifications"
        description="Choose the updates you would like to receive about your challenges."
      />
      <form
        onSubmit={event => {
          event.preventDefault();
          mutation.mutate({ notificationPreferences: prefs });
        }}
        className="mt-11"
      >
        <SectionLabel>Notification preferences</SectionLabel>
        <div className="mt-8 divide-y divide-[#a58c6d]/35">
          <PreferenceRow
            title="Email notifications"
            description="Receive email updates about your challenges and their status."
            checked={prefs.email}
            onCheckedChange={value =>
              setPrefs(current => ({ ...current, email: value }))
            }
            tone="ember"
          />
          <PreferenceRow
            title="SMS notifications"
            description="Receive SMS updates about important actions."
            checked={prefs.sms}
            onCheckedChange={value =>
              setPrefs(current => ({ ...current, sms: value }))
            }
            tone="green"
          />
          <PreferenceRow
            title="Weekly summary"
            description="Receive a weekly summary of all your challenge updates."
            checked={prefs.weeklySummary}
            onCheckedChange={value =>
              setPrefs(current => ({ ...current, weeklySummary: value }))
            }
            tone="ember"
          />
        </div>
        {mutation.isError && (
          <p
            role="alert"
            className="mt-4 font-body text-[0.76rem] text-[#934325]"
          >
            {mutation.error.message}
          </p>
        )}
        <SaveButton saved={saved} pending={mutation.isPending} />
      </form>
    </div>
  );
}

function SecuritySection({
  user,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
  const usesPassword = user.providerData.some(
    provider => provider.providerId === "password"
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setPending(true);
    try {
      await changePassword(user, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't update your password. Please try again."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeading
        title="Security"
        description="Update your account security and sign-in preferences."
      />
      {!usesPassword ? (
        <div className="mt-10 border border-[#a48c6d]/45 bg-[#f7f0e5]/35 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#426c51]" size={20} />
            <div>
              <p className="font-display text-[1.2rem] leading-none">
                Signed in with{" "}
                {user.providerData[0]?.providerId === "google.com"
                  ? "Google"
                  : user.providerData[0]?.providerId === "facebook.com"
                    ? "Facebook"
                    : "a linked account"}
              </p>
              <p className="mt-2 font-body text-[0.76rem] leading-relaxed text-[#53685e]">
                There&apos;s no Samadhan password to change — sign-in is managed
                by your linked account provider.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-11">
          <SectionLabel>Password</SectionLabel>
          <div className="mt-8 space-y-6">
            <SettingsInput
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              placeholder="Enter your current password"
              autoComplete="current-password"
              required
            />
            <SettingsInput
              label="New password"
              type="password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              placeholder="Create a new password"
              autoComplete="new-password"
              required
            />
            <SettingsInput
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              required
            />
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 flex items-center gap-2 font-body text-[0.76rem] text-[#934325]"
            >
              <AlertCircle size={15} /> {error}
            </p>
          )}
          <SaveButton saved={saved} pending={pending} label="Update password" />
        </form>
      )}
    </div>
  );
}

function PageHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="font-display text-[4.1rem] font-medium leading-[0.85] tracking-[-0.04em] sm:text-[5rem]">
        {title}
      </h1>
      <p className="mt-5 font-body text-[0.95rem] text-[#4d6359]">
        {description}
      </p>
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-[#a58c6d]/45 pb-3 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#263f35]">
      {children}
    </p>
  );
}
function SettingsInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#263f35]">
        {label}
      </span>
      <input {...props} className="citizen-input mt-2" />
    </label>
  );
}
function PreferenceRow({
  title,
  description,
  checked,
  onCheckedChange,
  tone,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  tone: "ember" | "green";
}) {
  const selected =
    tone === "ember"
      ? "data-[state=checked]:bg-[#c94a20]"
      : "data-[state=checked]:bg-[#103e2d]";
  return (
    <div className="flex items-center justify-between gap-6 py-5">
      <div>
        <h3 className="font-display text-[1.2rem] leading-none">{title}</h3>
        <p className="mt-2 font-body text-[0.76rem] text-[#55695f]">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={`h-7 w-[3.75rem] rounded-none border-[#9c886d]/55 bg-[#f6f0e5] shadow-none data-[state=unchecked]:bg-[#f6f0e5] [&_[data-slot=switch-thumb]]:size-6 [&_[data-slot=switch-thumb]]:rounded-none [&_[data-slot=switch-thumb]]:bg-[#f4eddf] ${selected}`}
      />
    </div>
  );
}
function SaveButton({
  saved,
  pending,
  label = "Save changes",
}: {
  saved: boolean;
  pending?: boolean;
  label?: string;
}) {
  return (
    <div className="mt-8 flex flex-col items-end gap-3">
      <span
        className={`inline-flex items-center gap-2 font-body text-[0.74rem] text-[#3d6e4c] transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}
      >
        <Check size={15} /> Changes saved
      </span>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#c94a20] px-6 py-4 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#dc5729] active:translate-y-0 active:scale-[0.98] disabled:opacity-70"
      >
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}
function LoadingState() {
  return (
    <div className="mt-8 flex items-center gap-3 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 px-5 py-8 font-body text-[0.82rem] text-[#52675d]">
      <Loader2 className="animate-spin text-[#42684b]" size={19} />
      Loading your account…
    </div>
  );
}
function ErrorState({
  message,
  retry,
}: {
  message?: string;
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-8 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-6"
    >
      <p className="font-body text-[0.76rem] text-[#934325]">
        {message ?? "Couldn't load your account."}
      </p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.54rem] uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
