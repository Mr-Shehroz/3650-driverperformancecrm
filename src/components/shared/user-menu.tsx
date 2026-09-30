"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { logoutAction } from "@/app/(auth)/login/actions";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export function UserMenu({
  user,
  roleLabel,
  profileHref,
}: {
  user: User;
  roleLabel: string;
  profileHref: string;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  // Remembers the page it was opened on, so it closes on navigation
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpenOn(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-foreground/85 transition hover:bg-muted hover:text-foreground";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpenOn(open ? null : pathname)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-1 transition hover:bg-muted sm:gap-3 sm:pl-3 sm:pr-2"
      >
        <div className="hidden text-right sm:block">
          <p className="max-w-[180px] truncate text-sm font-semibold leading-tight">
            {user.name}
          </p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>
        <UserAvatar
          name={user.name}
          src={user.avatarUrl}
          className="h-11 w-11"
        />
        <ChevronDown
          className={cn(
            "hidden h-4 w-4 text-muted-foreground transition sm:block",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-white shadow-xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center gap-3 border-b px-4 py-4">
            <UserAvatar
              name={user.name}
              src={user.avatarUrl}
              className="h-11 w-11"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                {roleLabel}
              </p>
            </div>
          </div>

          <div className="p-2">
            <Link href={profileHref} role="menuitem" className={item}>
              <UserRound className="h-[18px] w-[18px] text-muted-foreground" />{" "}
              My profile
            </Link>
            <Link
              href={`${profileHref}#password`}
              role="menuitem"
              className={item}
            >
              <KeyRound className="h-[18px] w-[18px] text-muted-foreground" />{" "}
              Change password
            </Link>
          </div>

          <div className="border-t p-2">
            <form action={logoutAction}>
              <button
                type="submit"
                role="menuitem"
                className={cn(
                  item,
                  "text-red-700 hover:bg-red-50 hover:text-red-700",
                )}
              >
                <LogOut className="h-[18px] w-[18px]" /> Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
