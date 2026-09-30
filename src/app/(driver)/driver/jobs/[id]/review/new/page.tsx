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
      tips={[
        "Paste the review link, or add a screenshot if there's no link.",
        "Mark whether the customer mentioned you by name.",
        "Admins verify reviews before they count on verified leaderboards.",
      ]}
    >
      <ReviewForm jobId={job.id} />
    </DriverFormPage>
  );
}
