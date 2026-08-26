import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { firebaseApp } from "./firebase";

export type UserRole = "citizen" | "institution" | "industry" | "admin";

export type UserProfile = {
  uid: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  district?: string;
  organizationId?: number;
  authProvider: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Roles a user is allowed to assign to themselves during signup. "admin" is
 * deliberately absent — see `resolveRole`.
 */
export const SELF_ASSIGNABLE_ROLES = ["citizen", "institution", "industry"] as const;
export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

const db = getFirestore(firebaseApp);
const USERS_COLLECTION = "users";

function omitUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const candidate = value as { toDate?: () => Date } | null;
  return candidate?.toDate?.() ?? new Date();
}

function normalize(data: Record<string, unknown>): UserProfile {
  return {
    ...(data as unknown as UserProfile),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/**
 * Admin is granted exclusively by the `admin` Firebase Auth custom claim, which
 * only the Admin SDK can set (see scripts/grant-admin.mjs). It is never read
 * from the user's Firestore document, because the user can write that document
 * — `firestore.rules` additionally rejects any attempt to store role "admin".
 *
 * This replaces the old server-side ADMIN_EMAILS check, which no longer has a
 * server to run on.
 */
async function resolveRole(user: User, storedRole: UserRole | undefined): Promise<UserRole> {
  const token = await user.getIdTokenResult();
  if (token.claims.admin === true) return "admin";
  if (storedRole && storedRole !== "admin") return storedRole;
  return "citizen";
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snapshot.exists() ? normalize(snapshot.data()) : null;
}

/**
 * Loads the signed-in user's profile, creating it on first sight. This is the
 * browser-side equivalent of what `server/_core/context.ts` used to do on every
 * authenticated request.
 */
export async function loadOrCreateProfile(user: User): Promise<UserProfile> {
  const existing = await getUserProfile(user.uid);
  const role = await resolveRole(user, existing?.role);

  if (existing) return { ...existing, role };

  const now = new Date();
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    role,
    authProvider: user.providerData[0]?.providerId ?? "password",
    createdAt: now,
    updatedAt: now,
  };

  // An admin's claim is authoritative, but the stored document must never
  // contain role "admin" — the rules reject it.
  await setDoc(
    doc(db, USERS_COLLECTION, user.uid),
    omitUndefined({ ...profile, role: role === "admin" ? "citizen" : role })
  );
  return profile;
}

export async function updateUserProfile(
  user: User,
  input: Partial<Omit<UserProfile, "uid" | "createdAt" | "role">> & { role?: SelfAssignableRole }
): Promise<UserProfile | null> {
  await setDoc(
    doc(db, USERS_COLLECTION, user.uid),
    omitUndefined({ ...input, updatedAt: new Date() }),
    { merge: true }
  );
  const stored = await getUserProfile(user.uid);
  if (!stored) return null;
  return { ...stored, role: await resolveRole(user, stored.role) };
}

export async function linkOrganizationOwner(
  user: User,
  organizationId: number,
  role: "institution" | "industry"
): Promise<void> {
  await updateUserProfile(user, { organizationId, role });
}
