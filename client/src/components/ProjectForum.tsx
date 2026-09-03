import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { ForumPostCard } from "./ForumPostCard";
import { EmptyState } from "./EmptyState";

export function ProjectForum({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const postsQuery = trpc.workflow.forumPosts.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );
  const posts = postsQuery.data ?? [];
  const [content, setContent] = useState("");

  const createPost = trpc.workflow.createForumPost.useMutation({
    onSuccess: () => {
      void utils.workflow.forumPosts.invalidate({ projectId });
      setContent("");
    },
    onError: e => toast.error("Couldn't post", { description: e.message }),
  });
  const updatePost = trpc.workflow.updateForumPost.useMutation({
    onSuccess: () => void utils.workflow.forumPosts.invalidate({ projectId }),
  });
  const deletePost = trpc.workflow.deleteForumPost.useMutation({
    onSuccess: () => void utils.workflow.forumPosts.invalidate({ projectId }),
    onError: e => toast.error("Couldn't delete", { description: e.message }),
  });

  const memberRole =
    (me.data?.memberRole as string) ??
    (me.data?.role === "institution" ? "admin" : "citizen");
  const canPin = memberRole === "admin" || memberRole === "faculty";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || !user) return;
    createPost.mutate({
      projectId,
      authorUid: user.uid,
      authorName: me.data?.name ?? user.displayName ?? user.email ?? "Member",
      authorRole: memberRole,
      content: text,
    });
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex gap-3 border border-[#a58c6d]/30 bg-[#f8f2e8]/30 p-3"
      >
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Share an idea, ask a question, or give an update…"
          rows={2}
          className="min-h-[3rem] flex-1 resize-none bg-white/60 px-3 py-2 font-body text-[0.82rem] outline-none placeholder:text-[#8a9a8e]"
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (content.trim()) submit(e as any);
            }
          }}
        />
        <button
          type="submit"
          disabled={!content.trim() || createPost.isPending}
          className="h-fit shrink-0 rounded-full bg-[#c94a20] px-5 py-2.5 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#b8431d] disabled:opacity-50"
        >
          {createPost.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Send size={13} /> Post
            </span>
          )}
        </button>
      </form>

      {postsQuery.isLoading ? (
        <div className="mt-4 flex items-center gap-2 font-body text-[0.78rem] text-[#5c7066]">
          <Loader2 size={14} className="animate-spin" /> Loading discussion…
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No discussion yet"
            description="Be the first to share an idea for this project."
          />
        </div>
      ) : (
        <motion.div layout className="mt-4 space-y-3">
          <AnimatePresence>
            {posts.map(post => (
              <ForumPostCard
                key={post.id}
                post={post as any}
                isAuthor={(post as any).authorUid === user?.uid}
                canPin={canPin}
                onPin={() =>
                  updatePost.mutate({
                    id: post.id,
                    isPinned: !(post as any).isPinned,
                  })
                }
                onDelete={() => deletePost.mutate({ id: post.id })}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
