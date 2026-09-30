import { NotFoundState } from "@/components/shared/not-found-state";

export default function DriverNotFound() {
  return (
    <NotFoundState
      homeHref="/driver"
      description="This job doesn't exist, or it isn't one of yours."
    />
  );
}
