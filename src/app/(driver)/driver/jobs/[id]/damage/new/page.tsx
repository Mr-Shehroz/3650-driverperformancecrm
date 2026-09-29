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
    >
      <DamageForm
        jobId={job.id}
        partnerDelivery={job.deliveredBy === "partner"}
      />
    </DriverFormPage>
  );
}
