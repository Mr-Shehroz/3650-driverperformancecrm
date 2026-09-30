"use client";

import { useState } from "react";
import {
  Camera,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAvatarUpload } from "@/components/shared/avatar-uploader";
import { ROLE_LABELS, type User } from "@/types";
import { cn } from "@/lib/utils";
import s from "./account.module.css";

export function ProfileCard({ user }: { user: User }) {
  const { preview, busy, pick, upload, remove, input } = useAvatarUpload(
    user.id,
    user.avatarUrl,
  );
  const [dragging, setDragging] = useState(false);

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files?.[0]);
      }}
      className={cn(s.card, dragging && s.dragging)}
    >
      {/* Banner */}
      <div className={s.banner}>
        <div className={s.bannerLines} aria-hidden />
        <div className={s.bannerGlow} aria-hidden />
        <div className={s.bannerStripe} aria-hidden />
      </div>

      <div className={s.body}>
        {/* Avatar */}
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          aria-label="Change photo"
          className={s.avatarBtn}
        >
          <UserAvatar name={user.name} src={preview} size={120} />
          <span className={cn(s.overlay, busy && s.overlayVisible)}>
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
            {busy ? "Uploading" : "Change"}
          </span>
          {!busy && (
            <span className={s.badge}>
              <Camera className="h-4 w-4" />
            </span>
          )}
        </button>

        {/* Name + role */}
        <h2 className="mt-4 max-w-full truncate text-2xl font-bold">
          {user.name}
        </h2>
        <span className={s.role}>
          <ShieldCheck className="h-3.5 w-3.5" /> {ROLE_LABELS[user.role]}
        </span>

        {/* Contact */}
        <div className={s.contact}>
          <div className={s.contactRow}>
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{user.email}</span>
          </div>
          <div className={s.contactRow}>
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "min-w-0 truncate",
                !user.phone && "text-muted-foreground",
              )}
            >
              {user.phone ?? "No phone added"}
            </span>
          </div>
        </div>

        {/* Photo actions */}
        <div className={cn(s.actions, preview && s.actionsTwo)}>
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {preview ? "Change photo" : "Upload photo"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg border bg-white px-4 text-sm font-semibold text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {dragging
            ? "Drop the photo to upload it"
            : "JPG, PNG or WebP. You can also drag a photo onto this card."}
        </p>
      </div>

      {input}
    </section>
  );
}
