import { Loader2, MessageCircle, Reply, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { timeAgo } from "@/lib/timeago";
import { useAuth } from "@/hooks/useAuth";

type DiscussionKind =
  | "observation"
  | "question"
  | "solution_idea"
  | "local_knowledge"
  | "update";

type DiscussionPost = {
  id: number;
  parentPostId?: number | null;
  authorUid: string;
  authorName: string;
  authorRole: string;
  kind: DiscussionKind;
  content: string;
  createdAt: Date | string;
};

const kindLabel: Record<DiscussionKind, string> = {
  observation: "Observation",
  question: "Question",
  solution_idea: "Solution idea",
  local_knowledge: "Local knowledge",
  update: "Verified update",
};

const kindStyle: Record<DiscussionKind, string> = {
  observation: "bg-[#e5dfc9] text-[#445a4c]",
  question: "bg-[#dce6eb] text-[#2d6581]",
  solution_idea: "bg-[#e6ede3] text-[#3a6b4a]",
  local_knowledge: "bg-[#f3e5bd] text-[#8b641d]",
  update: "bg-[#f7e2d6] text-[#9a472b]",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");
}

function Composer({
  challengeId,
  parentPostId,
  onDone,
  compact = false,
}: {
  challengeId: number;
  parentPostId?: number | null;
  onDone?: () => void;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<DiscussionKind>("observation");
  const createPost = trpc.workflow.createChallengeDiscussionPost.useMutation({
    onSuccess: () => {
      setContent("");
      onDone?.();
      void utils.workflow.challengeDiscussionPosts.invalidate({ challengeId });
    },
    onError: error => toast.error("Couldn't post your contribution", { description: error.message }),
  });

  if (!user) {
    return (
      <p className="border border-dashed border-[#a58c6d]/45 bg-[#fbf6ec]/45 px-3 py-2.5 font-body text-[0.76rem] text-[#5e7168]">
        <a href="/login" className="font-semibold text-[#b84622] hover:underline">
          Sign in
        </a>{" "}
        to add local knowledge, a question, or a solution idea.
      </p>
    );
  }
  const signedInUser = user;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    // "admin" is reserved for the Firebase custom claim. An institution's
    // internal memberRole may also be named "admin", but it must display as
    // an institution contribution rather than impersonate a platform admin.
    const authorRole =
      me.data?.role === "admin"
        ? "admin"
        : me.data?.memberRole === "faculty" || me.data?.memberRole === "student"
          ? me.data.memberRole
          : me.data?.role ?? "citizen";
    createPost.mutate({
      challengeId,
      parentPostId: parentPostId ?? null,
      authorUid: signedInUser.uid,
      authorName: me.data?.name ?? signedInUser.displayName ?? signedInUser.email ?? "Community member",
      authorRole,
      kind,
      content: text,
    });
  }

  return (
    <form onSubmit={submit} className={compact ? "mt-2" : "mt-4"}>
      {!compact && (
        <label className="mb-2 flex items-center gap-2 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#61736a]">
          Contribution type
          <select
            value={kind}
            onChange={event => setKind(event.target.value as DiscussionKind)}
            className="border border-[#a58c6d]/45 bg-[#f8f2e8] px-2 py-1 font-body text-[0.72rem] normal-case tracking-normal text-[#294238] outline-none"
          >
            {Object.entries(kindLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={event => setContent(event.target.value)}
          maxLength={1200}
          rows={compact ? 2 : 3}
          placeholder={compact ? "Write a reply…" : "Add an observation, question, or practical idea…"}
          className="min-h-[3rem] flex-1 resize-y border border-[#a58c6d]/35 bg-white/60 px-3 py-2 font-body text-[0.8rem] leading-relaxed text-[#1d3a2f] outline-none placeholder:text-[#8a9a8e] focus:border-[#5c7a6a]"
        />
        <button
          type="submit"
          disabled={!content.trim() || createPost.isPending}
          className="h-fit shrink-0 rounded-full bg-[#c94a20] px-3 py-2.5 text-white transition hover:bg-[#ae3d1c] disabled:opacity-50"
          aria-label={parentPostId ? "Post reply" : "Post contribution"}
        >
          {createPost.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </form>
  );
}

function DiscussionPostCard({
  post,
  replies,
  challengeId,
}: {
  post: DiscussionPost;
  replies: DiscussionPost[];
  challengeId: number;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [replying, setReplying] = useState(false);
  const remove = trpc.workflow.deleteChallengeDiscussionPost.useMutation({
    onSuccess: () => void utils.workflow.challengeDiscussionPosts.invalidate({ challengeId }),
    onError: error => toast.error("Couldn't remove the post", { description: error.message }),
  });

  return (
    <article className="border-t border-[#a58c6d]/25 py-4 first:border-t-0 first:pt-0">
      <PostBody post={post} canDelete={post.authorUid === user?.uid} onDelete={() => remove.mutate({ id: post.id })} />
      <div className="mt-3 flex items-center gap-3 pl-11">
        <button
          type="button"
          onClick={() => setReplying(open => !open)}
          className="inline-flex items-center gap-1.5 font-body text-[0.72rem] font-semibold text-[#4a695b] hover:text-[#b84622]"
        >
          <Reply size={13} /> Reply
        </button>
        {replies.length > 0 && (
          <span className="font-body text-[0.7rem] text-[#77877e]">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
        )}
      </div>
      {replying && (
        <div className="ml-11 border-l border-[#b8a98b]/50 pl-3">
          <Composer challengeId={challengeId} parentPostId={post.id} compact onDone={() => setReplying(false)} />
        </div>
      )}
      {replies.length > 0 && (
        <div className="ml-8 mt-3 space-y-3 border-l border-[#b8a98b]/50 pl-3 sm:ml-11">
          {replies.map(reply => (
            <PostBody
              key={reply.id}
              post={reply}
              canDelete={reply.authorUid === user?.uid}
              onDelete={() => remove.mutate({ id: reply.id })}
              isReply
            />
          ))}
        </div>
      )}
    </article>
  );
}

function PostBody({
  post,
  canDelete,
  onDelete,
  isReply = false,
}: {
  post: DiscussionPost;
  canDelete: boolean;
  onDelete: () => void;
  isReply?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`grid shrink-0 place-items-center rounded-full bg-[#173d30] font-mono-ui text-[0.52rem] font-semibold text-white ${isReply ? "size-7" : "size-8"}`}>
        {initials(post.authorName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-body text-[0.78rem] font-semibold text-[#1c3d31]">{post.authorName}</span>
          <span className="font-body text-[0.68rem] text-[#7a8980]">{post.authorRole}</span>
          <span className={`rounded-full px-2 py-0.5 font-mono-ui text-[0.46rem] font-semibold uppercase tracking-[0.07em] ${kindStyle[post.kind]}`}>
            {kindLabel[post.kind]}
          </span>
          <span className="font-body text-[0.67rem] text-[#8a9a8e]">{timeAgo(post.createdAt)}</span>
          {canDelete && (
            <button type="button" onClick={onDelete} className="ml-auto text-[#a84626] hover:text-[#7c2f1b]" aria-label="Delete post">
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <p className="mt-1.5 whitespace-pre-wrap font-body text-[0.8rem] leading-relaxed text-[#294238]">{post.content}</p>
      </div>
    </div>
  );
}

export function ChallengeDiscussion({ challengeId }: { challengeId: number }) {
  const postsQuery = trpc.workflow.challengeDiscussionPosts.useQuery({ challengeId });
  const posts = (postsQuery.data ?? []) as DiscussionPost[];
  const { roots, repliesByParent } = useMemo(() => {
    const replyMap = new Map<number, DiscussionPost[]>();
    const rootPosts: DiscussionPost[] = [];
    for (const post of posts) {
      if (post.parentPostId == null) rootPosts.push(post);
      else replyMap.set(post.parentPostId, [...(replyMap.get(post.parentPostId) ?? []), post]);
    }
    return { roots: rootPosts, repliesByParent: replyMap };
  }, [posts]);

  return (
    <section className="mt-5 border border-[#a58c6d]/45 bg-[#f8f2e8]/65 p-4 sm:p-5" aria-label="Community discussion">
      <div className="flex items-center gap-2">
        <MessageCircle size={17} className="text-[#b84622]" />
        <div>
          <h3 className="font-display text-[1.15rem] text-[#183b2e]">Community discussion</h3>
          <p className="font-body text-[0.72rem] text-[#65756c]">Share context that can help shape a practical solution.</p>
        </div>
      </div>
      <Composer challengeId={challengeId} />
      <div className="mt-5">
        {postsQuery.isLoading ? (
          <p className="flex items-center gap-2 font-body text-[0.78rem] text-[#65756c]"><Loader2 size={14} className="animate-spin" /> Loading discussion…</p>
        ) : postsQuery.isError ? (
          <p className="font-body text-[0.78rem] text-[#a84626]">The discussion could not be loaded. Please try again.</p>
        ) : roots.length === 0 ? (
          <p className="border-t border-[#a58c6d]/25 pt-4 font-body text-[0.78rem] text-[#65756c]">No contributions yet. Local experience is often the missing piece.</p>
        ) : (
          roots.map(post => <DiscussionPostCard key={post.id} post={post} replies={repliesByParent.get(post.id) ?? []} challengeId={challengeId} />)
        )}
      </div>
    </section>
  );
}
