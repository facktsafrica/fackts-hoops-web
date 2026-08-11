import EventSetupWizard from "./EventSetupWizard";

export default async function EventSetupPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <EventSetupWizard eventId={eventId} />;
}
