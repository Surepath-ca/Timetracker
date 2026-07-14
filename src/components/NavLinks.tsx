"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/tracker", label: "Time Tracker" },
  { href: "/projects", label: "Projects" },
  { href: "/reports", label: "Reports & Invoices" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative px-3 py-2 text-sm font-medium transition ${
              active ? "text-surepath-600" : "text-slate-600 hover:text-surepath-600"
            }`}
          >
            {link.label}
            {active && (
              <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-surepath-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
