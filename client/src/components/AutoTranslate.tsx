import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  shouldTranslate,
  translateText,
  type LiveLang,
} from "@/lib/liveTranslate";

// Real-time, non-hardcoded EN->HI translation for any text on the page that
// the static i18n dictionaries (client/src/lib/i18n/en.ts|hi.ts) don't cover.
// Walks the live DOM (including Radix/sonner portals, which render into
// document.body outside React's tree) and swaps English text nodes for a
// cached MyMemory translation. Devanagari text (already-translated via the
// static dictionaries) has no Latin letters, so shouldTranslate() skips it
// automatically — this layer only ever touches text still in English.

const translatedSet = new Set<Text>();
const originals = new WeakMap<Text, string>();
const translatedValues = new WeakMap<Text, string>();

function isSkippable(el: Element | null): boolean {
  let node: Element | null = el;
  while (node) {
    if (
      node.hasAttribute("data-no-translate") ||
      node.tagName === "SCRIPT" ||
      node.tagName === "STYLE" ||
      node.tagName === "NOSCRIPT" ||
      node.tagName === "INPUT" ||
      node.tagName === "TEXTAREA" ||
      (node as HTMLElement).isContentEditable
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function collectTextNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    if (textNode.textContent?.trim() && !isSkippable(textNode.parentElement)) {
      nodes.push(textNode);
    }
    current = walker.nextNode();
  }
  return nodes;
}

function restoreAll() {
  translatedSet.forEach(node => {
    const original = originals.get(node);
    if (original !== undefined && node.isConnected) {
      node.textContent = original;
    }
  });
  translatedSet.clear();
}

// Set on every effect run so in-flight translateText() promises can tell
// whether the target language changed before they resolved — without this,
// a slow API response for a Hindi/Santali-mode request can land after the
// user already flipped to a different language and silently overwrite a
// node with the wrong (or restored) text.
let currentTargetLang: LiveLang = "en";

function scanAndTranslate(root: Node, target: LiveLang) {
  for (const node of collectTextNodes(root)) {
    if (translatedSet.has(node)) {
      if (node.textContent === translatedValues.get(node)) continue;
      // React re-rendered this node with new English text — re-process it.
      translatedSet.delete(node);
    }
    const original = node.textContent ?? "";
    if (!shouldTranslate(original)) continue;
    translateText(original, "en", target).then(translated => {
      // Bail if the node moved on, React changed it, or the target language changed.
      if (
        currentTargetLang !== target ||
        !node.isConnected ||
        node.textContent !== original
      )
        return;
      node.textContent = translated;
      originals.set(node, original);
      translatedValues.set(node, translated);
      translatedSet.add(node);
    });
  }
}

export default function AutoTranslate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language } = useLanguage();

  useEffect(() => {
    currentTargetLang = language;
    // Always restore to English first, even switching hi<->sat directly —
    // a node already translated to Hindi won't be re-processed by
    // scanAndTranslate's "already translated, content unchanged" check
    // unless it's back to its original English text first.
    restoreAll();
    if (language === "en") {
      return;
    }

    scanAndTranslate(document.body, language);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => scanAndTranslate(document.body, language), 150);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [language]);

  return <>{children}</>;
}
