"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  ChoiceGrid,
  Field,
  FormError,
  FormSection,
  Segmented,
  StarInput,
} from "./form-bits";
import { PhotoPicker } from "./photo-picker";
import { FormActions } from "./form-actions";
import { createReviewAction } from "@/app/(driver)/driver/actions";
import { REVIEW_PLATFORM_LABELS, type ReviewPlatform } from "@/types";

const PLATFORMS = (Object.keys(REVIEW_PLATFORM_LABELS) as ReviewPlatform[]).map(
  (p) => ({
    value: p,
    label: REVIEW_PLATFORM_LABELS[p],
  }),
);

type YesNo = "yes" | "no" | "";

export function ReviewForm({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  const [platform, setPlatform] = useState<ReviewPlatform | "">("");
  const [stars, setStars] = useState(0);
  const [mentioned, setMentioned] = useState<YesNo>("");
  const [link, setLink] = useState("");
  const [screenshot, setScreenshot] = useState<string[]>([]);

  const clear = (k: string) =>
    errors[k] && setErrors((e) => ({ ...e, [k]: "" }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    startTransition(async () => {
      const res = await createReviewAction({
        jobId,
        platform: platform as ReviewPlatform,
        stars,
        driverMentioned:
          mentioned === ""
            ? (undefined as unknown as boolean)
            : mentioned === "yes",
        link,
        screenshot: screenshot[0] ?? "",
      });
      if (res?.fieldErrors) {
        setErrors(res.fieldErrors);
        setFormError("Please fix the highlighted fields.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (res?.error) setFormError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormError message={formError} />

      <FormSection title="Review">
        <Field label="Platform" error={errors.platform}>
          <ChoiceGrid
            ariaLabel="Platform"
            value={platform}
            onChange={(v) => {
              setPlatform(v);
              clear("platform");
            }}
            options={PLATFORMS}
            invalid={!!errors.platform}
            className="grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-5"
          />
        </Field>
        <Field label="Star rating" error={errors.stars}>
          <StarInput
            value={stars}
            onChange={(v) => {
              setStars(v);
              clear("stars");
            }}
            invalid={!!errors.stars}
          />
        </Field>
        <Field
          label="Did the customer mention your name?"
          error={errors.driverMentioned}
        >
          <Segmented
            ariaLabel="Driver mentioned"
            value={mentioned}
            onChange={(v) => {
              setMentioned(v);
              clear("driverMentioned");
            }}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Proof"
        description="Add a link to the review, a screenshot, or both."
      >
        <Field label="Review link" htmlFor="link" error={errors.link}>
          <Input
            id="link"
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              clear("link");
            }}
            placeholder="https://"
            autoComplete="off"
            aria-invalid={!!errors.link}
            className="h-12 bg-white text-base"
          />
        </Field>
        <Field label="Screenshot" error={errors.screenshot} optional>
          <PhotoPicker
            value={screenshot}
            onChange={(s) => {
              setScreenshot(s);
              clear("link");
            }}
            max={1}
          />
        </Field>
      </FormSection>

      <FormActions cancelHref={`/driver/jobs/${jobId}`} pending={pending}>
        Save review
      </FormActions>
    </form>
  );
}
