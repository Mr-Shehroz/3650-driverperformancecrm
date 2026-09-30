"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "./user-avatar";
import { createClient } from "@/lib/supabase/client";
import { squareImage } from "@/lib/image";
import { updateAvatarAction } from "@/app/actions/account";
import { cn } from "@/lib/utils";
import s from "./avatar-uploader.module.css";

const MAX_BYTES = 10 * 1024 * 1024; // original file limit before we shrink it

/** Shared upload / remove logic for profile photos */
export function useAvatarUpload(userId: string, avatarUrl?: string) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, startTransition] = useTransition();

  // Local preview that follows the saved URL whenever it changes
  const [prevUrl, setPrevUrl] = useState(avatarUrl);
  const [preview, setPreview] = useState(avatarUrl);
  if (avatarUrl !== prevUrl) {
    setPrevUrl(avatarUrl);
    setPreview(avatarUrl);
  }

  const pick = () => {
    if (!busy) inputRef.current?.click();
  };

  const upload = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That image is too large (max 10 MB).");
      return;
    }

    startTransition(async () => {
      try {
        const blob = await squareImage(file);
        const supabase = createClient();
        const path = `${userId}/${Date.now()}.webp`;

        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, blob, { contentType: "image/webp", upsert: false });
        if (upErr) throw upErr;

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        const res = await updateAvatarAction(userId, data.publicUrl);
        if (res?.error) throw new Error(res.error);

        setPreview(data.publicUrl);
        toast.success("Photo updated");
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Couldn't upload the photo.",
        );
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  const remove = () =>
    startTransition(async () => {
      const res = await updateAvatarAction(userId, null);
      if (res?.error) toast.error(res.error);
      else {
        setPreview(undefined);
        toast.success("Photo removed");
        router.refresh();
      }
    });

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic,image/*"
      className="hidden"
      onChange={(e) => upload(e.target.files?.[0])}
    />
  );

  return { preview, busy, pick, upload, remove, input };
}

/** Compact photo picker for the admin "Edit user" dialog */
export function AvatarUploader({
  userId,
  name,
  avatarUrl,
  className,
}: {
  userId: string;
  name: string;
  avatarUrl?: string;
  className?: string;
}) {
  const { preview, busy, pick, upload, remove, input } = useAvatarUpload(
    userId,
    avatarUrl,
  );
  const [dragging, setDragging] = useState(false);

  return (
    <div
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
      className={cn(s.box, dragging && s.dragging, className)}
    >
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        aria-label="Change photo"
        className={s.avatarBtn}
      >
        <UserAvatar name={name} src={preview} size={72} />
        <span className={cn(s.overlay, busy && s.overlayVisible)}>
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          {busy ? "Uploading" : "Change"}
        </span>
        {!busy && (
          <span className={s.badge}>
            <Camera className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      <div className={s.info}>
        <p className={s.title}>Profile photo</p>
        <p className={s.hint}>
          {dragging
            ? "Drop the photo to upload it"
            : "JPG, PNG or WebP. Click or drag a photo here."}
        </p>
        <div className={s.actions}>
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {preview ? "Change" : "Upload"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3.5 text-sm font-semibold text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
      </div>

      {input}
    </div>
  );
}
