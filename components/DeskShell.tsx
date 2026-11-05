"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell" },
  { href: "/activity", label: "Activity" },
];

export function DeskShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="mark" aria-hidden />
          <span>
            <p className="brand-name">CHUKO</p>
            <p className="brand-sub">Breet desk</p>
          </span>
        </Link>
        <nav className="nav" aria-label="Desk">
          {LINKS.map((link) => {
            const current = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <p className="sidebar-foot">
          Sandbox calls go to api.breet.io with the app secret kept on the server.
        </p>
      </aside>
      <main className="stage">{children}</main>
    </div>
  );
}
