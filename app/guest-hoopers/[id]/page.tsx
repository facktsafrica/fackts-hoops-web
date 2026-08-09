import { redirect } from "next/navigation";

export default async function LegacyGuestHooperProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canonicalId = id.startsWith("guest-") || id.startsWith("player-")
    ? id
    : `guest-${id}`;
  redirect(`/players/${canonicalId}`);
}
