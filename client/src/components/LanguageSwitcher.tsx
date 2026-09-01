import { useLanguage } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";

export default function LanguageSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const { language, setLanguage } = useLanguage();

  const base =
    variant === "dark"
      ? "border-white/20 bg-white/10 text-[#f6efe0] hover:bg-white/20"
      : "border-[#132e24]/15 bg-white/40 text-[#132e24] hover:bg-white/70 hover:border-[#c44720]/30";

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-sm ${base}`}
      role="group"
      aria-label="Language switcher"
      data-no-translate
    >
      <Languages
        size={14}
        className="ml-1 hidden opacity-60 sm:inline"
        strokeWidth={1.6}
      />
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`rounded-full px-3 py-1 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.08em] transition-colors ${
          language === "en"
            ? variant === "dark"
              ? "bg-white text-[#132e24] shadow-sm"
              : "bg-[#132e24] text-white shadow-sm"
            : "opacity-60 hover:opacity-100"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        aria-pressed={language === "hi"}
        style={
          language === "hi" ? { fontFamily: "var(--font-hindi)" } : undefined
        }
        className={`rounded-full px-3 py-1 text-[0.62rem] font-semibold tracking-[0.06em] transition-colors ${
          language === "hi"
            ? variant === "dark"
              ? "bg-white text-[#132e24] shadow-sm"
              : "bg-[#132e24] text-white shadow-sm"
            : "opacity-60 hover:opacity-100"
        }`}
      >
        हिं
      </button>
      <button
        type="button"
        onClick={() => setLanguage("sat")}
        aria-pressed={language === "sat"}
        aria-label="Santali (Ol Chiki)"
        style={
          language === "sat" ? { fontFamily: "var(--font-santali)" } : undefined
        }
        className={`rounded-full px-3 py-1 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.08em] transition-colors ${
          language === "sat"
            ? variant === "dark"
              ? "bg-white text-[#132e24] shadow-sm"
              : "bg-[#132e24] text-white shadow-sm"
            : "opacity-60 hover:opacity-100"
        }`}
      >
        SAT
      </button>
    </div>
  );
}
