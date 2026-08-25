import { getFirebaseFirestore } from "./firebase";

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

const USERS_COLLECTION = "users";

// Firestore's Admin SDK throws ("Cannot use 'undefined' as a Firestore value")
// if any field in a write is `undefined` — callers routinely pass optional
// fields as `undefined` (e.g. district for non-citizen roles), so every write
// must be filtered first.
function omitUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function normalize(data: FirebaseFirestore.DocumentData): UserProfile {
  return {
    ...(data as UserProfile),
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getFirebaseFirestore().collection(USERS_COLLECTION).doc(uid).get();
  return snapshot.exists ? normalize(snapshot.data()!) : null;
}

export async function createUserProfile(input: {
  uid: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  district?: string;
  authProvider: string;
}): Promise<UserProfile> {
  const now = new Date();
  const profile = { ...input, createdAt: now, updatedAt: now };
  await getFirebaseFirestore().collection(USERS_COLLECTION).doc(input.uid).set(omitUndefined(profile));
  return profile;
}

export async function updateUserProfile(uid: string, input: Partial<Omit<UserProfile, "uid" | "createdAt">>): Promise<UserProfile | null> {
  const ref = getFirebaseFirestore().collection(USERS_COLLECTION).doc(uid);
  await ref.set(omitUndefined({ ...input, updatedAt: new Date() }), { merge: true });
  return getUserProfile(uid);
}

export async function linkOrganizationOwner(uid: string, organizationId: number, role: "institution" | "industry"): Promise<void> {
  await updateUserProfile(uid, { organizationId, role });
}
