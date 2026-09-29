import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { cn } from "@/lib/utils";

type Props = {
  tone?: "dark" | "light";
  iconOnly?: boolean;
  className?: string;
};

export function LogoutButton({
  tone = "light",
  iconOnly = false,
  className,
}: Props) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label="Log out"
        className={cn(
          "flex items-center gap-2 rounded-lg text-sm font-medium transition",
          iconOnly ? "h-10 w-10 justify-center" : "h-10 px-3",
          tone === "dark"
            ? "text-white/70 hover:bg-white/10 hover:text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <LogOut className="h-[18px] w-[18px]" />
        {!iconOnly && <span>Log out</span>}
      </button>
    </form>
  );
}
