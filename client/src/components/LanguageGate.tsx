import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Languages } from "lucide-react";
import { motion } from "framer-motion";

const OPTIONS = [
  {
    lang: "en" as const,
    glyph: "A",
    glyphFont: undefined,
    name: "English",
    nameFont: undefined,
    tagline: "Continue in English",
    taglineFont: undefined,
    tone: "light" as const,
  },
  {
    lang: "hi" as const,
    glyph: "अ",
    glyphFont: "var(--font-hindi)",
    name: "हिंदी",
    nameFont: "var(--font-hindi)",
    tagline: "हिंदी में आगे बढ़ें",
    taglineFont: "var(--font-hindi)",
    tone: "ember" as const,
  },
  {
    lang: "sat" as const,
    glyph: "ᱥ",
    glyphFont: "var(--font-santali)",
    name: "ᱥᱟᱱᱛᱟᱲᱤ",
    nameFont: "var(--font-santali)",
    tagline: "ᱥᱟᱱᱛᱟᱲᱤ ᱱᱤᱩᱡᱽ ᱰᱮᱥᱠ",
    taglineFont: "var(--font-santali)",
    tone: "forest" as const,
  },
];

const TONE_CLASSES: Record<
  (typeof OPTIONS)[number]["tone"],
  { card: string; glyph: string; name: string; tagline: string }
> = {
  light: {
    card: "border-[#132e24]/15 bg-white/60 hover:border-[#c94a20]/40 hover:bg-white hover:shadow-[0_10px_26px_rgba(19,46,36,0.14)]",
    glyph: "text-[#132e24]/10",
    name: "text-[#132e24]",
    tagline: "text-[#6b7d74]",
  },
  ember: {
    card: "border-[#c94a20]/30 bg-[#c94a20] text-white shadow-[0_10px_26px_rgba(201,74,32,0.3)] hover:bg-[#d95a2e] hover:shadow-[0_14px_30px_rgba(201,74,32,0.38)]",
    glyph: "text-white/15",
    name: "text-white",
    tagline: "text-white/80",
  },
  forest: {
    card: "border-[#132e24]/25 bg-[#132e24] text-white shadow-[0_10px_26px_rgba(19,46,36,0.28)] hover:bg-[#1a3d30] hover:shadow-[0_14px_30px_rgba(19,46,36,0.34)]",
    glyph: "text-white/15",
    name: "text-white",
    tagline: "text-white/80",
  },
};

const SUBTITLE_LINES: Array<{ tag: string; text: string; font?: string }> = [
  {
    tag: "EN",
    text: "Select how you want to use Samadhan. You can change this anytime.",
  },
  {
    tag: "HI",
    text: "समाधान को किस भाषा में इस्तेमाल करना चाहते हैं? आप इसे बाद में भी बदल सकते हैं।",
    font: "var(--font-hindi)",
  },
  {
    tag: "SAT",
    text: "ᱟᱢ ᱪᱮᱫ ᱞᱮᱠᱟ ᱥᱟᱢᱟᱫᱟᱱ ᱵᱮᱵᱷᱟᱨ ᱠᱮᱫᱟ ᱚᱱᱟ ᱵᱟᱪᱷᱟᱣ ᱢᱮ ᱾ ᱟᱢ ᱡᱟᱦᱟᱸ ᱚᱠᱛᱚ ᱨᱮᱦᱚᱸ ᱱᱚᱶᱟ ᱵᱮᱵᱷᱟᱨ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾",
    font: "var(--font-santali)",
  },
];

export default function LanguageGate() {
  const { hasChosen, setLanguage } = useLanguage();

  return (
    <Dialog open={!hasChosen} modal>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onEscapeKeyDown={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        overlayClassName="backdrop-blur-md bg-gradient-to-br from-black/75 via-[#132e24]/55 to-black/80 duration-300"
        className="max-w-[25rem] gap-0 overflow-hidden rounded-2xl border border-[#a78e6e]/55 bg-[#f6efe0] p-0 shadow-[0_30px_80px_rgba(19,46,36,0.5)] duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out sm:max-w-[36rem]"
        style={{
          backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
          backgroundSize: "cover",
        }}
      >
        {/* Ambient glow — slow, looping brand-colored blobs behind the content for a bit of life without being distracting. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-[#c94a20]/25 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -right-10 size-64 rounded-full bg-[#132e24]/25 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        <div className="relative px-6 pb-7 pt-8 sm:px-9 sm:pt-9">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#132e24] text-[#f6efe0]">
            <Languages size={22} strokeWidth={1.6} />
          </div>

          <DialogTitle className="mt-5 text-center font-display text-[1.7rem] font-semibold leading-tight tracking-[-0.02em] text-[#132e24] sm:text-[1.9rem]">
            Choose your language
          </DialogTitle>
          <p
            data-no-translate
            className="mt-1 text-center text-[0.95rem] text-[#8a7256]"
          >
            <span style={{ fontFamily: "var(--font-hindi)" }}>
              अपनी भाषा चुनें
            </span>
            <span className="mx-2 text-[#c9b896]">·</span>
            <span style={{ fontFamily: "var(--font-santali)" }}>
              ᱟᱢᱟᱜ ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ ᱛᱟᱢ
            </span>
          </p>

          <div
            data-no-translate
            className="mt-5 space-y-1.5 rounded-xl border border-[#132e24]/10 bg-white/45 px-4 py-3.5"
          >
            {SUBTITLE_LINES.map(line => (
              <p key={line.tag} className="flex items-baseline gap-2 text-left">
                <span className="mt-[1px] w-6 shrink-0 font-mono-ui text-[0.55rem] font-bold uppercase tracking-[0.08em] text-[#9aa89e]">
                  {line.tag}
                </span>
                <span
                  style={line.font ? { fontFamily: line.font } : undefined}
                  className="font-body text-[0.75rem] leading-relaxed text-[#4b5850]"
                >
                  {line.text}
                </span>
              </p>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {OPTIONS.map((option, i) => {
              const tone = TONE_CLASSES[option.tone];
              return (
                <motion.button
                  key={option.lang}
                  type="button"
                  onClick={() => setLanguage(option.lang)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.06 * i,
                    duration: 0.35,
                    ease: "easeOut",
                  }}
                  whileTap={{ scale: 0.97 }}
                  className={`group relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 px-3 py-6 transition-colors ${tone.card}`}
                >
                  <span
                    aria-hidden
                    style={{ fontFamily: option.glyphFont }}
                    className={`pointer-events-none absolute -right-2 -top-3 select-none font-display text-[4.5rem] font-bold leading-none ${tone.glyph}`}
                  >
                    {option.glyph}
                  </span>
                  <span
                    style={{ fontFamily: option.glyphFont }}
                    className={`relative font-display text-[1.5rem] font-semibold leading-none ${tone.name}`}
                  >
                    {option.glyph}
                  </span>
                  <span
                    style={{ fontFamily: option.nameFont }}
                    className={`relative font-mono-ui text-[0.78rem] font-bold uppercase tracking-[0.1em] ${tone.name}`}
                  >
                    {option.name}
                  </span>
                  <span
                    style={{ fontFamily: option.taglineFont }}
                    className={`relative text-center font-body text-[0.65rem] leading-snug ${tone.tagline}`}
                  >
                    {option.tagline}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div
            data-no-translate
            className="mt-5 text-center font-body text-[0.66rem] leading-relaxed text-[#8a9a8e]"
          >
            <p>You can change the language anytime from the top bar.</p>
            <p style={{ fontFamily: "var(--font-hindi)" }}>
              ऊपर दिए गए बटन से आप कभी भी भाषा बदल सकते हैं।
            </p>
            <p style={{ fontFamily: "var(--font-santali)" }}>
              ᱟᱢ ᱫᱚ ᱡᱟᱦᱟᱸ ᱚᱠᱛᱚ ᱨᱮᱦᱚᱸ ᱢᱟᱨᱟᱝ ᱵᱟᱨ ᱠᱷᱚᱱ ᱯᱟᱹᱨᱥᱤ ᱠᱚ ᱵᱚᱫᱚᱞ ᱫᱟᱲᱮᱭᱟᱜᱼᱟ ᱾
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
