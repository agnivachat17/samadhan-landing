import PublicPortalHeader from "@/components/PublicPortalHeader";
import { useAuth } from "@/hooks/useAuth";
import { BellOff, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function CitizenFollowing() {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const supportsQuery = trpc.workflow.challengeSupports.useQuery(
    { supporterEmail: email },
    { enabled: Boolean(email) }
  );
  const [input] = useState({});
  const challengesQuery = trpc.workflow.challenges.useQuery(input);
  const utils = trpc.useUtils();
  const unfollow = trpc.workflow.deleteChallengeSupport.useMutation({
    onSuccess: () => void utils.workflow.challengeSupports.invalidate(),
  });
  const follows = useMemo(
    () =>
      (supportsQuery.data ?? [])
        .filter(item => item.kind === "follow")
        .map(item => ({
          support: item,
          challenge: (challengesQuery.data ?? []).find(
            challenge => challenge.id === item.challengeId
          ),
        }))
        .filter(item => item.challenge),
    [supportsQuery.data, challengesQuery.data]
  );
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <PublicPortalHeader />
      <section className="px-6 py-10 sm:px-10 lg:px-[5rem]">
        <div className="mx-auto max-w-[72rem]">
          <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
            Citizen follow management
          </p>
          <h1 className="mt-4 font-display text-[4.2rem] leading-[0.86] tracking-[-0.04em]">
            Following.
          </h1>
          <p className="mt-5 font-body text-[0.88rem] text-[#53675d]">
            Review the civic challenges you chose to follow and stop receiving
            workflow notices when they are no longer relevant.
          </p>
          {!email ? (
            <Empty label="Your account has no email on file." />
          ) : supportsQuery.isLoading || challengesQuery.isLoading ? (
            <Loading />
          ) : supportsQuery.isError || challengesQuery.isError ? (
            <Failure
              message={
                supportsQuery.error?.message ||
                challengesQuery.error?.message ||
                "Follow records could not load."
              }
              retry={() => {
                void supportsQuery.refetch();
                void challengesQuery.refetch();
              }}
            />
          ) : follows.length === 0 ? (
            <Empty label="You are not following any challenge records yet." />
          ) : (
            <div className="mt-8 space-y-4">
              {follows.map(({ support, challenge }) => (
                <article
                  key={support.id}
                  className="flex flex-col justify-between gap-5 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-5 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-mono-ui text-[0.54rem] uppercase tracking-[0.08em] text-[#64776d]">
                      {challenge?.domain} · {challenge?.district} ·{" "}
                      {challenge?.status.replaceAll("_", " ")}
                    </p>
                    <a
                      href={`/challenges/${challenge?.id}`}
                      className="mt-3 block font-display text-[1.8rem] leading-none hover:text-[#bd4a26]"
                    >
                      {challenge?.title}
                    </a>
                    <p className="mt-3 font-body text-[0.75rem] text-[#5b7066]">
                      Followed{" "}
                      {support.createdAt
                        ? new Date(support.createdAt).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <button
                    disabled={unfollow.isPending}
                    type="button"
                    onClick={() => unfollow.mutate({ id: support.id })}
                    className="rounded-full inline-flex items-center justify-center gap-2 border border-[#bd5a38]/70 px-4 py-3 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.08em] text-[#ab4826]"
                  >
                    <BellOff size={15} />
                    Stop following
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
function Loading() {
  return (
    <div className="mt-8 flex items-center gap-3 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading followed challenges…
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return (
    <div className="mt-8 border border-dashed border-[#a58c6d]/55 p-8 text-center font-body text-[0.8rem] text-[#586d63]">
      {label}
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-8 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-6"
    >
      <p className="font-body text-[0.76rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.54rem] uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
