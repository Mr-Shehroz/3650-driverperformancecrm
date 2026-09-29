import {
  DriverFormPage,
  getDriverOwnedJob,
} from "@/components/driver/form-page";
import { UpsellForm } from "@/components/driver/upsell-form";

export default async function NewUpsellPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const job = await getDriverOwnedJob((await params).id);
  return (
    <DriverFormPage
      job={job}
      title="Add upsell"
      description="Extra services sold on this job."
    >
      <UpsellForm jobId={job.id} />
    </DriverFormPage>
  );
}
