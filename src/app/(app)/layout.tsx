import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Logo from "@/components/Logo";
import NavLinks from "@/components/NavLinks";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-navy-800 bg-navy-950">
        <div className="border-b border-navy-800 px-5 py-5">
          <Logo light />
        </div>
        <NavLinks />
        <div className="border-t border-navy-800 p-4">
          <p className="truncate text-xs text-navy-300" title={user.email}>
            {user.email}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <main className="ml-60 flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
