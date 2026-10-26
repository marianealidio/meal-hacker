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
  const path = ((await headers()).get("x-pathname") ?? "/dashboard").split("?")[0];
  const exempt = path === "/onboarding" || path.startsWith("/onboarding/") || path === "/profile" || path.startsWith("/profile/");
  if (me.onboarded === false && !exempt) redirect("/onboarding");
  return <AppShell me={me}>{children}</AppShell>;
}
