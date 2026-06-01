import type { Metadata } from "next";
import { TeamDetail } from "@/components/teams/TeamDetail";

export function generateMetadata({
  params,
}: {
  params: { name: string };
}): Metadata {
  const name = decodeURIComponent(params.name);
  return {
    title: `${name} — Frag Forecast`,
    description: `Roster, Elo profile, and recent results for ${name} on Frag Forecast.`,
  };
}

export default function TeamPage({ params }: { params: { name: string } }) {
  return <TeamDetail name={decodeURIComponent(params.name)} />;
}
