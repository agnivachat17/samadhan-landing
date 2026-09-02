import { motion } from "framer-motion";
import { Pin, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/timeago";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

const roleStyle: Record<string, string> = {
  admin: "bg-[#16422f] text-white",
  faculty: "bg-[#7ea68a] text-white",
  student: "bg-[#c94a20] text-white",
};

export function ForumPostCard({
  post,
  isAuthor,
  canPin,
  onPin,
  onDelete,
}: {
  post: {
    id: number;
    authorName: string;
    authorRole: string;
    content: string;
    isPinned?: boolean;
    createdAt: string | Date;
  };
  isAuthor: boolean;
  canPin: boolean;
  onPin?: () => void;
  onDelete?: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`border p-4 ${post.isPinned ? "border-[#c79e7a] bg-[#fef3e2]/60" : "border-[#a58c6d]/30 bg-[#f8f2e8]/35"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-full bg-[#132e24] font-mono-ui text-[0.55rem] font-semibold text-white">
            {initials(post.authorName)}
          </div>
          <div>
            <p className="font-body text-[0.82rem] font-semibold text-[#132e24]">
              {post.authorName}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 font-mono-ui text-[0.48rem] font-semibold uppercase tracking-[0.08em] ${roleStyle[post.authorRole] ?? "bg-[#6b7b72] text-white"}`}
              >
                {post.authorRole}
              </span>
              <span className="font-body text-[0.68rem] text-[#8a9a8e]">
                {timeAgo(post.createdAt)}
              </span>
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.08em] text-[#9b3e20]">
                  <Pin size={10} /> Pinned
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canPin && (
            <button
              type="button"
              onClick={onPin}
              className="rounded-full p-1.5 text-[#5e7966] hover:bg-[#e5ddd0] hover:text-[#16422f]"
              title={post.isPinned ? "Unpin" : "Pin"}
            >
              <Pin
                size={14}
                className={post.isPinned ? "fill-[#c94a20] text-[#c94a20]" : ""}
              />
            </button>
          )}
          {isAuthor && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full p-1.5 text-[#a84626] hover:bg-[#f7e2d6]"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap font-body text-[0.82rem] leading-relaxed text-[#1d3a2f]">
        {post.content}
      </p>
    </motion.div>
  );
}
