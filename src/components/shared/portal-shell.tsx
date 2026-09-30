"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LogoutButton } from "@/components/shared/logout-button";
import { getActiveHref, type NavGroup, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { UserMenu } from "@/components/shared/user-menu";
import { OfflineBanner } from "@/components/pwa/offline-banner";

/* ---------- Sidebar preference store (localStorage) ---------- */
const STORAGE_KEY = "drs_sidebar_collapsed";
const listeners = new Set<() => void>();

function subscribeCollapsed(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getCollapsedSnapshot(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === "1";
  } catch {}
  // No saved choice: collapse by default on smaller laptops
  return window.innerWidth < 1280;
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

function saveCollapsed(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

/* ---------- Types ---------- */
type Props = {
  user: User;
  roleLabel: string;
  homeHref: string;
  navGroups: NavGroup[];
  /** If provided, mobile shows a bottom nav instead of the hamburger drawer */
  bottomNav?: NavItem[];
  /** Max width of the page content */
  contentClassName?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
};

function SidebarContent({
  user,
  homeHref,
  navGroups,
  active,
  rail = false,
  onClose,
}: {
  user: User;
  homeHref: string;
  navGroups: NavGroup[];
  active?: string;
  rail?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border",
          rail ? "justify-center px-0" : "justify-between px-5",
        )}
      >
        <Link href={homeHref} aria-label="Home">
          <Brand compact textClassName={rail ? "hidden" : undefined} />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Links */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden px-3 py-5",
          rail ? "space-y-3" : "space-y-6",
        )}
      >
        {navGroups.map((group, gi) => (
          <div key={group.title}>
            {rail ? (
              gi > 0 && <div className="mx-auto mb-3 h-px w-8 bg-white/10" />
            ) : (
              <p className="mb-2 whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
                {group.title}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = active === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      title={rail ? label : undefined}
                      aria-label={label}
                      className={cn(
                        "relative flex h-11 items-center gap-3 rounded-lg text-[15px] font-medium transition",
                        rail ? "justify-center px-0" : "px-3",
                        isActive
                          ? "bg-sidebar-accent text-white"
                          : "text-white/65 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {isActive && (
                        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-primary" />
                      )}
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive && "text-primary",
                        )}
                      />
                      {!rail && (
                        <span className="truncate whitespace-nowrap">
                          {label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-sidebar-border p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div
          className={cn(
            "flex items-center rounded-lg",
            rail ? "flex-col gap-2 py-2" : "gap-2",
          )}
        >
          <Link
            href={`${homeHref}/profile`}
            title={rail ? `${user.name} · My profile` : "My profile"}
            className={cn(
              "flex min-w-0 items-center rounded-lg transition hover:bg-white/5",
              rail ? "justify-center p-1" : "flex-1 gap-3 px-2 py-2",
            )}
          >
            <UserAvatar
              name={user.name}
              src={user.avatarUrl}
              className="h-11 w-11"
            />
            {!rail && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user.name}
                </p>
                <p className="truncate text-xs text-white/50">{user.email}</p>
              </div>
            )}
          </Link>
          <LogoutButton tone="dark" iconOnly />
        </div>
      </div>
    </>
  );
}

export function PortalShell({
  user,
  roleLabel,
  homeHref,
  navGroups,
  bottomNav,
  contentClassName = "",
  children,
  headerExtra,
}: Props) {
  const pathname = usePathname();
  const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));
  const active = getActiveHref(pathname, allHrefs);
  const bottomActive = bottomNav
    ? getActiveHref(
        pathname,
        bottomNav.map((i) => i.href),
      )
    : undefined;
  const hasBottomNav = !!bottomNav?.length;

  // Desktop sidebar: read from localStorage without an effect
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  // Mobile drawer: remembers which page it was opened on,
  // so it closes automatically when the page changes
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const open = drawerPath === pathname;
  const openDrawer = () => setDrawerPath(pathname);
  const closeDrawer = () => setDrawerPath(null);

  // Enable width transitions only after first paint (avoids animation on load)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Lock page scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the drawer if the screen grows to desktop size while it's open
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setDrawerPath(null);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="min-h-dvh bg-muted/40">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-sidebar lg:flex",
          collapsed ? "w-[88px]" : "w-[272px]",
          ready && "transition-[width] duration-200 ease-out",
        )}
      >
        <SidebarContent
          user={user}
          homeHref={homeHref}
          navGroups={navGroups}
          active={active}
          rail={collapsed}
        />
      </aside>

      {/* Mobile / tablet drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
            onClick={closeDrawer}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-[300px] flex-col bg-sidebar pt-[env(safe-area-inset-top)] shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent
              user={user}
              homeHref={homeHref}
              navGroups={navGroups}
              active={active}
              onClose={closeDrawer}
            />
          </aside>
        </div>
      )}

      <div
        className={cn(
          collapsed ? "lg:pl-[88px]" : "lg:pl-[272px]",
          ready && "transition-[padding] duration-200 ease-out",
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div
            className={cn(
              "mx-auto flex h-14 w-full items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8",
              contentClassName,
            )}
          >
            {/* Mobile / tablet: open drawer */}
            <button
              onClick={openDrawer}
              aria-label="Open menu"
              className={cn(
                "-ml-2 h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted lg:hidden",
                hasBottomNav ? "hidden md:flex" : "flex",
              )}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Desktop: collapse / expand sidebar */}
            <button
              onClick={() => saveCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="-ml-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>

            <Link
              href={homeHref}
              className="min-w-0 lg:hidden"
              aria-label="Home"
            >
              <Brand
                tone="light"
                compact
                textClassName="hidden min-[400px]:block"
              />
            </Link>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {headerExtra}
              <UserMenu
                user={user}
                roleLabel={roleLabel}
                profileHref={`${homeHref}/profile`}
              />
            </div>
          </div>
          <OfflineBanner />
        </header>

        <main
          className={cn(
            "mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8",
            hasBottomNav &&
              "pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-8",
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {hasBottomNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden">
          <div
            className="mx-auto grid max-w-lg"
            style={{
              gridTemplateColumns: `repeat(${bottomNav!.length}, minmax(0, 1fr))`,
            }}
          >
            {bottomNav!.map(({ href, label, icon: Icon }) => {
              const isActive = bottomActive === href;
              const isPrimary = href.endsWith("/new");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition min-[400px]:h-[68px]",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {isPrimary ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30">
                      <Icon className="h-5 w-5" />
                    </span>
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
