/**
 * Style: Samadhan public citizen settings — archival paper workspace, editorial serif hierarchy,
 * slim side navigation, squared form controls, and restrained ember feedback accents.
 */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronLeft, ShieldCheck } from "lucide-react";
import { useState } from "react";

type SettingSection = "Profile" | "Notifications" | "Security";

export default function CitizenSettings() {
  const [activeSection, setActiveSection] = useState<SettingSection>("Profile");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [saved, setSaved] = useState(false);

  const showSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  };

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
                  onClick={() => {
                    setActiveSection(section);
                    setSaved(false);
                  }}
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
            {activeSection === "Profile" && (
              <ProfileSection
                emailNotifications={emailNotifications}
                smsNotifications={smsNotifications}
                weeklySummary={weeklySummary}
                setEmailNotifications={setEmailNotifications}
                setSmsNotifications={setSmsNotifications}
                setWeeklySummary={setWeeklySummary}
                onSave={showSaved}
                saved={saved}
              />
            )}
            {activeSection === "Notifications" && (
              <NotificationsSection
                emailNotifications={emailNotifications}
                smsNotifications={smsNotifications}
                weeklySummary={weeklySummary}
                setEmailNotifications={setEmailNotifications}
                setSmsNotifications={setSmsNotifications}
                setWeeklySummary={setWeeklySummary}
                onSave={showSaved}
                saved={saved}
              />
            )}
            {activeSection === "Security" && (
              <SecuritySection onSave={showSaved} saved={saved} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileSection(props: PreferenceProps) {
  return (
    <div>
      <PageHeading
        title="Profile"
        description="Manage your personal information and notification preferences."
      />
      <form
        onSubmit={event => {
          event.preventDefault();
          props.onSave();
        }}
        className="mt-11"
      >
        <SectionLabel>Personal information</SectionLabel>
        <div className="mt-8 space-y-6">
          <SettingsInput
            label="Full name"
            defaultValue="Asha Kumari"
            autoComplete="name"
          />
          <SettingsInput
            label="Email address"
            defaultValue="asha.kumari@example.com"
            type="email"
            autoComplete="email"
          />
          <SettingsInput
            label="Phone number"
            defaultValue="+91 98765 43210"
            type="tel"
            autoComplete="tel"
          />
        </div>
        <Preferences {...props} />
        <SaveButton saved={props.saved} />
      </form>
    </div>
  );
}

function NotificationsSection(props: PreferenceProps) {
  return (
    <div>
      <PageHeading
        title="Notifications"
        description="Choose the updates you would like to receive about your challenges."
      />
      <form
        onSubmit={event => {
          event.preventDefault();
          props.onSave();
        }}
        className="mt-11"
      >
        <SectionLabel>Notification preferences</SectionLabel>
        <Preferences {...props} standalone />
        <SaveButton saved={props.saved} />
      </form>
    </div>
  );
}

function SecuritySection({
  onSave,
  saved,
}: {
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <div>
      <PageHeading
        title="Security"
        description="Update your account security and sign-in preferences."
      />
      <form
        onSubmit={event => {
          event.preventDefault();
          onSave();
        }}
        className="mt-11"
      >
        <SectionLabel>Password</SectionLabel>
        <div className="mt-8 space-y-6">
          <SettingsInput
            label="Current password"
            type="password"
            placeholder="Enter your current password"
            autoComplete="current-password"
          />
          <SettingsInput
            label="New password"
            type="password"
            placeholder="Create a new password"
            autoComplete="new-password"
          />
          <SettingsInput
            label="Confirm new password"
            type="password"
            placeholder="Confirm your new password"
            autoComplete="new-password"
          />
        </div>
        <div className="mt-10 border border-[#a48c6d]/45 bg-[#f7f0e5]/35 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 text-[#426c51]" size={20} />
            <div>
              <p className="font-display text-[1.2rem] leading-none">
                Account privacy
              </p>
              <p className="mt-2 font-body text-[0.76rem] leading-relaxed text-[#53685e]">
                Security updates are applied when account access is enabled.
                This prototype is currently open for review.
              </p>
            </div>
          </div>
        </div>
        <SaveButton saved={saved} label="Update password" />
      </form>
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

type PreferenceProps = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  weeklySummary: boolean;
  setEmailNotifications: (value: boolean) => void;
  setSmsNotifications: (value: boolean) => void;
  setWeeklySummary: (value: boolean) => void;
  onSave: () => void;
  saved: boolean;
};
function Preferences({
  emailNotifications,
  smsNotifications,
  weeklySummary,
  setEmailNotifications,
  setSmsNotifications,
  setWeeklySummary,
  standalone,
}: PreferenceProps & { standalone?: boolean }) {
  return (
    <section className={`${standalone ? "mt-8" : "mt-11"}`}>
      <SectionLabel>Notification preferences</SectionLabel>
      <div className="divide-y divide-[#a58c6d]/35">
        <PreferenceRow
          title="Email notifications"
          description="Receive email updates about your challenges and their status."
          checked={emailNotifications}
          onCheckedChange={setEmailNotifications}
          tone="ember"
        />
        <PreferenceRow
          title="SMS notifications"
          description="Receive SMS updates about important actions."
          checked={smsNotifications}
          onCheckedChange={setSmsNotifications}
          tone="green"
        />
        <PreferenceRow
          title="Weekly summary"
          description="Receive a weekly summary of all your challenge updates."
          checked={weeklySummary}
          onCheckedChange={setWeeklySummary}
          tone="ember"
        />
      </div>
    </section>
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
  label = "Save changes",
}: {
  saved: boolean;
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
        className="rounded-full bg-[#c94a20] px-6 py-4 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#dc5729] active:translate-y-0 active:scale-[0.98]"
      >
        {label}
      </button>
    </div>
  );
}
