import { PageHeader } from "@/components/shared/page-header";
import { ProfileCard } from "./profile-card";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import type { User } from "@/types";
import s from "./account.module.css";

export function AccountView({ user }: { user: User }) {
  return (
    <div>
      <PageHeader
        title="My profile"
        description="Your photo, account details and password."
      />

      <div className={s.layout}>
        <aside className={s.aside}>
          <ProfileCard user={user} />
        </aside>

        <div className="min-w-0 space-y-6">
          <ProfileForm key={`${user.name}-${user.phone}`} user={user} />
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
