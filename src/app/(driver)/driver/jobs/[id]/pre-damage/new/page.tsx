import {
  DriverFormPage,
  getDriverOwnedJob,
} from "@/components/driver/form-page";
import { PreDamageForm } from "@/components/driver/pre-damage-form";

export default async function NewPreDamagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const job = await getDriverOwnedJob((await params).id);
  return (
    <DriverFormPage
      job={job}
      title="Pre-existing damage"
      description="Record damage found at pickup, before loading."
      tips={[
        "Take photos before anything is moved or wrapped.",
        "Show the customer each damaged spot, then get their printed name and signature.",
        "Your location and the time are recorded automatically.",
        "Once saved, the record is locked. Only an admin can correct it, and every change is logged.",
      ]}
    >
      <PreDamageForm jobId={job.id} />
    </DriverFormPage>
  );
}
