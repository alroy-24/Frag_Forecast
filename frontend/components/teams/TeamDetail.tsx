"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ListOrdered, TriangleAlert, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { api, API_BASE } from "@/lib/api";
import type { Health, Match, Player, Team, TeamStats } from "@/lib/types";
import { Header } from "@/components/Header";
import { RecentMatches } from "@/components/RecentMatches";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { SectionCard, SectionHeader } from "@/components/ui/SectionCard";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { cn, flagEmoji, regionClasses } from "@/lib/utils";

export function TeamDetail({ name }: { name: string }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [h, t, s, pl, mx] = await Promise.all([
          api.health().catch(() => null),
          api.teams(),
          api.teamStats(name).catch(() => null), // 404 if unknown / no history
          api.teamPlayers(name).catch(() => []),
          api.matches(200).catch(() => []),
        ]);
        if (!alive) return;
        setHealth(h);
        setTeams(t);
        setStats(s);
        setPlayers(pl);
        setMatches(mx);
      } catch {
        if (alive) setOffline(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [name]);

  // Resolve the canonical team record (case-insensitive) for logo/region/rank.
  const ranked = [...teams].sort((a, b) => b.elo - a.elo);
  const team = ranked.find((t) => t.name.toLowerCase() === name.toLowerCase());
  const rank = team ? ranked.findIndex((t) => t.id === team.id) + 1 : null;

  const teamLogos = Object.fromEntries(teams.map((t) => [t.name, t.logo_url]));
  const teamMatches = team
    ? matches.filter((m) =>
        [m.team_a, m.team_b].some(
          (n) => n.toLowerCase() === team.name.toLowerCase()
        )
      )
    : [];

  let wins = 0;
  let losses = 0;
  if (team) {
    for (const m of teamMatches) {
      const isA = m.team_a.toLowerCase() === team.name.toLowerCase();
      const won = (m.winner === "a" && isA) || (m.winner === "b" && !isA);
      if (won) wins++;
      else losses++;
    }
  }
  const played = wins + losses;

  return (
    <div className="min-h-screen">
      <Header health={health} />

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All teams
        </Link>

        {offline ? (
          <OfflineNotice />
        ) : loading ? (
          <LoadingState />
        ) : !team ? (
          <NotFound name={name} />
        ) : (
          <div className="mt-6 space-y-6">
            <Hero
              team={team}
              rank={rank}
              stats={stats}
              wins={wins}
              losses={losses}
              played={played}
            />

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <SectionCard>
                <SectionHeader
                  eyebrow="Squad"
                  title="Roster"
                  icon={<Users className="h-5 w-5 text-teamB" />}
                  right={
                    players.length > 0 ? (
                      <span className="hidden text-xs text-slate-500 sm:block">
                        {players.length} players
                      </span>
                    ) : undefined
                  }
                />
                <Roster players={players} />
              </SectionCard>

              <SectionCard delay={0.05}>
                <SectionHeader
                  eyebrow="Profile"
                  title="Team shape"
                  icon={<Trophy className="h-5 w-5 text-amber-300" />}
                />
                {stats ? (
                  <ProfileRadar stats={stats} name={team.name} />
                ) : (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No profile data yet.
                  </p>
                )}
              </SectionCard>
            </div>

            <SectionCard delay={0.05}>
              <SectionHeader
                eyebrow="Track record"
                title="Recent results"
                icon={<ListOrdered className="h-5 w-5 text-teamA" />}
                right={
                  played > 0 ? (
                    <span className="font-mono text-sm">
                      <span className="text-teamA">{wins}W</span>
                      <span className="mx-1 text-slate-600">·</span>
                      <span className="text-teamB">{losses}L</span>
                    </span>
                  ) : undefined
                }
              />
              <RecentMatches matches={teamMatches} teamLogos={teamLogos} />
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}

function Hero({
  team,
  rank,
  stats,
  wins,
  losses,
  played,
}: {
  team: Team;
  rank: number | null;
  stats: TeamStats | null;
  wins: number;
  losses: number;
  played: number;
}) {
  const winPct = played > 0 ? Math.round((wins / played) * 100) : null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass relative overflow-hidden p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.5]" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:h-24 sm:w-24">
          <TeamLogo name={team.name} logoUrl={team.logo_url} size={72} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {team.name}
            </h1>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-semibold",
                regionClasses(team.region)
              )}
            >
              {team.region ?? "—"}
            </span>
            {team.acronym && (
              <span className="font-mono text-xs text-slate-500">
                {team.acronym}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <StatChip label="Elo" value={team.elo} decimals={0} accent />
            {rank && <StatChip label="Rank" value={rank} prefix="#" />}
            {winPct !== null && <StatChip label="Win rate" value={winPct} suffix="%" />}
            {stats && (
              <>
                <StatChip label="Form" value={stats.form * 100} suffix="%" />
                <StatChip label="WR 90d" value={stats.winrate_90d * 100} suffix="%" />
                <StatChip label="Matches" value={stats.matches_played} decimals={0} />
              </>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function StatChip({
  label,
  value,
  decimals = 0,
  suffix,
  prefix,
  accent,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-soft px-3.5 py-2">
      <div
        className={cn(
          "font-display text-xl font-bold tabular-nums",
          accent ? "gradient-text" : "text-white"
        )}
      >
        {prefix}
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

function Roster({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        No roster on record for this team.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {players.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.4) }}
          className="glass-soft flex flex-col items-center gap-2 p-3 text-center"
        >
          <PlayerAvatar
            nickname={p.nickname}
            photoUrl={p.photo_url}
            size={84}
            accent={i % 2 === 0 ? "a" : "b"}
          />
          <div className="min-w-0">
            <div className="flex items-center justify-center gap-1.5">
              <span className="truncate font-semibold text-white">{p.nickname}</span>
              <span className="text-sm">{flagEmoji(p.nationality)}</span>
            </div>
            {p.name && (
              <div className="truncate text-xs text-slate-400">{p.name}</div>
            )}
            <div className="mt-0.5 text-[0.7rem] text-slate-500">
              {[p.role, p.age ? `${p.age}y` : null].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
          {typeof p.rating === "number" && (
            <span className="rounded-md border border-teamA/30 bg-teamA/10 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-teamA">
              {p.rating.toFixed(2)} rating
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/** Single-team profile radar; axes normalised the same way as the compare radar. */
function ProfileRadar({ stats, name }: { stats: TeamStats; name: string }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const data = [
    { axis: "Elo", v: clamp(((stats.elo - 1200) / 900) * 100) },
    { axis: "Form", v: clamp(stats.form * 100) },
    { axis: "WR 30d", v: clamp(stats.winrate_30d * 100) },
    { axis: "WR 90d", v: clamp(stats.winrate_90d * 100) },
    { axis: "Freshness", v: clamp((Math.min(stats.rest_days, 14) / 14) * 100) },
    { axis: "Experience", v: clamp((Math.min(stats.matches_played, 250) / 250) * 100) },
  ];
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(148,163,184,0.18)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "rgba(203,213,225,0.7)", fontSize: 11 }}
          />
          <Radar
            name={name}
            dataKey="v"
            stroke="#22d3ee"
            fill="#22d3ee"
            fillOpacity={0.3}
            strokeWidth={2}
            isAnimationActive
          />
          <Tooltip
            contentStyle={{
              background: "rgba(14,17,32,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(v: number) => [`${v}/100`, name]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function NotFound({ name }: { name: string }) {
  return (
    <div className="glass mt-10 flex flex-col items-center gap-3 p-10 text-center">
      <TriangleAlert className="h-9 w-9 text-amber-400" />
      <h2 className="text-lg font-semibold text-white">Team not found</h2>
      <p className="max-w-md text-sm text-slate-400">
        No team named <span className="text-slate-200">&ldquo;{name}&rdquo;</span> is
        in the dataset.
      </p>
      <Link
        href="/"
        className="mt-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 transition hover:border-accent/40 hover:text-white"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

function OfflineNotice() {
  return (
    <div className="glass mt-10 flex flex-col items-center gap-3 p-10 text-center">
      <TriangleAlert className="h-9 w-9 text-amber-400" />
      <h3 className="text-lg font-semibold text-white">Can&apos;t reach the API</h3>
      <p className="max-w-md text-sm text-slate-400">
        The dashboard expects the backend at{" "}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-teamA">{API_BASE}</code>.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-6 space-y-6">
      <div className="glass h-40 animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass h-80 animate-pulse" />
        <div className="glass h-80 animate-pulse" />
      </div>
    </div>
  );
}
