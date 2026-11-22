// Home page story slides. Every figure is computed from trainsets.json / lines.json at build time;
// readings of prose fields (contract delivery periods) are reviewed here and only apply while the
// stored text still matches, like reviewed-targets.ts.
import { addDays, daysBetween, formatDate } from './date';
import { buildDelayStory, monthsBetween } from './delay-story';
import { lines } from './lines';
import { lineColors, lineShortLabels } from './presentation';
import { dataset, resolvedTrainsets } from './resolve';
import type { ResolvedTrainset } from './types';

export type StoryTone = 'missed' | 'met' | 'muted' | 'current' | 'highlight';

export type StoryVisual =
  | { type: 'ladder'; rows: { label: string; note: string; tone: StoryTone; struck?: boolean }[] }
  | { type: 'window'; start: string; end: string; band: { from: string; to: string; label: string }; marks: { date: string; color: string }[]; flags: { date: string; label: string; tone: StoryTone }[]; today: string; caption: string }
  | { type: 'bars'; unit: string; max: number; rows: { label: string; value: number; color: string; open?: boolean; note?: string }[]; caption: string };

export interface Story {
  id: string;
  kicker: string;
  color: string;
  headline: string;
  body: string;
  link: { href: string; label: string };
  visual: StoryVisual;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const mo = (n: number) => `${n} month${n === 1 ? '' : 's'}`;
const dateOf = (t: ResolvedTrainset, key: string) => t.milestones.find((m) => m.key === key)?.date;
const delivered = (t: ResolvedTrainset, today: string) => {
  const d = dateOf(t, 'depot_arrival');
  return d && d <= today ? d : undefined;
};

// Reviewed readings of contract delivery periods (prose in trainsets.json).
const deliveryReadings: Record<string, { matches: string; due?: (awarded: string) => string; window?: { from: string; to: string } }> = {
  'bmrcl-4rs-dm': { matches: 'Original delivery period: 173 weeks; subsequently delayed', due: (awarded) => addDays(awarded, 173 * 7) },
  'bmrcl-5rs-dm': { matches: 'Original base-order delivery schedule: June 2025–May 2027; comprehensive maintenance for up to 15 years', window: { from: '2025-06-01', to: '2027-05-31' } }
};

// Sentence wording for the first reviewed span of a line.
const spanPhrases: Record<string, string> = {
  'Civil work done → passengers': 'civil works completion and the first revenue service'
};

type ContractRaw ={ awarded_on?: string; base_trainsets?: number; base_cars?: number; contract_period?: string; rolling_stock: string[] };

function deadlineStory(lineId: string, today: string): Story | null {
  const story = buildDelayStory(lineId, lines[lineId]?.milestones ?? [], today);
  const first = story?.sections[0];
  if (!story || !first?.opening || !first.earliest) return null;
  const late = monthsBetween(first.earliest.target, first.opening.date);
  const multi = story.sections.length > 1;
  const later = story.sections.slice(1).find((s) => !s.opening && s.current);
  const name = lineShortLabels[lineId] ?? lineId;
  const civil = story.spans[0];
  const rows = first.targets.map((t) => ({
    label: t.label,
    note: t.outcome === 'missed' ? `+${t.monthsLate} mo` : t.outcome === 'not-taken' ? 'retracted' : t.outcome,
    tone: (t.outcome === 'missed' ? 'missed' : t.outcome === 'not-taken' ? 'muted' : 'met') as StoryTone,
    struck: t.outcome === 'missed'
  }));
  rows.push({ label: `Opened ${formatDate(first.opening.date)}`, note: '', tone: 'highlight', struck: false });
  if (later?.current) rows.push({ label: `${later.label}: ${later.current.label}`, note: `moved ${later.targets.length - 1}×`, tone: 'current', struck: false });
  return {
    id: `${lineId}-deadlines`,
    kicker: multi ? `${name} Line · ${first.label.toLowerCase()} section` : `${name} Line`,
    color: lineColors[lineId],
    headline: multi
      ? `The ${first.label.toLowerCase()} section opened ${late} months after its first target.`
      : `Opened ${late} months after the first target deadline.`,
    body: [
      `${first.missed} of ${first.targets.length} reported ${multi ? first.label.toLowerCase() + ' ' : ''}opening targets missed.`,
      later?.current ? `The ${later.label.toLowerCase()} target has moved ${later.targets.length - 1} times; it now stands at ${later.current.label}.` : civil ? `${civil.months} months between ${spanPhrases[civil.label] ?? civil.label} .`.replace(' .', '.') : ''
    ].filter(Boolean).join(' '),
    link: { href: `/timeline/${lineId}`, label: 'Walk through the timeline' },
    visual: { type: 'ladder', rows }
  };
}

function contractStory(id: string, today: string): Story | null {
  const c = dataset.contracts[id] as unknown as ContractRaw | undefined;
  const reading = deliveryReadings[id];
  if (!c || !reading || c.contract_period !== reading.matches) return null;
  const trains = resolvedTrainsets.filter((t) => t.contractId === id);
  const arrivals = trains.flatMap((t) => { const d = delivered(t, today); return d ? [{ t, d }] : []; }).sort((a, b) => a.d.localeCompare(b.d));
  if (!arrivals.length) return null;
  const firstArrival = arrivals[0].d;
  const code = id.replace('bmrcl-', '').toUpperCase();
  const marks = arrivals.map(({ t, d }) => ({ date: d, color: lineColors[t.displayLine] ?? '#8a928a' }));

  if (reading.due && c.awarded_on) {
    const due = reading.due(c.awarded_on);
    const carsPerTrain = dataset.rolling_stock[c.rolling_stock[0]]?.cars_per_trainset ?? 6;
    const ordered = c.base_trainsets ?? (c.base_cars ? c.base_cars / carsPerTrain : arrivals.length);
    return {
      id: `${id}-delivery`,
      kicker: `${code} · CRRC / Titagarh`,
      color: lineColors.yellow,
      headline: `The ${code} trains were due by ${monthLabel(due)}. The first arrived in ${monthLabel(firstArrival)}.`,
      body: `The contract allowed 173 weeks from its ${formatDate(c.awarded_on)} award. ${arrivals.length} of ${ordered} trains have been delivered so far, ${mo(monthsBetween(due, today))} after that deadline.`,
      link: { href: '/lifecycle', label: 'See every delivery' },
      visual: {
        type: 'window', start: c.awarded_on, end: today,
        band: { from: c.awarded_on, to: due, label: 'Contract delivery period' },
        marks,
        flags: [{ date: due, label: `Due ${monthLabel(due)}`, tone: 'missed' }, { date: firstArrival, label: `First train ${monthLabel(firstArrival)}`, tone: 'current' }],
        today,
        caption: 'Each tick is a delivered train, coloured by line.'
      }
    };
  }

  if (reading.window) {
    const base = c.base_trainsets ?? arrivals.length;
    const baseArrivals = arrivals.filter(({ t }) => t.sortNumber <= base);
    const left = monthsBetween(today, reading.window.to);
    return {
      id: `${id}-delivery`,
      kicker: `${code} · BEML`,
      color: lineColors.pink,
      headline: `BEML's first train was due in ${monthLabel(reading.window.from)}. It arrived in ${monthLabel(firstArrival)}.`,
      body: `${baseArrivals.length} of ${base} base-order trains delivered, with ${left > 0 ? `${mo(left)} of the original ${monthLabel(reading.window.from)}–${monthLabel(reading.window.to)} schedule left` : 'the original schedule over'}.`,
      link: { href: '/fleet', label: 'See the fleet' },
      visual: {
        type: 'window', start: '2025-01-01', end: '2027-08-31',
        band: { from: reading.window.from, to: reading.window.to, label: 'Original delivery schedule' },
        marks,
        flags: [{ date: firstArrival, label: `First train ${monthLabel(firstArrival)}`, tone: 'current' }],
        today,
        caption: 'Each tick is a delivered train, coloured by line.'
      }
    };
  }
  return null;
}

function waitedStory(today: string): Story | null {
  const rows = resolvedTrainsets.flatMap((t) => {
    const d = delivered(t, today);
    const s = dateOf(t, 'revenue_induction');
    return d && s && s <= today ? [{ t, days: daysBetween(d, s) }] : [];
  }).sort((a, b) => b.days - a.days);
  if (!rows.length) return null;
  const top = rows[0];
  const months = Math.round(top.days / 30.44);
  const median = rows[Math.floor(rows.length / 2)].days;
  return {
    id: 'delivery-to-passengers',
    kicker: 'Delivered, then waiting',
    color: lineColors[top.t.displayLine],
    headline: `${lineShortLabels[top.t.displayLine]} Line's ${top.t.trainsetNumber} waited ${months} months between delivery and its first passengers.`,
    body: `Across ${rows.length} trains now in service, the typical wait from depot arrival to passenger service was ${Math.round(median / 30.44)} months. Prototypes and trains waiting for a line to open wait longest.`,
    link: { href: '/lifecycle', label: 'Compare on the lifecycle chart' },
    visual: {
      type: 'bars', unit: 'mo', max: Math.ceil(top.days / 30.44),
      rows: rows.slice(0, 6).map(({ t, days }) => ({ label: `${t.trainsetNumber} · ${lineShortLabels[t.displayLine]}`, value: Math.round((days / 30.44) * 10) / 10, color: lineColors[t.displayLine] })),
      caption: 'Months from depot arrival to first revenue service, longest six.'
    }
  };
}

function waitingNowStory(today: string): Story | null {
  const rows = resolvedTrainsets.flatMap((t) => {
    const d = delivered(t, today);
    const s = dateOf(t, 'revenue_induction');
    return d && !(s && s <= today) ? [{ t, days: daysBetween(d, today), since: d }] : [];
  }).sort((a, b) => b.days - a.days);
  if (!rows.length) return null;
  const byLine = Object.entries(rows.reduce((acc, r) => { acc[r.t.displayLine] = (acc[r.t.displayLine] ?? 0) + 1; return acc; }, {} as Record<string, number>));
  const top = rows[0];
  return {
    id: 'waiting-now',
    kicker: 'Waiting right now',
    color: lineColors[top.t.displayLine],
    headline: `${rows.length} delivered trains are not carrying passengers yet.`,
    body: `${byLine.map(([l, n]) => `${n} on ${lineShortLabels[l] ?? l}`).join(', ')}. Longest wait: ${lineShortLabels[top.t.displayLine]} ${top.t.trainsetNumber}, at the depot since ${formatDate(top.since)}.`,
    link: { href: '/fleet', label: 'See trains in testing' },
    visual: {
      type: 'bars', unit: 'mo', max: Math.max(1, Math.ceil(top.days / 30.44)),
      rows: rows.slice(0, 6).map(({ t, days }) => ({ label: `${t.trainsetNumber} · ${lineShortLabels[t.displayLine]}`, value: Math.round((days / 30.44) * 10) / 10, color: lineColors[t.displayLine], open: true })),
      caption: 'Months since depot arrival, still counting.'
    }
  };
}

export function buildStories(today: string): Story[] {
  return [
    deadlineStory('yellow', today),
    deadlineStory('pink', today),
    contractStory('bmrcl-4rs-dm', today),
    contractStory('bmrcl-5rs-dm', today),
    waitedStory(today),
    waitingNowStory(today)
  ].filter((s): s is Story => s !== null);
}
