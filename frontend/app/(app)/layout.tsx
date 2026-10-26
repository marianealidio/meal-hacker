import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getSession();
  if (!me) {
    const path = (await headers()).get("x-pathname") ?? "/dashboard";
    redirect("/login?next=" + encodeURIComponent(path));
  }
  return <AppShell me={me}>{children}</AppShell>;
}
