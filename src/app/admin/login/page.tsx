import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, isStaff } from "@/server/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in — don't make staff log in twice.
  const session = await getSession();
  if (isStaff(session)) redirect(next?.startsWith("/admin") ? next : "/admin");

  return <LoginForm next={next} />;
}
