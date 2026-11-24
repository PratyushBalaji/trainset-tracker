// Stats page, grouped by topic. Every figure is computed from trainsets.json / lines.json; nothing
// here is typed in. Durations only use reported dates, not ones marked inferred, derived or approximate.
import { addDays, daysBetween, formatDate } from './date';
import { buildDelayStory, monthsBetween, type SectionStory } from './delay-story';
import { lines } from './lines';
import { lineColors, lineOrder, lineShortLabels, manufacturerShortLabels, rollingStockDesign, type TrainDesign } from './presentation';
import { dataset, resolvedTrainsets } from './resolve';
import { networkPaths } from './network-map';
import { deliveryReadings } from './stories';
import { dateQualification } from './evidence';
import type { ResolvedTrainset } from './types';

export interface FleetTrain {
  id: string;
  number: string;
  contractId: string;
  line: string;
  maker: string;
  design?: TrainDesign;
  /** Delivered by today, whatever the date's basis. */
  arrived?: string;
  /** Reported dates only, for durations. */
  dispatchedOn?: string;
  arrivedOn?: string;
  servedOn?: string;
  transitDays?: number;
  /** Factory to depot from any recorded dates (approximate ones included), unless a reviewed note
   * says the dates don't measure the trip. Used for the trend chart. */
  trip?: { days: number; approx: boolean };
  /** Depot arrival to first passengers, or to today while still waiting. */
  depotDays?: number;
  waiting: boolean;
  /** The train reached the depot before its line first opened to passengers. */
  beforeOpening: boolean;
}

export interface IconItem { color: string; design?: TrainDesign; label: string }
export interface BoardRow { line: string; section: string; first: string; now?: string; moved: number }
export interface NoticePoint { line: string; section: string; label: string; ahead: number; late: number }

/** Speed thresholds in days: at or under `fast` is quick, over `slow` is slow. */
export interface SpeedScale { fast: number; slow: number }

/** missed: opened after it. kept: opened by it. floor: a "not before" statement, not a deadline. */
export type StopState = 'missed' | 'kept' | 'floor';

export type TileViz =
  | { type: 'window'; start: string; end: string; band: { from: string; to: string }; ticks: { date: string; color: string }[]; flags: { date: string; label: string; due: boolean }[]; legend: { color: string; label: string }[] }
  | { type: 'gaps'; bars: { days: number; label: string }[]; scale: SpeedScale; ends: [string, string]; max: number }
  | { type: 'line'; points: { days: number; label: string; approx?: boolean }[]; scale: SpeedScale; ends: [string, string] }
  | { type: 'columns'; bars: { days: number; label: string }[]; scale: SpeedScale; ends: [string, string]; legend: [string, string, string] }
  | { type: 'compare'; items: { label: string; value: string; sub?: string; design?: TrainDesign }[] }
  | { type: 'spans'; rows: { line: string; label: string; color: string; from: string; to: string; months: number }[] }
  | { type: 'icons'; items: IconItem[]; legend: { color: string; label: string }[]; size: number; fill?: boolean }
  | { type: 'map'; segment: string; label?: string }
  | { type: 'orders'; start: string; end: string; today: string; rows: { code: string; builder: string; design?: TrainDesign; delivered: number; ordered: number; first: string; last: string; done: string; due: string }[] }
  | { type: 'split'; rows: { label: string; first?: number; second: number; right: string }[]; max: number; legend: [string, string] }
  | { type: 'hbars'; rows: { label: string; sub?: string; value: number; color: string; right: string }[]; max: number }
  | { type: 'ladder'; color: string; rows: { label: string; note: string; missed: boolean; open: boolean }[] }
  | { type: 'stations'; color: string; stops: { label: string; full: string; state: StopState }[] }
  | { type: 'notice'; points: NoticePoint[]; worse: number }
  | { type: 'board'; rows: BoardRow[] };

export interface Tile {
  id: string;
  size: 'w2' | 'w3' | 'w4' | 'w6';
  dark?: boolean;
  kicker: string;
  /** Train drawn in the tile's top corner. */
  icon?: TrainDesign;
  /** Small India map in the top corner with a route traced between two places (keys of indiaOutline.places). */
  route?: { from: string; to: string; label: string };
  big?: { parts: { n: string; unit?: string; struck?: boolean }[]; arrow?: boolean };
  /** Plain text; **double asterisks** mark emphasis and a newline starts a new line. */
  text: string;
  note?: string;
  share: string;
  link: { href: string; label: string };
  viz?: TileViz;
}

export interface Chapter { id: string; short: string; title: string; summary: string; tiles: Tile[] }

export interface Stats { today: string; trains: FleetTrain[]; chapters: Chapter[] }

export const TITAGARH = 'Titagarh Rail Systems';

// Reviewed lengths of mapped stretches, read from line-record prose. Each applies only while the
// stored text still matches, like reviewed-targets.ts.
const segmentLengths: Record<string, { line: string; milestoneId: string; matches: string; km: number }> = {
  orr: { line: 'blue', milestoneId: 'union-cabinet-approval', matches: 'The Union Cabinet approved the combined project at INR 14,788.101 crore: approximately 19.75 km of Phase 2A and 38.44 km of Phase 2B.', km: 19.75 }
};
function segmentKm(segment: string): number | undefined {
  const r = segmentLengths[segment];
  return r && lines[r.line]?.milestones.find((m) => m.id === r.milestoneId)?.description === r.matches ? r.km : undefined;
}

// Where each maker builds Bengaluru's trains (plant location, not head office).
export const makerPlaces: Record<string, string> = { 'CRRC Nanjing Puzhen': 'China', 'Titagarh Rail Systems': 'West Bengal', BEML: 'Bengaluru' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
export const yearFraction = (iso: string) => Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 1) / 12 + (Number(iso.slice(8, 10)) - 1) / 365;
const toMonths = (days: number) => days / 30.44;
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const range = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);
const lineName = (line: string) => lineShortLabels[line] ?? line;
const makerName = (maker: string) => manufacturerShortLabels[maker] ?? maker;
const listOf = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
const stripNote = (label: string) => label.replace(/ \(.*\)$/, '');
const codeOf = (contractId: string) => contractId.replace('bmrcl-', '').toUpperCase();

/** The maker building most of a contract's trains (4RS-DM: Titagarh, though CRRC won it). */
function builderOf(contractId: string): string {
  const c = dataset.contracts[contractId];
  const byMaker = new Map<string, number>();
  for (const a of c?.base_allocations ?? []) byMaker.set(a.manufacturer, (byMaker.get(a.manufacturer) ?? 0) + a.trainsets);
  const top = [...byMaker.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return makerName(top ?? c?.awardee ?? '');
}
const lineKey = (lineIds: string[]) => lineOrder.filter((l) => lineIds.includes(l)).map((l) => ({ color: lineColors[l], label: `${lineName(l)} Line` }));

function reportedDate(t: ResolvedTrainset, key: string, today: string): string | undefined {
  const m = t.milestones.find((x) => x.key === key);
  if (!m || m.date > today) return undefined;
  const p = m.presentation;
  return p?.inferred || p?.derived || p?.approximate ? undefined : m.date;
}

/** A date the site shows as exact: no "on or before/after", no unconfirmed note, nothing inferred. */
function exactDate(t: ResolvedTrainset, key: string, today: string): string | undefined {
  const m = t.milestones.find((x) => x.key === key);
  if (!m || m.date > today) return undefined;
  const q = dateQualification(m);
  return q.relation === 'exact' && !q.inferred && !q.derived && !q.approximate ? m.date : undefined;
}

// Trips left out of the factory-to-depot trend because their own notes say the stored dates don't
// measure the journey. Keyed to the stored date, so an exclusion lapses if that date is corrected.
const tripExclusions: Record<string, { key: 'factory_dispatch' | 'depot_arrival'; date: string; reason: string }> = {
  'bmrcl-4rs-dm-ts002': { key: 'factory_dispatch', date: '2025-01-06', reason: 'dispatch date is the flag-off ceremony; the coaches left in late January' },
  'bmrcl-4rs-dm-ts011': { key: 'factory_dispatch', date: '2026-04-13', reason: 'dispatch only known as on or after 13 Apr' },
  'bmrcl-4rs-dm-ts018': { key: 'depot_arrival', date: '2026-04-14', reason: 'arrival only known as on or before 14 Apr, and it left in two halves' }
};
export const excludedTrips = Object.keys(tripExclusions);

function tripOf(t: ResolvedTrainset, today: string): { days: number; approx: boolean } | undefined {
  const dispatch = t.milestones.find((m) => m.key === 'factory_dispatch');
  const arrival = t.milestones.find((m) => m.key === 'depot_arrival');
  if (!dispatch || !arrival || arrival.date > today) return undefined;
  const ex = tripExclusions[t.id];
  if (ex && (ex.key === 'factory_dispatch' ? dispatch : arrival).date === ex.date) return undefined;
  const approx = !exactDate(t, 'factory_dispatch', today) || !exactDate(t, 'depot_arrival', today);
  return { days: daysBetween(dispatch.date, arrival.date), approx };
}

/** First passenger opening of any section of each line, from the reviewed timelines. */
function firstOpenings(today: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of Object.keys(lines)) {
    const dates = (buildDelayStory(line, lines[line].milestones, today)?.sections ?? []).flatMap((s) => (s.opening ? [s.opening.date] : [])).sort();
    if (dates.length) out[line] = dates[0];
  }
  return out;
}

function fleetTrains(today: string, openings: Record<string, string>): FleetTrain[] {
  return resolvedTrainsets.map((t) => {
    const arrivedAny = t.milestones.find((m) => m.key === 'depot_arrival')?.date;
    const arrived = arrivedAny && arrivedAny <= today ? arrivedAny : undefined;
    const dispatchedOn = reportedDate(t, 'factory_dispatch', today);
    const arrivedOn = reportedDate(t, 'depot_arrival', today);
    const servedOn = reportedDate(t, 'revenue_induction', today);
    // Factory to depot is a short trip, so a loose date on either end can swamp it: both must be exact.
    const exactDispatch = exactDate(t, 'factory_dispatch', today);
    const exactArrival = exactDate(t, 'depot_arrival', today);
    const served = t.milestones.some((m) => m.key === 'revenue_induction' && m.date <= today);
    const opening = openings[t.displayLine];
    return {
      id: t.id,
      number: t.trainsetNumber,
      contractId: t.contractId,
      line: t.displayLine,
      maker: t.manufacturer,
      design: rollingStockDesign[t.rollingStockId],
      arrived,
      dispatchedOn,
      arrivedOn,
      servedOn,
      transitDays: exactDispatch && exactArrival ? daysBetween(exactDispatch, exactArrival) : undefined,
      trip: tripOf(t, today),
      depotDays: arrivedOn && (servedOn || !served) ? daysBetween(arrivedOn, servedOn ?? today) : undefined,
      waiting: Boolean(arrived) && !served,
      beforeOpening: Boolean(arrived) && (!opening || arrived! < opening)
    };
  });
}

const gapsOf = (list: FleetTrain[]) => list.slice(1).map((t, i) => ({ train: t, days: daysBetween(list[i].arrivedOn!, t.arrivedOn!) }));
/** Typical recent gap: median of the last eight non-zero gaps. */
const recentGap = (gaps: { days: number }[]) => { const g = gaps.slice(-8).map((x) => x.days).filter((d) => d > 0); return g.length ? median(g) : undefined; };
const SPEED: SpeedScale = { fast: 15, slow: 40 };

// ---------- Chapter 1: getting the trains here ----------
function deliveryTiles(trains: FleetTrain[], today: string): Tile[] {
  const tiles: Tile[] = [];
  const contractTrains = (id: string) => trains.filter((t) => t.contractId === id);

  for (const [id, reading] of Object.entries(deliveryReadings)) {
    const c = dataset.contracts[id];
    if (!c || c.contract_period !== reading.matches) continue;
    const own = contractTrains(id);
    const arrivals = own.flatMap((t) => (t.arrived ? [t.arrived] : [])).sort();
    if (!arrivals.length) continue;
    const code = codeOf(id);
    const ordered = c.base_trainsets ?? (c.base_cars ? c.base_cars / (dataset.rolling_stock[c.rolling_stock[0]]?.cars_per_trainset ?? 6) : arrivals.length);
    const delivered = own.filter((t) => t.arrived);
    const ticks = delivered.map((t) => ({ date: t.arrived!, color: lineColors[t.line] ?? '#8a928a' }));
    const legend = lineKey(delivered.map((t) => t.line));
    const kicker = `${code} contract · ${builderOf(id)}`;
    const icon = rollingStockDesign[c.rolling_stock[0]];
    const first = arrivals[0];
    if (reading.due && c.awarded_on) {
      const due = reading.due(c.awarded_on);
      tiles.push({
        id: `due-${code.toLowerCase()}`, size: 'w3', dark: true, kicker, icon,
        big: { parts: [{ n: monthLabel(due), struck: true }] },
        text: `The contract gave 173 weeks, so every train was due by **${monthLabel(due)}**. The first one arrived in **${monthLabel(first)}**.`,
        note: 'Dashed box: the time the contract allowed. Each tick: one train delivered.',
        share: `Namma Metro's ${code} trains (built by ${builderOf(id)}) were all due by ${monthLabel(due)}. The first one arrived in ${monthLabel(first)}.`,
        link: { href: `/lifecycle?maker=${builderOf(id).toLowerCase()}`, label: `See ${builderOf(id)}'s deliveries` },
        viz: { type: 'window', start: `${c.awarded_on.slice(0, 4)}-01-01`, end: `${Number(today.slice(0, 4)) + 1}-06-30`, band: { from: c.awarded_on, to: due }, ticks, legend, flags: [{ date: due, label: `All due ${monthLabel(due)}`, due: true }, { date: first, label: `First train ${monthLabel(first)}`, due: false }] }
      });
    } else if (reading.window) {
      const { from, to } = reading.window;
      const left = monthsBetween(today, to);
      tiles.push({
        id: `due-${code.toLowerCase()}`, size: 'w3', dark: true, kicker, icon,
        big: { parts: [{ n: `${arrivals.length}`, unit: `of ${ordered} delivered` }] },
        text: `${makerName(dataset.contracts[id].awardee)} was to deliver between **${monthLabel(from)} and ${monthLabel(to)}**. Its first train came in **${monthLabel(first)}**, and ${ordered - arrivals.length} are still to come${left > 0 ? ` with ${plural(left, 'month')} of that window left` : ' after that window closed'}.`,
        note: 'Dashed box: the original delivery schedule. Each tick: one train delivered.',
        share: `BEML was to deliver Namma Metro's ${ordered} ${code} trains between ${monthLabel(from)} and ${monthLabel(to)}. ${arrivals.length} have arrived so far; the first came in ${monthLabel(first)}.`,
        link: { href: `/fleet?maker=${builderOf(id).toLowerCase()}`, label: `View ${builderOf(id)}'s fleet` },
        viz: { type: 'window', start: `${from.slice(0, 4)}-01-01`, end: `${to.slice(0, 4)}-12-31`, band: { from, to }, ticks, legend, flags: [{ date: from, label: `First due ${monthLabel(from)}`, due: true }, { date: first, label: `First train ${monthLabel(first)}`, due: false }, { date: to, label: `All due ${monthLabel(to)}`, due: true }] }
      });
    }
  }

  // Titagarh delivery gaps
  let gapMax = 1;
  const tit = trains.filter((t) => t.maker === TITAGARH && t.arrivedOn).sort((a, b) => a.arrivedOn!.localeCompare(b.arrivedOn!));
  const titGaps = gapsOf(tit);
  const early = titGaps.length >= 8 ? Math.round(mean(titGaps.slice(0, 4).map((g) => g.days))) : undefined;
  const recent = recentGap(titGaps);
  const bemlForScale = trains.filter((t) => t.maker === 'BEML' && t.arrivedOn).sort((a, b) => a.arrivedOn!.localeCompare(b.arrivedOn!));
  // Both gap charts share one y scale so their bars can be compared side by side.
  gapMax = Math.max(1, ...titGaps.map((g) => g.days), ...gapsOf(bemlForScale).map((g) => g.days));
  if (early !== undefined && recent !== undefined) {
    tiles.push({
      id: 'titagarh-gaps', size: 'w4', kicker: 'Titagarh · days between deliveries',
      big: { parts: [{ n: `${early}` }, { n: `${recent}`, unit: 'days' }], arrow: true },
      text: `Titagarh's first trains arrived about **${early} days apart**. Now a new one turns up about **every ${recent} days**.`,
      share: `Titagarh now delivers a Namma Metro train about every ${recent} days. Its first ones came ${early} days apart.`,
      link: { href: '/lifecycle?maker=titagarh', label: "See Titagarh's deliveries" },
      viz: { type: 'gaps', bars: titGaps.map((g) => ({ days: g.days, label: `${g.train.number}: ${g.days} days after the one before` })), scale: SPEED, ends: [titGaps[0].train.number, titGaps.at(-1)!.train.number], max: gapMax }
    });
  }

  // BEML delivery gaps
  const beml = trains.filter((t) => t.maker === 'BEML' && t.arrivedOn).sort((a, b) => a.arrivedOn!.localeCompare(b.arrivedOn!));
  const bemlGaps = gapsOf(beml);
  const bemlTypical = bemlGaps.length >= 4 ? median(bemlGaps.map((g) => g.days).filter((d) => d > 0)) : undefined;
  if (bemlTypical !== undefined) {
    tiles.push({
      id: 'beml-gaps', size: 'w2', kicker: 'BEML · days between deliveries',
      big: { parts: [{ n: `${bemlTypical}`, unit: 'days' }] },
      text: `BEML builds in ${makerPlaces.BEML} and has sent a train about **every ${bemlTypical} days** since its first.`,
      share: `BEML sends Namma Metro a new train about every ${bemlTypical} days.`,
      link: { href: '/lifecycle?maker=beml', label: "See BEML's deliveries" },
      viz: { type: 'gaps', bars: bemlGaps.map((g) => ({ days: g.days, label: `${g.train.number}: ${g.days} days after the one before` })), scale: SPEED, ends: [bemlGaps[0].train.number, bemlGaps.at(-1)!.train.number], max: gapMax }
    });
  }

  // Titagarh factory to depot
  const dispatchOf = (t: FleetTrain) => resolvedTrainsets.find((r) => r.id === t.id)!.milestones.find((m) => m.key === 'factory_dispatch')!.date;
  const transit = trains.filter((t) => t.maker === TITAGARH && t.trip).sort((a, b) => dispatchOf(a).localeCompare(dispatchOf(b)));
  if (transit.length >= 4) {
    const firstT = transit[0].trip!.days, lastT = transit.at(-1)!.trip!.days;
    const recentT = transit.slice(-4).map((t) => t.trip!.days);
    // Only claim "N times faster" when it really is at least double; 1.75× is not "about 2 times".
    const times = lastT > 0 && firstT / lastT >= 2 ? Math.round(firstT / lastT) : 0;
    tiles.push({
      id: 'titagarh-transit', size: 'w2', kicker: 'Titagarh · factory to depot',
      route: { from: 'kolkata', to: 'bengaluru', label: 'Route from the Kolkata area to Bengaluru' },
      big: { parts: [{ n: `${firstT}` }, { n: `${lastT}`, unit: 'days' }], arrow: true },
      text: `The road trip from ${makerPlaces[TITAGARH]} to the Bengaluru depot now takes **${range(Math.min(...recentT), Math.max(...recentT))} days**${times >= 2 ? `, about ${times} times faster than the first` : ''}.`,
      note: 'Hollow dots indicate approximate dates. Some trains with ambiguous data are excluded.',
      share: `Titagarh's trains now reach the Bengaluru depot ${range(Math.min(...recentT), Math.max(...recentT))} days after leaving the factory. The first took ${firstT}.`,
      link: { href: '/lifecycle?maker=titagarh', label: "See Titagarh's deliveries" },
      viz: { type: 'line', points: transit.map((t) => ({ days: t.trip!.days, approx: t.trip!.approx, label: `${t.number}: ${t.trip!.days} days${t.trip!.approx ? ' (approximate date)' : ''}` })), scale: { fast: 12, slow: 20 }, ends: [transit[0].number, transit.at(-1)!.number] }
    });
  }

  // When will each order be done, at the recent pace?
  const estimates = Object.entries(deliveryReadings).flatMap(([id, reading]) => {
    const c = dataset.contracts[id];
    if (!c) return [];
    const own = contractTrains(id).filter((t) => t.arrived).sort((a, b) => a.arrived!.localeCompare(b.arrived!));
    const ordered = c.base_trainsets ?? (c.base_cars ? c.base_cars / (dataset.rolling_stock[c.rolling_stock[0]]?.cars_per_trainset ?? 6) : 0);
    const gap = recentGap(own.slice(1).map((t, i) => ({ days: daysBetween(own[i].arrived!, t.arrived!) })));
    const due = reading.due && c.awarded_on ? reading.due(c.awarded_on) : reading.window?.to;
    if (!own.length || !gap || !due || ordered <= own.length) return [];
    return [{ code: codeOf(id), builder: builderOf(id), design: rollingStockDesign[c.rolling_stock[0]], delivered: own.length, ordered, first: own[0].arrived!, last: own.at(-1)!.arrived!, left: ordered - own.length, done: addDays(own.at(-1)!.arrived!, (ordered - own.length) * gap), due, gap }];
  });
  if (estimates.length) {
    tiles.push({
      id: 'finish', size: 'w2', kicker: 'When will the orders be done?',
      text: 'If each maker keeps its recent pace. The red line is when the contract said it should be done.',
      note: 'By linear extrapolation (trains left × the recent gap between deliveries).',
      share: `At the recent pace, ${estimates.map((e) => `the last ${e.code} train (${e.builder}) arrives around ${monthLabel(e.done)}, due ${monthLabel(e.due)}`).join('; ')}.`,
      link: { href: '/fleet', label: 'Fleet' },
      viz: {
        type: 'orders', today,
        // Half a year of padding so a label at the earliest date isn't cut off.
        start: `${Number([...estimates.flatMap((e) => [e.first, e.due])].sort()[0].slice(0, 4)) - 1}-07-01`,
        end: `${Number(estimates.map((e) => e.done).sort().at(-1)!.slice(0, 4)) + 1}-01-01`,
        rows: estimates.map(({ code, builder, design, delivered, ordered, first, last, done, due }) => ({ code, builder, design, delivered, ordered, first, last, done, due }))
      }
    });
  }

  // Who builds a split order
  for (const [id, c] of Object.entries(dataset.contracts)) {
    const byMaker = new Map<string, number>();
    for (const a of c.base_allocations ?? []) byMaker.set(a.manufacturer, (byMaker.get(a.manufacturer) ?? 0) + a.trainsets);
    const own = byMaker.get(c.awardee);
    if (byMaker.size < 2 || !own) continue;
    const total = [...byMaker.values()].reduce((a, b) => a + b, 0);
    const others = [...byMaker.keys()].filter((m) => m !== c.awardee);
    const otherNames = listOf(others.map(makerName));
    const otherPlaces = listOf(others.map((m) => makerPlaces[m]).filter(Boolean));
    const code = codeOf(id);
    const design = rollingStockDesign[c.rolling_stock[0]];
    tiles.push({
      id: 'who-builds', size: 'w2', kicker: `${code} · who builds it`,
      big: { parts: [{ n: `${own}`, unit: `of ${total}` }] },
      text: `The order went to **${makerName(c.awardee)}${makerPlaces[c.awardee] ? ` in ${makerPlaces[c.awardee]}` : ''}**, but only **${plural(own, 'train')}** ${own === 1 ? 'was' : 'were'} built there. **${otherNames}${otherPlaces ? ` in ${otherPlaces}` : ''}** builds the other ${total - own}.`,
      share: `Only ${own} of Namma Metro's ${total} ${code} trains were built by ${makerName(c.awardee)}, which won the order. ${otherNames} builds the other ${total - own}.`,
      link: { href: '/fleet', label: 'Fleet' },
      viz: {
        type: 'icons', size: 20, fill: true,
        items: Array.from({ length: total }, (_, i) => ({ color: i < own ? 'var(--ink)' : '#c9d0c5', design, label: i < own ? makerName(c.awardee) : otherNames })),
        legend: [{ color: 'var(--ink)', label: `${makerName(c.awardee)} (${own})` }, { color: '#c9d0c5', label: `${otherNames} (${total - own})` }]
      }
    });
    break;
  }
  return tiles;
}

// ---------- Chapter 2: waiting to carry passengers ----------
function waitingTiles(trains: FleetTrain[], today: string): Tile[] {
  const tiles: Tile[] = [];
  const ready = trains.filter((t) => t.servedOn && t.depotDays !== undefined && !t.beforeOpening).sort((a, b) => a.arrivedOn!.localeCompare(b.arrivedOn!));
  const early = trains.filter((t) => t.servedOn && t.depotDays !== undefined && t.beforeOpening).sort((a, b) => b.depotDays! - a.depotDays!);
  const earlyMonths = early.map((t) => Math.floor(toMonths(t.depotDays!)));
  const earlyRange = early.length ? range(Math.min(...earlyMonths), Math.max(...earlyMonths)) : undefined;

  if (ready.length >= 3) {
    const typical = median(ready.map((t) => t.depotDays!));
    tiles.push({
      id: 'line-ready', size: 'w2', kicker: 'Line already open',
      big: { parts: [{ n: `${typical}`, unit: 'days' }] },
      text: 'is the typical time from depot to passengers for a train joining **a line that is already running**.',
      share: `A new Namma Metro train joining a line that's already running carries passengers about ${typical} days after reaching the depot.`,
      link: { href: '/fleet', label: 'Fleet' },
      viz: { type: 'columns', bars: ready.map((t) => ({ days: t.depotDays!, label: `${t.number} (${lineName(t.line)}): ${t.depotDays} days` })), scale: { fast: 30, slow: 90 }, ends: [ready[0].number, ready.at(-1)!.number], legend: ['a month or less', '1–3 months', 'longer'] }
    });
  }

  if (early.length) {
    const top = early[0];
    const rows = early.slice(0, 6);
    tiles.push({
      id: 'before-opening', size: 'w4', dark: true, kicker: 'Delivered before the line opened',
      big: { parts: [{ n: `${Math.floor(toMonths(top.depotDays!))}`, unit: 'months at the depot' }] },
      text: `${lineName(top.line)} Line's ${top.number} waited the longest before its first passengers. ${plural(early.length, 'train')} arrived before their line opened and **waited ${earlyRange} months**.`,
      share: `${lineName(top.line)} Line train ${top.number} sat at the depot for ${Math.floor(toMonths(top.depotDays!))} months before carrying anyone, because its line wasn't open yet.`,
      link: { href: '/lifecycle', label: 'Lifecycle' },
      viz: {
        type: 'split',
        rows: rows.map((t) => ({ label: `${t.number} · ${lineName(t.line)}`, first: t.transitDays, second: t.depotDays!, right: `${t.depotDays} days` })),
        max: Math.max(...rows.map((t) => (t.transitDays ?? 0) + t.depotDays!)),
        legend: ['on the way from the factory', 'parked at the depot']
      }
    });
  }

  // Finished track waiting for passengers: each line's first reviewed span ending in passenger service.
  const spans = lineOrder.flatMap((line) => {
    const span = buildDelayStory(line, lines[line]?.milestones ?? [], today)?.spans.find((s) => !s.label.startsWith('First mainline run'));
    return span ? [{ line, ...span }] : [];
  }).sort((a, b) => b.months - a.months);
  if (spans.length) {
    const ordered = lineOrder.flatMap((l) => spans.filter((x) => x.line === l));
    tiles.push({
      id: 'track-ready', size: 'w3', kicker: 'Track ready, no passengers',
      text: 'How long finished lines waited between **civil works done** and **the first passengers**.',
      share: ordered.map((x) => `The ${lineName(x.line)} Line's civil works were done in ${monthLabel(x.from)}; passengers got on in ${monthLabel(x.to)}, ${x.months} months later.`).join(' '),
      link: { href: '/timeline', label: 'Line timelines' },
      viz: { type: 'spans', rows: ordered.map((x) => ({ line: x.line, label: `${lineName(x.line)} Line`, color: lineColors[x.line], from: monthLabel(x.from), to: monthLabel(x.to), months: x.months })) }
    });
  }

  const waiting = trains.filter((t) => t.waiting).sort((a, b) => a.arrived!.localeCompare(b.arrived!));
  if (waiting.length) {
    const longest = waiting[0];
    tiles.push({
      id: 'waiting-now', size: 'w3', kicker: 'Waiting right now',
      big: { parts: [{ n: `${waiting.length}`, unit: 'delivered trains' }] },
      text: `are at depots being tested, **not carrying anyone yet**. The longest wait: ${lineName(longest.line)} ${longest.number}, there since ${formatDate(longest.arrived)}.`,
      share: `${waiting.length} delivered Namma Metro trains are at depots being tested, not carrying anyone yet. One has been there since ${formatDate(longest.arrived)}.`,
      link: { href: '/fleet', label: 'Fleet' },
      viz: {
        type: 'icons', size: 24,
        items: waiting.map((t) => ({ color: lineColors[t.line], design: t.design, label: `${t.number} · ${lineName(t.line)}` })),
        legend: lineOrder.flatMap((l) => { const n = waiting.filter((t) => t.line === l).length; return n ? [{ color: lineColors[l], label: `${lineName(l)} (${n})` }] : []; })
      }
    });
  }
  return tiles;
}

// ---------- Chapter 3: opening dates ----------
/** Station-strip stops: short labels ("Sep 2025", "Dec", "15 Aug", "Mid-Oct"), the year only when it
 * changes, and dates in the last week before an opening folded into one stop on the opening day. */
function shortStops(s: SectionStory): { stops: { label: string; full: string; state: StopState }[]; merged: boolean } {
  type Stop = { label: string; date: string; full: string; ok: boolean; state: StopState };
  const stateOf = (t: SectionStory['targets'][number]): StopState => (t.kind === 'not-before' ? 'floor' : t.outcome === 'missed' ? 'missed' : 'kept');
  let list: Stop[] = s.targets.map((t) => ({ label: t.label, date: t.target, full: stripNote(t.label), ok: t.outcome !== 'missed', state: stateOf(t) }));
  let merged = false;
  const opening = s.opening?.date;
  if (opening) {
    let cut = list.length;
    while (cut > 0 && list[cut - 1].ok && Math.abs(yearFraction(list[cut - 1].date) - yearFraction(opening)) * 365 <= 7) cut--;
    if (list.length - cut > 1) {
      const day = `${Number(opening.slice(8, 10))} ${MONTHS[Number(opening.slice(5, 7)) - 1]} ${opening.slice(0, 4)}`;
      list = [...list.slice(0, cut), { label: day, date: opening, full: list.slice(cut).map((x) => x.full).join(', '), ok: true, state: 'kept' }];
      merged = true;
    }
  }
  let year = '';
  const stops = list.map(({ label, date, full, state }) => {
    const day = label.match(/(\d{1,2}) ([A-Z][a-z]{2})/);
    const month = MONTHS[Number(date.slice(5, 7)) - 1];
    const when = day ? `${day[1]} ${day[2]}` : /^Mid-/i.test(label) ? `Mid-${month}` : month;
    // "Not before" promises keep their wording, or a kept "after 15 Oct" reads like a met 15 Oct date.
    const base = /^(after|not before)\b/i.test(label) ? `After ${when}` : when;
    const short = date.slice(0, 4) !== year ? `${base} ${date.slice(0, 4)}` : base;
    year = date.slice(0, 4);
    return { label: short, full, state };
  });
  return { stops, merged };
}
function datesTiles(today: string): Tile[] {
  const tiles: Tile[] = [];
  const stories = lineOrder.map((line) => ({ line, story: buildDelayStory(line, lines[line]?.milestones ?? [], today) }));
  const sections: { line: string; s: SectionStory }[] = stories.flatMap(({ line, story }) => (story?.sections ?? []).map((s) => ({ line, s })));

  // A single-section line that has opened: every date it was given.
  const single = stories.find(({ story }) => story?.sections.length === 1 && story.sections[0].opening && story.sections[0].earliest);
  if (single?.story) {
    const s = single.story.sections[0];
    const late = monthsBetween(s.earliest!.target, s.opening!.date);
    tiles.push({
      id: `${single.line}-dates`, size: 'w3', dark: true, kicker: `${lineName(single.line)} Line`,
      big: { parts: [{ n: `${late}`, unit: 'months late' }] },
      text: `${s.missed} of ${s.targets.length} opening dates were missed. It opened **${late} months after** the first date it was given.`,
      share: `The ${lineName(single.line)} Line opened ${late} months after its first promised date. ${s.missed} of ${s.targets.length} dates were missed.`,
      link: { href: `/timeline/${single.line}`, label: `${lineName(single.line)} timeline` },
      viz: {
        type: 'ladder', color: lineColors[single.line],
        rows: [
          ...s.targets.map((t) => ({ label: t.label, note: t.outcome === 'missed' ? (t.monthsLate ? `+${t.monthsLate} mo` : `+${t.daysLate} d`) : t.outcome === 'not-taken' ? 'dropped' : t.outcome, missed: t.outcome === 'missed', open: false })),
          { label: `Opened ${formatDate(s.opening!.date)}`, note: '', missed: false, open: true }
        ]
      }
    });
  }

  // The line that opened in the most parts: months late per part.
  const multi = stories
    .map(({ line, story }) => ({ line, parts: (story?.sections ?? []).filter((s) => s.opening && s.earliest) }))
    .sort((a, b) => b.parts.length - a.parts.length)[0];
  if (multi && multi.parts.length >= 3) {
    // In opening order: most people know the parts by when they opened, not by internal names.
    const rows = [...multi.parts].sort((a, b) => a.opening!.date.localeCompare(b.opening!.date)).map((s) => ({ label: s.label, value: Math.max(0, monthsBetween(s.earliest!.target, s.opening!.date)), opened: s.opening!.date }));
    const lateParts = rows.filter((r) => r.value > 0).length;
    const missed = multi.parts.reduce((n, s) => n + s.missed, 0), total = multi.parts.reduce((n, s) => n + s.targets.length, 0);
    tiles.push({
      id: `${multi.line}-parts`, size: 'w3', kicker: `${lineName(multi.line)} Line · ${multi.parts.length} openings`,
      big: { parts: [{ n: `${lateParts}`, unit: `of ${rows.length} late` }] },
      text: `${lateParts === rows.length ? `Every part of the ${lineName(multi.line)} Line opened late.` : `${lateParts} parts of the ${lineName(multi.line)} Line opened late.`} ${missed} of ${total} opening dates were missed.`,
      note: "Months from each part's first promised date to its opening, in the order they opened.",
      share: `${lateParts === rows.length ? `Every part of Namma Metro's ${lineName(multi.line)} Line opened late` : `${lateParts} of ${rows.length} parts of the ${lineName(multi.line)} Line opened late`}. ${missed} of ${total} opening dates were missed.`,
      link: { href: `/timeline/${multi.line}`, label: `${lineName(multi.line)} timeline` },
      viz: { type: 'hbars', rows: rows.map((r) => ({ label: r.label, sub: r.opened.slice(0, 4), value: r.value, color: lineColors[multi.line], right: `${r.value} mo` })), max: Math.max(1, ...rows.map((r) => r.value)) }
    });
  }

  // The section given the most dates.
  // "Not before" statements are floors, not deadlines, so they don't count as opening dates.
  const deadlines = (s: SectionStory) => s.targets.filter((t) => t.kind !== 'not-before').length;
  const busiest = [...sections].sort((a, b) => deadlines(b.s) - deadlines(a.s))[0];
  if (busiest && deadlines(busiest.s) >= 4) {
    const { line, s } = busiest;
    const count = deadlines(s);
    tiles.push({
      id: 'most-dates', size: 'w6', dark: true, kicker: `${lineName(line)} Line · ${s.label.toLowerCase()} section`,
      big: { parts: [{ n: `${count}`, unit: 'opening dates' }] },
      text: `for one stretch. **${s.missed} ${s.missed === 1 ? 'was' : 'were'} missed**${s.opening ? ` before it finally opened on ${formatDate(s.opening.date)}` : ''}.`,
      share: `The ${lineName(line)} Line's ${s.noun.replace(/-/g, ' ')} section was given ${count} different opening dates. ${s.missed} were missed.`,
      link: { href: `/timeline/${line}`, label: `${lineName(line)} timeline` },
      note: shortStops(s).merged ? 'Dates a day or two before the opening are shown as one stop.' : undefined,
      viz: { type: 'stations', color: lineColors[line], stops: shortStops(s).stops }
    });
  }

  // The unopened section whose date has slipped furthest.
  const drift = sections
    .filter(({ s }) => !s.opening && s.earliest && s.current)
    .map(({ line, s }) => ({ line, s, years: monthsBetween(s.earliest!.target, s.current!.target) / 12 }))
    .sort((a, b) => b.years - a.years)[0];
  let slipTile: Tile | undefined;
  if (drift && drift.years >= 1) {
    const { line, s } = drift;
    const first = stripNote(s.earliest!.label);
    const source = s.earliest!.label.match(/\((.*)\)$/)?.[1];
    const hasMap = networkPaths.some((p) => p.segment === s.id);
    slipTile = {
      id: 'furthest-slip', size: 'w3', kicker: `${lineName(line)} Line · ${s.label}`,
      // Not opened yet, so the current date carries an asterisk: it can still move.
      big: { parts: [{ n: first, struck: true }, { n: `${s.current!.label}*` }], arrow: true },
      text: `The deadline has moved ${plural(s.changes, 'time')} so far${source ? ` from the ${source}` : ''} for just this stretch alone.`,
      note: '*Subject to further delays.',
      share: `The ${lineName(line)} Line's ${s.label} stretch was first due in ${first}. The date now is ${s.current!.label}, after moving ${plural(s.changes, 'time')}.`,
      link: { href: `/timeline/${line}`, label: `${lineName(line)} timeline` },
      viz: hasMap ? { type: 'map', segment: s.id, label: segmentKm(s.id) !== undefined ? `${segmentKm(s.id)} km` : undefined } : { type: 'compare', items: [{ label: 'first date', value: first }, { label: 'now', value: s.current!.label }] }
    };
  }

  // Notice given vs. how late.
  const points: NoticePoint[] = sections.filter(({ s }) => s.opening).flatMap(({ line, s }) =>
    s.targets.flatMap((t) => (t.outcome === 'missed' && t.announced && t.monthsLate !== undefined
      ? [{ line, section: s.label, label: t.label, ahead: Math.round(toMonths(daysBetween(t.announced, t.target))), late: t.monthsLate }]
      : [])));
  const worse = points.filter((p) => p.late > p.ahead).length;
  if (points.length >= 5) {
    tiles.push({
      id: 'notice', size: 'w3', kicker: 'Notice given vs. how late',
      big: { parts: [{ n: `${worse}`, unit: `of ${points.length}` }] },
      text: 'missed dates were late by **more time than the notice** given. (Notice = how far ahead the date was announced.)',
      share: `${worse} of ${points.length} missed Namma Metro opening dates were late by more time than the notice given when they were announced.`,
      link: { href: '/timeline', label: 'Line timelines' },
      viz: { type: 'notice', points, worse }
    });
  }
  if (slipTile) tiles.push(slipTile);

  const board: BoardRow[] = sections.filter(({ s }) => !s.opening && s.targets.length).map(({ line, s }) => ({
    line, section: s.label, first: stripNote((s.earliest ?? s.targets[0]).label), now: s.current?.label, moved: s.changes
  }));
  if (board.length) {
    tiles.push({
      id: 'still-waiting', size: 'w6', dark: true, kicker: 'Still waiting to open',
      text: 'The first date promised for each unopened stretch, and the date now.',
      share: `${board.length} Namma Metro stretches are still waiting to open. Their dates have moved ${board.reduce((n, r) => n + r.moved, 0)} times between them.`,
      link: { href: '/timeline', label: 'Line timelines' },
      viz: { type: 'board', rows: board }
    });
  }
  return tiles;
}

export function buildStats(today: string): Stats {
  const trains = fleetTrains(today, firstOpenings(today));
  const chapters: Chapter[] = [
    { id: 'deliveries', short: 'Deliveries', title: 'Getting the trains here', summary: 'When the new trains were due, when they actually came, and how the pace has changed.', tiles: deliveryTiles(trains, today) },
    { id: 'waiting', short: 'Waiting time', title: 'Waiting to carry passengers', summary: 'A delivered train still has to be tested and cleared before anyone can ride it. That is quick on a line that is already running, and very slow when the line itself is not ready.', tiles: waitingTiles(trains, today) },
    { id: 'opening-dates', short: 'Deadlines', title: 'Opening dates', summary: 'Every opening date given out by BMRCL and officials, and what happened to it. A date counts as missed when the line opened after it.', tiles: datesTiles(today) }
  ];
  return { today, trains, chapters: chapters.filter((c) => c.tiles.length) };
}
