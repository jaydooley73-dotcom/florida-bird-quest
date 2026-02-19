"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  CalendarDays,
  Trophy,
  Bird,
  Filter,
  Camera,
  Moon,
  Waves,
  Flame,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";

/** =========
 * NatGeo style rules:
 * - White background
 * - Black/gray text
 * - NatGeo Yellow (#FFCC00) used for buttons + accents only
 * ========= */
const NATGEO_YELLOW = "#FFCC00";
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
type Month = typeof months[number];
type Months = Partial<Record<Month, boolean>>;

type Species = {
  id: string;
  common: string;
  sci?: string;
  family?: string;
  season?: string;
  habitat?: string;
  bestSpot?: string;
  months?: Months;
};

type UserSpecies = {
  id: string;         // species id
  seen: boolean;
  target: boolean;
  date?: string;
  location?: string;
  county?: string;
  notes?: string;
};

type LogEntry = {
  id: string;
  date: string;
  speciesName: string;
  location: string;
  county?: string;
  kind: "Raptors" | "Owls" | "Shorebirds" | "General";
  settings?: string;
  notes?: string;
};

/** ====== tiny helpers ====== */
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

/** ====== UI primitives ====== */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white text-[#111] p-6">
      <div className="mx-auto w-full max-w-md space-y-6">{children}</div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">{children}</div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700">
      {children}
    </span>
  );
}

function FieldButton({
  children,
  onClick,
  variant = "solid",
  className = "",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "rounded-xl px-4 py-3 text-sm font-semibold transition shadow-sm hover:shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";
  const solid = {
    backgroundColor: NATGEO_YELLOW,
    color: "#000",
    border: "1px solid transparent",
  } as React.CSSProperties;

  const outline = {
    backgroundColor: "#fff",
    color: "#111",
    border: `1px solid ${NATGEO_YELLOW}`,
  } as React.CSSProperties;

  const ghost = {
    backgroundColor: "transparent",
    color: "#111",
    border: "1px solid transparent",
    boxShadow: "none",
  } as React.CSSProperties;

  const style = variant === "solid" ? solid : variant === "outline" ? outline : ghost;

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${className}`} style={style}>
      {children}
    </button>
  );
}

function LogoHeader({
  subtitle,
  right,
}: {
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Florida Bird Quest" className="h-10 w-10 object-contain" />
        <div>
          <div className="text-xl font-bold tracking-tight">Florida Bird Quest</div>
          {subtitle ? <div className="text-sm text-gray-500">{subtitle}</div> : null}
        </div>
      </div>
      {right}
    </div>
  );
}

/** ====== Local storage (demo persistence) ======
 * So your Seen/Target & Challenge stays between refreshes.
 */
const LS_KEY = "fbq_user_v1";
const LS_LOGS = "fbq_logs_v1";
const LS_CHALLENGE = "fbq_challenge_v1";

type ChallengeState = {
  active: boolean;
  startedAt?: string;
  completedIds: string[]; // species ids
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** ====== Main Page ====== */
export default function Page() {
  const [route, setRoute] = useState<"home" | "list" | "detail" | "logs" | "challenge">("home");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({
    targetsOnly: true,
    month: new Date().toLocaleString("en-US", { month: "short" }) as Month,
  });

  // Species master list (loaded from /public/data/florida_birds.json)
  const [species, setSpecies] = useState<Species[]>([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);

  // User state keyed by species id
  const [user, setUser] = useState<Record<string, UserSpecies>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // 100 Bird Challenge
  const [challenge, setChallenge] = useState<ChallengeState>({ active: false, completedIds: [] });

  /** Load master species list */
  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoadingSpecies(true);
        const res = await fetch("/data/florida_birds.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load /data/florida_birds.json");
        const data = (await res.json()) as Species[];

        // Normalize: ensure ids exist
        const normalized = data.map((s) => ({
          ...s,
          id: s.id || slugify(s.common),
        }));

        if (mounted) setSpecies(normalized);
      } catch (e) {
        // fallback: tiny sample if no file exists yet
        if (mounted) {
          setSpecies([
            {
              id: "snail-kite",
              common: "Snail Kite",
              sci: "Rostrhamus sociabilis",
              family: "Accipitridae",
              season: "Resident",
              habitat: "Marsh",
              bestSpot: "Paynes Prairie (La Chua)",
              months: { Jan: true, Feb: true, Mar: true, Apr: true, May: true, Jun: true, Jul: true, Aug: true, Sep: true, Oct: true, Nov: true, Dec: true },
            },
          ]);
        }
      } finally {
        if (mounted) setLoadingSpecies(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, []);

  /** Load user + logs + challenge from localStorage */
  useEffect(() => {
    const savedUser = loadJSON<Record<string, UserSpecies>>(LS_KEY, {});
    const savedLogs = loadJSON<LogEntry[]>(LS_LOGS, []);
    const savedChallenge = loadJSON<ChallengeState>(LS_CHALLENGE, { active: false, completedIds: [] });
    setUser(savedUser);
    setLogs(savedLogs);
    setChallenge(savedChallenge);
  }, []);

  /** Persist */
  useEffect(() => saveJSON(LS_KEY, user), [user]);
  useEffect(() => saveJSON(LS_LOGS, logs), [logs]);
  useEffect(() => saveJSON(LS_CHALLENGE, challenge), [challenge]);

  const active = useMemo(() => species.find((s) => s.id === activeId) || null, [species, activeId]);

  const stats = useMemo(() => {
    const total = species.length;
    const seen = Object.values(user).filter((u) => u.seen).length;
    const targeted = Object.values(user).filter((u) => u.target).length;
    const pct = total ? Math.round((seen / total) * 100) : 0;
    return { total, seen, targeted, pct };
  }, [species.length, user]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return species
      .filter((s) => (filters.targetsOnly ? !!user[s.id]?.target : true))
      .filter((s) => {
        const m = filters.month;
        if (!m) return true;
        // if months not provided, don't filter it out
        if (!s.months) return true;
        return !!s.months[m];
      })
      .filter((s) => {
        if (!t) return true;
        return (
          s.common.toLowerCase().includes(t) ||
          (s.sci || "").toLowerCase().includes(t) ||
          (s.family || "").toLowerCase().includes(t) ||
          (s.habitat || "").toLowerCase().includes(t)
        );
      });
  }, [species, q, filters, user]);

  function ensureUserRow(id: string): UserSpecies {
    return user[id] || { id, seen: false, target: false };
  }

  function toggleSeen(id: string) {
    const current = ensureUserRow(id);
    setUser((prev) => ({ ...prev, [id]: { ...current, seen: !current.seen } }));

    // If challenge is active, auto-add when marked seen
    if (!challenge.active) return;
    const nextSeen = !current.seen;
    if (nextSeen && !challenge.completedIds.includes(id) && challenge.completedIds.length < 100) {
      setChallenge((c) => ({ ...c, completedIds: [...c.completedIds, id] }));
    }
  }

  function toggleTarget(id: string) {
    const current = ensureUserRow(id);
    setUser((prev) => ({ ...prev, [id]: { ...current, target: !current.target } }));
  }

  function openDetail(id: string) {
    setActiveId(id);
    setRoute("detail");
  }

  /** ===== 100 Bird Challenge logic ===== */
  const challengeProgress = challenge.completedIds.length;
  const challengePct = Math.min(100, Math.round((challengeProgress / 100) * 100));

  const todaysPicks = useMemo(() => {
    // pick up to 5 species from remaining challenge pool, prefer current month if months exist
    const remaining = species.filter((s) => !challenge.completedIds.includes(s.id));
    const month = filters.month;
    const inMonth = remaining.filter((s) => (s.months ? !!s.months[month] : true));
    const pool = inMonth.length ? inMonth : remaining;

    // deterministic-ish: shuffle using date string
    const seedStr = new Date().toISOString().slice(0, 10);
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;

    const shuffled = [...pool].sort((a, b) => {
      // pseudo-random stable ordering by hashing id with day hash
      const ha = (h ^ a.id.length ^ a.common.length) >>> 0;
      const hb = (h ^ b.id.length ^ b.common.length) >>> 0;
      return ha - hb;
    });

    return shuffled.slice(0, 5);
  }, [species, challenge.completedIds, filters.month]);

  function startChallenge() {
    setChallenge({ active: true, startedAt: new Date().toISOString(), completedIds: [] });
  }

  function resetChallenge() {
    setChallenge({ active: false, startedAt: undefined, completedIds: [] });
  }

  /** ===== Logs ===== */
  function addLog(entry: Omit<LogEntry, "id">) {
    setLogs((prev) => [{ ...entry, id: uid("log") }, ...prev]);
  }

  /** ===== Screens ===== */

  // DETAIL
  if (route === "detail" && active) {
    const u = ensureUserRow(active.id);
    return (
      <AppShell>
        <LogoHeader
          subtitle={active.common}
          right={<FieldButton className="!px-3 !py-2" onClick={() => setRoute("list")}>Back</FieldButton>}
        />

        <Card>
          <div className="text-sm text-gray-600">{active.sci || "—"} {active.family ? `• ${active.family}` : ""}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {active.season ? <Badge><CalendarDays className="h-4 w-4" color={NATGEO_YELLOW} /> {active.season}</Badge> : null}
            {active.habitat ? <Badge><Waves className="h-4 w-4" color={NATGEO_YELLOW} /> {active.habitat}</Badge> : null}
            {active.bestSpot ? <Badge><MapPin className="h-4 w-4" color={NATGEO_YELLOW} /> {active.bestSpot}</Badge> : null}
          </div>

          <div className="mt-4 text-sm font-semibold">Best months</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {months.map((m) => {
              const on = active.months ? !!active.months[m] : false;
              return (
                <span
                  key={m}
                  className="rounded-full px-3 py-1 text-xs border"
                  style={{ borderColor: on ? NATGEO_YELLOW : "#e5e7eb", backgroundColor: on ? "rgba(255,204,0,0.12)" : "transparent" }}
                >
                  {m}
                </span>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={u.seen}
                onChange={() => toggleSeen(active.id)}
                className="h-4 w-4 accent-yellow-400"
              />
              Seen
            </label>

            <FieldButton
              variant={u.target ? "solid" : "outline"}
              className="!w-auto !px-4 !py-2"
              onClick={() => toggleTarget(active.id)}
            >
              {u.target ? "Target" : "Add Target"}
            </FieldButton>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <input
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="Date (YYYY-MM-DD)"
              value={u.date || ""}
              onChange={(e) => setUser((prev) => ({ ...prev, [active.id]: { ...u, date: e.target.value } }))}
            />
            <input
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="County"
              value={u.county || ""}
              onChange={(e) => setUser((prev) => ({ ...prev, [active.id]: { ...u, county: e.target.value } }))}
            />
          </div>
          <input
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Location"
            value={u.location || ""}
            onChange={(e) => setUser((prev) => ({ ...prev, [active.id]: { ...u, location: e.target.value } }))}
          />
          <textarea
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="Notes"
            value={u.notes || ""}
            onChange={(e) => setUser((prev) => ({ ...prev, [active.id]: { ...u, notes: e.target.value } }))}
          />
        </Card>

        {challenge.active ? (
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold">
                <Flame className="h-4 w-4" color={NATGEO_YELLOW} /> 100 Bird Challenge
              </div>
              <div className="text-sm text-gray-600">{challengeProgress}/100</div>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full" style={{ width: `${challengePct}%`, backgroundColor: NATGEO_YELLOW }} />
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Marking a species “Seen” will auto-count it toward the challenge (until you hit 100).
            </div>
          </Card>
        ) : null}
      </AppShell>
    );
  }

  // LOGS
  if (route === "logs") {
    return (
      <AppShell>
        <LogoHeader
          subtitle="Session Logs"
          right={<FieldButton className="!px-3 !py-2" onClick={() => setRoute("home")}>Back</FieldButton>}
        />

        <Card>
          <div className="font-semibold">New log entry</div>
          <LogForm onAdd={addLog} />
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Recent logs</div>
            <div className="text-sm text-gray-600">{logs.length}</div>
          </div>

          <div className="mt-3 space-y-3">
            {logs.length === 0 ? (
              <div className="text-sm text-gray-600">No logs yet.</div>
            ) : (
              logs.slice(0, 20).map((l) => (
                <div key={l.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{l.speciesName}</div>
                      <div className="text-xs text-gray-600 truncate">{l.date} • {l.kind}</div>
                      <div className="text-sm text-gray-700 truncate">{l.location}{l.county ? ` • ${l.county}` : ""}</div>
                      {l.settings ? <div className="text-xs text-gray-600 mt-1">Settings: {l.settings}</div> : null}
                      {l.notes ? <div className="text-xs text-gray-600 mt-1">Notes: {l.notes}</div> : null}
                    </div>
                    <CheckCircle2 className="h-5 w-5" color={NATGEO_YELLOW} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </AppShell>
    );
  }

  // CHALLENGE
  if (route === "challenge") {
    return (
      <AppShell>
        <LogoHeader
          subtitle="100 Bird Challenge"
          right={<FieldButton className="!px-3 !py-2" onClick={() => setRoute("home")}>Back</FieldButton>}
        />

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold">
              <Flame className="h-4 w-4" color={NATGEO_YELLOW} /> Progress
            </div>
            <div className="text-sm text-gray-600">{challengeProgress}/100</div>
          </div>

          <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
            <div className="h-2 rounded-full" style={{ width: `${challengePct}%`, backgroundColor: NATGEO_YELLOW }} />
          </div>

          <div className="mt-3 flex gap-2">
            {!challenge.active ? (
              <FieldButton onClick={startChallenge} className="w-full">
                Start Challenge
              </FieldButton>
            ) : (
              <>
                <FieldButton variant="outline" onClick={resetChallenge} className="w-full">
                  <span className="inline-flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" color={NATGEO_YELLOW} /> Reset
                  </span>
                </FieldButton>
              </>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-700">
            Daily picks are chosen from birds you haven’t counted yet (prefers your current month).
          </div>
        </Card>

        <Card>
          <div className="font-semibold">Today’s 5 picks</div>
          <div className="mt-3 space-y-2">
            {todaysPicks.map((s) => {
              const completed = challenge.completedIds.includes(s.id);
              return (
                <div key={s.id} className="rounded-xl border border-gray-200 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button className="font-semibold hover:underline text-left" onClick={() => openDetail(s.id)}>
                      {s.common}
                    </button>
                    <div className="text-xs text-gray-600 truncate">{s.sci || "—"}{s.family ? ` • ${s.family}` : ""}</div>
                    {s.bestSpot ? <div className="text-sm text-gray-700 truncate">{s.bestSpot}</div> : null}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-gray-600">{completed ? "Counted" : "Not yet"}</span>
                    <FieldButton
                      className="!w-auto !px-3 !py-2"
                      variant={completed ? "outline" : "solid"}
                      disabled={!challenge.active}
                      onClick={() => {
                        if (!challenge.active) return;
                        if (completed) return;
                        if (challenge.completedIds.length >= 100) return;
                        setChallenge((c) => ({ ...c, completedIds: [...c.completedIds, s.id] }));
                      }}
                    >
                      {completed ? "Done" : "Count"}
                    </FieldButton>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </AppShell>
    );
  }

  // LIST
  if (route === "list") {
    return (
      <AppShell>
        <LogoHeader
          subtitle={`Targets • Month: ${filters.month} • ${filtered.length} shown`}
          right={<FieldButton className="!px-3 !py-2" onClick={() => setRoute("home")}>Back</FieldButton>}
        />

        <Card>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" color={NATGEO_YELLOW} />
              <input
                className="w-full rounded-2xl border border-gray-200 bg-white px-9 py-2 text-sm"
                placeholder="Search (name, family, habitat)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select
              className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm"
              value={filters.month}
              onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value as Month }))}
            >
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <FieldButton
              className="!w-auto !px-3 !py-2"
              onClick={() => setFilters((f) => ({ ...f, targetsOnly: !f.targetsOnly }))}
            >
              <span className="inline-flex items-center gap-2">
                <Filter className="h-4 w-4" /> {filters.targetsOnly ? "Targets" : "All"}
              </span>
            </FieldButton>

            <div className="text-xs text-gray-600">
              {loadingSpecies ? "Loading birds…" : `Total birds: ${species.length}`}
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          {filtered.map((s) => {
            const u = ensureUserRow(s.id);
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button onClick={() => openDetail(s.id)} className="truncate text-left text-base font-semibold hover:underline">
                      {s.common}
                    </button>
                    <div className="truncate text-xs text-gray-600">
                      {(s.sci || "—")}{s.family ? ` • ${s.family}` : ""}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.season ? <Badge><CalendarDays className="h-4 w-4" color={NATGEO_YELLOW} /> {s.season}</Badge> : null}
                      {s.habitat ? <Badge><Waves className="h-4 w-4" color={NATGEO_YELLOW} /> {s.habitat}</Badge> : null}
                      {s.bestSpot ? <Badge><MapPin className="h-4 w-4" color={NATGEO_YELLOW} /> {s.bestSpot}</Badge> : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={u.seen}
                        onChange={() => toggleSeen(s.id)}
                        className="h-4 w-4 accent-yellow-400"
                      />
                      Seen
                    </label>

                    <FieldButton
                      className="!w-auto !px-3 !py-2"
                      variant={u.target ? "solid" : "outline"}
                      onClick={() => toggleTarget(s.id)}
                    >
                      {u.target ? "Target" : "Add Target"}
                    </FieldButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </AppShell>
    );
  }

  // HOME
  return (
    <AppShell>
      <LogoHeader subtitle="A serious field tool for Florida birders" />

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total species</div>
              <div className="text-2xl font-bold">{loadingSpecies ? "…" : stats.total}</div>
            </div>
            <Bird className="h-6 w-6" color={NATGEO_YELLOW} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Seen</div>
              <div className="text-2xl font-bold">{stats.seen}</div>
            </div>
            <Trophy className="h-6 w-6" color={NATGEO_YELLOW} />
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Completion</div>
          <div className="text-sm text-gray-600">{stats.pct}%</div>
        </div>

        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div className="h-2 rounded-full" style={{ width: `${stats.pct}%`, backgroundColor: NATGEO_YELLOW }} />
        </div>

        <div className="mt-2 text-xs text-gray-600">
          Data loads from <code>/public/data/florida_birds.json</code>. Drop your full checklist there to populate everything.
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <FieldButton onClick={() => setRoute("list")}>
          <span className="flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" /> Targets
          </span>
        </FieldButton>

        <FieldButton onClick={() => setRoute("logs")}>
          <span className="flex items-center justify-center gap-2">
            <Camera className="h-4 w-4" /> Logs
          </span>
        </FieldButton>
      </div>

      <FieldButton variant="outline" onClick={() => setRoute("challenge")}>
        <span className="flex items-center justify-center gap-2">
          <Flame className="h-4 w-4" color={NATGEO_YELLOW} /> 100 Bird Challenge
        </span>
      </FieldButton>

      <Card>
        <div className="text-sm font-semibold">This month</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm text-gray-600">Month filter</div>
          <select
            className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm"
            value={filters.month}
            onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value as Month }))}
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </Card>
    </AppShell>
  );
}

/** ====== Log Form Component ====== */
function LogForm({ onAdd }: { onAdd: (entry: Omit<LogEntry, "id">) => void }) {
  const [kind, setKind] = useState<LogEntry["kind"]>("General");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [speciesName, setSpeciesName] = useState("");
  const [location, setLocation] = useState("");
  const [county, setCounty] = useState("");
  const [settings, setSettings] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!speciesName.trim() || !location.trim()) return;
        onAdd({
          kind,
          date,
          speciesName: speciesName.trim(),
          location: location.trim(),
          county: county.trim() || undefined,
          settings: settings.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        setSpeciesName("");
        setLocation("");
        setCounty("");
        setSettings("");
        setNotes("");
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value as any)}>
          <option>General</option>
          <option>Raptors</option>
          <option>Owls</option>
          <option>Shorebirds</option>
        </select>
      </div>

      <input className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Species" value={speciesName} onChange={(e) => setSpeciesName(e.target.value)} />
      <input className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />

      <div className="grid grid-cols-2 gap-2">
        <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="County (optional)" value={county} onChange={(e) => setCounty(e.target.value)} />
        <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Settings (optional)" value={settings} onChange={(e) => setSettings(e.target.value)} />
      </div>

      <textarea className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" rows={3} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <FieldButton type="submit">Add log</FieldButton>
      <div className="text-xs text-gray-600">Tip: logs persist locally (browser storage) in this demo.</div>
    </form>
  );
}
