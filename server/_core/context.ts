import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyFirebaseIdToken } from "../firebase";
import { createUserProfile, getUserProfile, type UserProfile } from "../users";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: UserProfile | null;
};

function getBearerToken(req: CreateExpressContextOptions["req"]): string | null {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

async function loadOrCreateProfile(decoded: { uid: string; email?: string; name?: string; firebase: { sign_in_provider: string } }): Promise<UserProfile> {
  const existing = await getUserProfile(decoded.uid);
  if (existing) return existing;

  const email = decoded.email?.toLowerCase() ?? null;
  const role = email && ENV.adminEmails.includes(email) ? "admin" : "citizen";

  return createUserProfile({
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: decoded.name ?? null,
    role,
    authProvider: decoded.firebase.sign_in_provider,
  });
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: UserProfile | null = null;

  const token = getBearerToken(opts.req);
  if (token) {
    try {
      const decoded = await verifyFirebaseIdToken(token);
      user = await loadOrCreateProfile(decoded);
      const email = decoded.email?.toLowerCase() ?? null;
      if (email && ENV.adminEmails.includes(email) && user.role !== "admin") {
        user = { ...user, role: "admin" };
      }
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
