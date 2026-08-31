import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Languages } from "lucide-react";

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
        className="max-w-[28rem] gap-0 overflow-hidden rounded-2xl border border-[#a78e6e]/55 bg-[#f6efe0] p-0 shadow-[0_24px_60px_rgba(19,46,36,0.35)] data-[state=open]:animate-in data-[state=closed]:animate-out"
        style={{
          backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
          backgroundSize: "cover",
        }}
      >
        <div className="px-7 pb-7 pt-8 sm:px-8 sm:pt-9">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#132e24] text-[#f6efe0]">
            <Languages size={22} strokeWidth={1.6} />
          </div>

          <DialogTitle className="mt-5 text-center font-display text-[1.7rem] font-semibold leading-tight tracking-[-0.02em] text-[#132e24] sm:text-[1.85rem]">
            Choose your language
            <br />
            <span
              style={{ fontFamily: "var(--font-hindi)" }}
              className="font-normal"
            >
              अपनी भाषा चुनें
            </span>
          </DialogTitle>

          <p className="mt-3 text-center font-body text-[0.8rem] leading-relaxed text-[#5c6a61]">
            Select how you want to use Samadhan. You can change this anytime.
            <br />
            <span style={{ fontFamily: "var(--font-hindi)" }}>
              समाधान को किस भाषा में इस्तेमाल करना चाहते हैं? आप इसे बाद में भी
              बदल सकते हैं।
            </span>
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className="group flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-[#132e24]/15 bg-white/60 px-4 py-6 transition-all hover:border-[#c94a20]/40 hover:bg-white hover:shadow-[0_8px_20px_rgba(19,46,36,0.12)] active:scale-[0.97]"
            >
              <span className="font-display text-[1.55rem] font-semibold text-[#132e24]">
                A
              </span>
              <span className="font-mono-ui text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[#132e24]">
                English
              </span>
              <span className="font-body text-[0.68rem] text-[#6b7d74]">
                Continue in English
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLanguage("hi")}
              className="group flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-[#c94a20]/30 bg-[#c94a20] px-4 py-6 text-white shadow-[0_8px_20px_rgba(201,74,32,0.3)] transition-all hover:bg-[#d95a2e] hover:shadow-[0_10px_24px_rgba(201,74,32,0.35)] active:scale-[0.97]"
            >
              <span
                style={{ fontFamily: "var(--font-hindi)" }}
                className="text-[1.6rem] font-semibold leading-none"
              >
                अ
              </span>
              <span
                style={{ fontFamily: "var(--font-hindi)" }}
                className="text-[0.85rem] font-semibold"
              >
                हिंदी
              </span>
              <span
                style={{ fontFamily: "var(--font-hindi)" }}
                className="text-[0.68rem] text-white/80"
              >
                हिंदी में आगे बढ़ें
              </span>
            </button>
          </div>

          <p className="mt-5 text-center font-body text-[0.68rem] leading-relaxed text-[#8a9a8e]">
            You can change the language anytime from the top bar.
            <br />
            <span style={{ fontFamily: "var(--font-hindi)" }}>
              ऊपर दिए गए बटन से आप कभी भी भाषा बदल सकते हैं।
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
