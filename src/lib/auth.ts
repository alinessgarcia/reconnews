import type { Session, User } from "@supabase/supabase-js";

const rawAdminEmails =
  (import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? "";

const adminEmails = new Set(
  rawAdminEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export const allowAdminSignup =
  ((import.meta.env.VITE_ALLOW_ADMIN_SIGNUP as string | undefined) ?? "false")
    .trim()
    .toLowerCase() === "true";

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  const roleCandidates = [
    (user.app_metadata?.role as string | undefined) ?? "",
    (user.user_metadata?.role as string | undefined) ?? "",
    ((user as unknown as { role?: string | null }).role ?? "") as string,
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean);

  if (
    roleCandidates.includes("admin") ||
    roleCandidates.includes("service_role")
  ) {
    return true;
  }

  const email = (user.email ?? "").toLowerCase();
  return email !== "" && adminEmails.has(email);
}

export function isAdminSession(session: Session | null): boolean {
  return isAdminUser(session?.user);
}
