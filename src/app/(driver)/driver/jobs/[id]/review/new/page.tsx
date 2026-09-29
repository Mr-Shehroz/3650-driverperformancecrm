import {
  DriverFormPage,
  getDriverOwnedJob,
} from "@/components/driver/form-page";
import { ReviewForm } from "@/components/driver/review-form";

export default async function NewReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const job = await getDriverOwnedJob((await params).id);
  return (
    <DriverFormPage
      job={job}
      title="Add review"
      description="A customer review for this job."
    >
      <ReviewForm jobId={job.id} />
    </DriverFormPage>
  );
}
