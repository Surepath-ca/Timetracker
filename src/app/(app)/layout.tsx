import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Logo from "@/components/Logo";
import NavLinks from "@/components/NavLinks";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Brand accent bar */}
      <div className="h-1 w-full bg-surepath-500" />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <a href="/tracker" className="shrink-0">
              <Logo className="h-9" />
            </a>
            <div className="hidden md:block">
              <NavLinks />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline" title={user.email}>
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
        {/* Mobile nav */}
        <div className="border-t border-slate-100 px-6 py-2 md:hidden">
          <NavLinks />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
