"use client";

import React, { useMemo, useState } from "react";
import { Search, MapPin, CalendarDays, Trophy, Bird, Filter, Camera, Moon, Waves } from "lucide-react";

type Months = Partial<Record<string, boolean>>;

type Species = {
  id: string;
  common: string;
  sci: string;
  family: string;
  season: string;
  habitat: string;
  bestSpot?: string;
  months: Months;
  seen: boolean;
  target: boolean;
};

const seed: Species[] = [
  {
    id: "snail-kite",
    common: "Snail Kite",
    sci: "Rostrhamus sociabilis",
    family: "Accipitridae",
    season: "Resident",
    habitat: "Marsh",
    bestSpot: "Paynes Prairie (La Chua)",
    months: { Jan: true, Feb: true, Mar: true, Apr: true, May: true, Jun: true, Jul: true, Aug: true, Sep: true, Oct: true, Nov: true, Dec: true },
    seen: false,
    target: true,
  },
  {
    id: "swallow-tailed-kite",
    common: "Swallow-tailed Kite",
    sci: "Elanoides forficatus",
    family: "Accipitridae",
    season: "Summer",
    habitat: "River/Woodlands",
    bestSpot: "Goethe Forest",
    months: { Mar: true, Apr: true, May: true, Jun: true, Jul: true, Aug: true },
    seen: false,
    target: true,
  },
  {
    id: "roseate-spoonbill",
    common: "Roseate Spoonbill",
    sci: "Platalea ajaja",
    family: "Threskiornithidae",
    season: "Resident",
    habitat: "Coastal/Marsh",
    bestSpot: "Fort Island Trail",
    months: { Jan: true, Feb: true, Mar: true, Apr: true, May: true, Jun: true, Jul: true, Aug: true, Sep: true, Oct: true, Nov: true, Dec: true },
    seen: true,
    target: false,
  },
  {
    id: "peregrine-falcon",
    common: "Peregrine Falcon",
    sci: "Falco peregrinus",
    family: "Falconidae",
    season: "Winter",
    habitat: "Coastal/Urban",
    bestSpot: "Causeways / Coastal piers",
    months: { Oct: true, Nov: true, Dec: true, Jan: true, Feb: true, Mar: true },
    seen: false,
    target: true,
  },
  {
    id: "florida-scrub-jay",
    common: "Florida Scrub-Jay",
    sci: "Aphelocoma coerulescens",
    family: "Corvidae",
    season: "Resident",
    habitat: "Scrub",
    bestSpot: "Ocala NF Scrub",
    months: { Jan: true, Feb: true, Mar: true, Apr: true, May: true, Jun: true, Jul: true, Aug: true, Sep: true, Oct: true, Nov: true, Dec: true },
    seen: false,
    target: true,
  },
];

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-white/60 p-4 shadow-sm backdrop-blur">{children}</div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs">{children}</span>;
}

export default function Page() {
  const [route, setRoute] = useState<"home"|"list"|"detail"|"logs">("home");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ targetsOnly: true, month: new Date().toLocaleString("en-US", { month: "short" }) });
  const [data, setData] = useState(seed);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(() => data.find(d => d.id === activeId) || null, [data, activeId]);

  const stats = useMemo(() => {
    const total = data.length;
    const seen = data.filter(d => d.seen).length;
    const targeted = data.filter(d => d.target).length;
    const pct = total ? Math.round((seen / total) * 100) : 0;
    return { total, seen, targeted, pct };
  }, [data]);

  const filtered = useMemo(() => {
    const m = filters.month;
    const t = q.trim().toLowerCase();
    return data
      .filter(b => (filters.targetsOnly ? b.target : true))
      .filter(b => (m ? !!b.months?.[m] : true))
      .filter(b => {
        if (!t) return true;
        return (
          b.common.toLowerCase().includes(t) ||
          b.sci.toLowerCase().includes(t) ||
          b.family.toLowerCase().includes(t) ||
          b.habitat.toLowerCase().includes(t)
        );
      });
  }, [data, q, filters]);

  const toggleSeen = (id: string) => setData(prev => prev.map(b => b.id === id ? { ...b, seen: !b.seen } : b));
  const toggleTarget = (id: string) => setData(prev => prev.map(b => b.id === id ? { ...b, target: !b.target } : b));

  // DETAIL
  if (route === "detail" && active) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <div className="mx-auto max-w-md space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Florida Bird Quest</h1>
              <div className="text-sm text-slate-600">{active.common}</div>
              <div className="text-xs text-slate-500">{active.sci} • {active.family}</div>
            </div>
            <button className="rounded-2xl border px-3 py-2 text-sm" onClick={() => setRoute("list")}>Back</button>
          </div>

          <Card>
            <div className="flex flex-wrap gap-2">
              <Badge><CalendarDays className="h-4 w-4" /> {active.season}</Badge>
              <Badge><Waves className="h-4 w-4" /> {active.habitat}</Badge>
              {active.bestSpot ? <Badge><MapPin className="h-4 w-4" /> {active.bestSpot}</Badge> : null}
            </div>

            <div className="mt-3 text-sm text-slate-600">Best months</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {months.map(m => (
                <span key={m} className={`rounded-full px-3 py-1 text-xs ${active.months?.[m] ? "bg-slate-900 text-white" : "border"}`}>
                  {m}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active.seen} onChange={() => toggleSeen(active.id)} />
                Seen
              </label>
              <button
                className={`rounded-2xl px-4 py-2 text-sm ${active.target ? "bg-slate-900 text-white" : "border"}`}
                onClick={() => toggleTarget(active.id)}
              >
                {active.target ? "Target" : "Add Target"}
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4" /> Session notes (demo)</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Camera (e.g., Sony A1)" />
              <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Lens (e.g., 600mm f/4)" />
            </div>
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Settings (1/3200 f/4 ISO 800)" />
            <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Notes" />
            <button className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white">Save (demo)</button>
            <div className="mt-2 text-xs text-slate-500">This web demo doesn’t persist yet — it’s for showing the concept.</div>
          </Card>
        </div>
      </main>
    );
  }

  // LOGS
  if (route === "logs") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <div className="mx-auto max-w-md space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Florida Bird Quest</h1>
              <div className="text-sm text-slate-600">Session Logs (demo)</div>
            </div>
            <button className="rounded-2xl border px-3 py-2 text-sm" onClick={() => setRoute("home")}>Back</button>
          </div>

          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold"><Bird className="h-4 w-4" /> Raptors</div>
            <div className="mt-2 text-sm text-slate-600">Add raptor flight log entries in the real app.</div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold"><Moon className="h-4 w-4" /> Owls</div>
            <div className="mt-2 text-sm text-slate-600">Night log with ISO/shutter/noise notes.</div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold"><Waves className="h-4 w-4" /> Shorebirds</div>
            <div className="mt-2 text-sm text-slate-600">Tide/wind/heat haze notes.</div>
          </Card>
        </div>
      </main>
    );
  }

  // LIST
  if (route === "list") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <div className="mx-auto max-w-md space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Florida Bird Quest</h1>
              <div className="text-sm text-slate-600">Targets • Month: {filters.month} • Showing {filtered.length}</div>
            </div>
            <button className="rounded-2xl border px-3 py-2 text-sm" onClick={() => setRoute("home")}>Back</button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="w-full rounded-2xl border bg-white px-9 py-2 text-sm"
                placeholder="Search (name, family, habitat)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select
              className="h-10 rounded-2xl border bg-white px-3 text-sm"
              value={filters.month}
              onChange={(e) => setFilters(f => ({ ...f, month: e.target.value }))}
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <button
              className="inline-flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm"
              onClick={() => setFilters(f => ({ ...f, targetsOnly: !f.targetsOnly }))}
            >
              <Filter className="h-4 w-4" /> {filters.targetsOnly ? "Targets" : "All"}
            </button>
            <div className="text-xs text-slate-500">Tip: click a species</div>
          </div>

          <div className="space-y-2">
            {filtered.map(b => (
              <Card key={b.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      className="truncate text-left text-base font-semibold hover:underline"
                      onClick={() => { setActiveId(b.id); setRoute("detail"); }}
                    >
                      {b.common}
                    </button>
                    <div className="truncate text-xs text-slate-500">{b.sci} • {b.family}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge><CalendarDays className="h-4 w-4" /> {b.season}</Badge>
                      <Badge><Waves className="h-4 w-4" /> {b.habitat}</Badge>
                      {b.bestSpot ? <Badge><MapPin className="h-4 w-4" /> {b.bestSpot}</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={b.seen} onChange={() => toggleSeen(b.id)} />
                      Seen
                    </label>
                    <button
                      className={`rounded-2xl px-3 py-2 text-sm ${b.target ? "bg-slate-900 text-white" : "border bg-white"}`}
                      onClick={() => toggleTarget(b.id)}
                    >
                      {b.target ? "Target" : "Add Target"}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // HOME
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="mx-auto max-w-md space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Florida Bird Quest</h1>
            <div className="text-sm text-slate-600">Life list • Targets • Logs</div>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs">Web Demo</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Total</div>
                <div className="text-2xl font-semibold">{stats.total}</div>
              </div>
              <Bird className="h-6 w-6" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Seen</div>
                <div className="text-2xl font-semibold">{stats.seen}</div>
              </div>
              <Trophy className="h-6 w-6" />
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Completion</div>
            <div className="text-sm text-slate-600">{stats.pct}%</div>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-slate-900" style={{ width: `${stats.pct}%` }} />
          </div>
          <div className="mt-2 text-xs text-slate-500">Demo uses 5 sample species. Real app loads full Florida list.</div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white" onClick={() => setRoute("list")}>
            <MapPin className="inline h-4 w-4 mr-2" /> Targets
          </button>
          <button className="rounded-2xl border bg-white px-4 py-3 text-sm" onClick={() => setRoute("logs")}>
            <Camera className="inline h-4 w-4 mr-2" /> Logs
          </button>
        </div>
      </div>
    </main>
  );
}
