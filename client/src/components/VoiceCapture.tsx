/** Style: "Bhasha & Bol" — Hindi/English voice-to-form-fill for the citizen challenge
 * submission form. On-device (Web Speech API), no server LLM. See
 * docs/USP-02-bhasha-bol.md and client/src/lib/bhasha.ts (shared parser). */
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Languages } from "lucide-react";
import { toast } from "sonner";
import { parseBhashaText, type BhashaFill } from "@/lib/bhasha";

type SpeechLang = "hi-IN" | "en-IN";

/** Not in the DOM lib — Web Speech API types are non-standard across browsers. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
}

function getSpeechRecognitionCtor():
  (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function VoiceCapture({
  districts,
  onFill,
}: {
  districts: string[];
  onFill: (fill: BhashaFill) => void;
}) {
  const [lang, setLang] = useState<SpeechLang>("hi-IN");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(!!getSpeechRecognitionCtor());
  }, []);

  useEffect(() => {
    if (recRef.current) recRef.current.lang = lang;
  }, [lang]);

  function ensureRecognizer(): SpeechRecognitionLike | null {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error(
        "Voice not supported in this browser — use Chrome, or type/scan instead."
      );
      return null;
    }
    if (recRef.current) return recRef.current;
    const recognizer = new Ctor();
    recognizer.lang = lang;
    recognizer.interimResults = false;
    recognizer.continuous = false;
    recognizer.onresult = event => {
      const text = event.results[0][0].transcript as string;
      setTranscript(text);
      onFill(parseBhashaText(text, districts));
      setListening(false);
    };
    recognizer.onend = () => setListening(false);
    recognizer.onerror = () => {
      setListening(false);
      toast.error("Could not hear that clearly — try again or type instead.");
    };
    recRef.current = recognizer;
    return recognizer;
  }

  function handleMicClick() {
    const recognizer = ensureRecognizer();
    if (!recognizer) return;
    recognizer.lang = lang;
    recognizer.start();
    setListening(true);
  }

  return (
    <div className="mb-5 rounded-xl border border-[#9d876a]/40 bg-[#f7f0e5]/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#243f34]">
          Bhasha &amp; Bol — speak to file
        </p>
        <button
          type="button"
          onClick={() => setLang(l => (l === "hi-IN" ? "en-IN" : "hi-IN"))}
          className="rounded-full inline-flex items-center gap-1 border border-[#9d876a]/60 px-3 py-1 font-mono-ui text-[0.6rem] uppercase tracking-[0.08em] text-[#334c41] hover:bg-[#f4eadd]"
        >
          <Languages size={12} />
          {lang}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!supported}
          onClick={handleMicClick}
          className={`rounded-full inline-flex items-center gap-2 px-5 py-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            listening ? "bg-[#16422f]" : "bg-[#c94a20]"
          }`}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
          {listening ? "Listening…" : `Mic (${lang})`}
        </button>
        {transcript && (
          <p className="font-body text-[0.78rem] italic text-[#334c41]">
            &ldquo;{transcript}&rdquo;
          </p>
        )}
      </div>
      {!supported && (
        <p className="mt-2 font-body text-[0.68rem] text-[#934325]">
          Voice input isn&apos;t supported in this browser — type the form
          instead, or use Chrome/Edge.
        </p>
      )}
      <p className="mt-2 font-body text-[0.68rem] text-[#66766e]">
        Tip: say district + problem, e.g. &ldquo;Palamu me paani ki samasya,
        handpump kharab hai.&rdquo;
      </p>
    </div>
  );
}
