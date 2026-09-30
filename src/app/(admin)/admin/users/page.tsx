import Link from "next/link";
import { Search, Users as UsersIcon, X } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getUsers } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ParamPills } from "@/components/shared/param-pills";
import { Pill } from "@/components/shared/pill";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AddUserButton } from "@/components/admin/add-user-button";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { ROLE_LABELS, type Role } from "@/types";

const ROLE_TONE: Record<Role, "dark" | "primary" | "neutral"> = {
  admin: "dark",
  driver: "primary",
  sales_rep: "neutral",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const me = await requireRole("admin");
  const { role, q = "" } = await searchParams;
  const all = await getUsers();

  const roleFilter = role && role in ROLE_LABELS ? (role as Role) : undefined;
  const query = q.trim().toLowerCase();
  const users = all
    .filter((u) => !roleFilter || u.role === roleFilter)
    .filter(
      (u) =>
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query),
    )
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
    );

  const count = (r: Role) => all.filter((u) => u.role === r).length;
  const roleOptions = (Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
    value: r,
    label: `${ROLE_LABELS[r]}s (${count(r)})`,
  }));

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${all.filter((u) => u.active).length} active of ${all.length} total`}
        actions={<AddUserButton currentUserId={me.id} />}
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <ParamPills
          param="role"
          options={roleOptions}
          allLabel={`All (${all.length})`}
        />
        <form className="relative lg:w-80">
          {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or email"
            className="h-11 w-full rounded-lg border bg-white pl-10 pr-10 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
          />
          {q && (
            <Link
              href={
                roleFilter ? `/admin/users?role=${roleFilter}` : "/admin/users"
              }
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </form>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users found"
          description="Try a different search or role."
        />
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <div
                key={u.id}
                className={
                  u.active
                    ? "rounded-xl border bg-card p-4"
                    : "rounded-xl border border-dashed bg-card p-4 opacity-75"
                }
              >
                <div className="flex items-center gap-3">
                  <UserAvatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {u.name}{" "}
                      {u.id === me.id && (
                        <span className="text-xs font-medium text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Pill>
                  {u.active ? (
                    <Pill tone="success">Active</Pill>
                  ) : (
                    <Pill>Inactive</Pill>
                  )}
                  {u.phone && (
                    <span className="text-sm text-muted-foreground">
                      {u.phone}
                    </span>
                  )}
                </div>
                <div className="mt-3 border-t pt-3">
                  <UserRowActions user={u} currentUserId={me.id} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={
                        u.active ? "" : "bg-muted/20 text-muted-foreground"
                      }
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={u.name}
                            className="h-9 w-9 text-xs"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">
                              {u.name}{" "}
                              {u.id === me.id && (
                                <span className="text-xs font-medium text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="truncate text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={ROLE_TONE[u.role]}>
                          {ROLE_LABELS[u.role]}
                        </Pill>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {u.phone ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        {u.active ? (
                          <Pill tone="success">Active</Pill>
                        ) : (
                          <Pill>Inactive</Pill>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <UserRowActions user={u} currentUserId={me.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
