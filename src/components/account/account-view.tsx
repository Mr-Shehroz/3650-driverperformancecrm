import { Mail, Phone, ShieldCheck } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Pill } from "@/components/shared/pill";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { ROLE_LABELS, type User } from "@/types";

export function AccountView({ user }: { user: User }) {
  return (
    <div>
      <PageHeader
        title="My profile"
        description="Your account details and password."
      />

      <div className="mb-6 overflow-hidden rounded-2xl bg-secondary text-white">
        <div className="h-1 bg-primary" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <UserAvatar name={user.name} className="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-bold">{user.name}</h2>
              <Pill className="bg-primary text-white">
                <ShieldCheck className="h-3.5 w-3.5" /> {ROLE_LABELS[user.role]}
              </Pill>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-sm text-white/65 sm:flex-row sm:gap-5">
              <span className="flex min-w-0 items-center gap-1.5">
                <Mail className="h-4 w-4 shrink-0" />{" "}
                <span className="truncate">{user.email}</span>
              </span>
              {user.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ProfileForm key={`${user.name}-${user.phone}`} user={user} />
        <PasswordForm />
      </div>
    </div>
  );
}
