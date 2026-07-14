"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="mt-2 w-full rounded-md border border-navy-700 px-3 py-1.5 text-xs font-medium text-navy-200 transition hover:bg-navy-900 hover:text-white"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
