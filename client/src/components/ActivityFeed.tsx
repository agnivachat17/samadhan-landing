import { motion } from "framer-motion";
import { timeAgo } from "@/lib/timeago";

type FeedItem = {
  id: number | string;
  title: string;
  detail?: string;
  actorName?: string;
  type?: string;
  createdAt: string | Date;
  projectTitle?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

const typeColor: Record<string, string> = {
  milestone: "bg-[#dce6d0] text-[#3a6b4a] border-[#8fa887]",
  document: "bg-[#dce6eb] text-[#2d6581] border-[#a3c0d1]",
  note: "bg-[#f3e5bd] text-[#7a5a1a] border-[#cda75f]",
  system: "bg-[#e7e3d9] text-[#5e6c63] border-[#a58c6d]/40",
};

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) return null;
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      className="space-y-3"
    >
      {items.map(item => {
        const tone = typeColor[item.type ?? "note"] ?? typeColor.note;
        return (
          <motion.div
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }}
            className="flex gap-3 border border-[#a58c6d]/30 bg-[#f8f2e8]/35 p-4"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#132e24] font-mono-ui text-[0.58rem] font-semibold text-white">
              {initials(item.actorName ?? "S")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-body text-[0.82rem] font-medium leading-snug text-[#1d3a2f]">
                {item.title}
              </p>
              {item.detail && (
                <p className="mt-1 font-body text-[0.72rem] text-[#5c7066] line-clamp-2">
                  {item.detail}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {item.projectTitle && (
                  <span className="font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#6b7b72]">
                    {item.projectTitle}
                  </span>
                )}
                <span
                  className={`inline-block border px-1.5 py-0.5 font-mono-ui text-[0.48rem] uppercase tracking-[0.08em] ${tone}`}
                >
                  {item.type ?? "note"}
                </span>
                <span className="font-body text-[0.68rem] text-[#8a9a8e]">
                  {timeAgo(item.createdAt)}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
