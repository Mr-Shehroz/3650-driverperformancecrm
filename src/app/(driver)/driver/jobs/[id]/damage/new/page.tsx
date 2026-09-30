import {
  DriverFormPage,
  getDriverOwnedJob,
} from "@/components/driver/form-page";
import { DamageForm } from "@/components/driver/damage-form";

export default async function NewDamagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const job = await getDriverOwnedJob((await params).id);
  return (
    <DriverFormPage
      job={job}
      title="Report damage"
      description="Damage that happened during this move."
      tips={[
        "Photograph the damage as soon as you notice it, from more than one angle.",
        "Write what happened in plain words. Admins use this for claims.",
        "Damage on partner-delivered jobs is recorded but doesn't count against your damage rate.",
      ]}
    >
      <DamageForm
        jobId={job.id}
        partnerDelivery={job.deliveredBy === "partner"}
      />
    </DriverFormPage>
  );
}
