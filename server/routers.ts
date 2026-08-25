import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { workflowRouter } from "./routers/workflow";
import { updateUserProfile } from "./users";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    // Called right after Firebase sign-up to record which pathway (citizen /
    // institution / industry) the account belongs to. Role can never be
    // escalated to "admin" here — that's only granted via ADMIN_EMAILS.
    bootstrapProfile: protectedProcedure
      .input(z.object({
        role: z.enum(["citizen", "institution", "industry"]),
        name: z.string().trim().min(1).max(255).optional(),
        district: z.string().trim().max(128).optional(),
      }))
      .mutation(({ input, ctx }) => {
        if (ctx.user.role === "admin") return ctx.user;
        return updateUserProfile(ctx.user.uid, input);
      }),
  }),
  workflow: workflowRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
