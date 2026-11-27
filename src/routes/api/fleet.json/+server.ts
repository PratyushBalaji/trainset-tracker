import { json } from '@sveltejs/kit';
import { todayIsoDate } from '$lib/data/date';
import { lineOrder } from '$lib/data/presentation';
import { decorateTrainsetForDate, resolvedTrainsets } from '$lib/data/resolve';
import { pendingOn, untrackedFleet } from '$lib/data/coverage';

// A static file built at deploy time, so other sites (e.g. a portfolio's build) can read the same
// numbers as the home page's "Fleet today" panel. It updates whenever the tracker redeploys.
export const prerender = true;

export function GET() {
  const asOf = todayIsoDate();
  const fleet = resolvedTrainsets.map((t) => decorateTrainsetForDate(t, asOf));
  const count = (trains: typeof fleet, stage: string) => trains.filter((t) => t.currentStage.id === stage).length;

  return json({
    asOf,
    // Includes the older Purple/Green trains that aren't tracked individually, as the home page does.
    inService: count(fleet, 'service') + untrackedFleet.trainsets,
    testing: count(fleet, 'testing'),
    inTransit: count(fleet, 'dispatch'),
    pending: pendingOn(asOf),
    // Individually tracked trains only (the older fleet isn't split by line).
    lines: lineOrder
      .map((line) => {
        const trains = fleet.filter((t) => t.displayLine === line);
        return { line, inService: count(trains, 'service'), testing: count(trains, 'testing'), inTransit: count(trains, 'dispatch') };
      })
      .filter((l) => l.inService + l.testing + l.inTransit > 0),
    olderInService: untrackedFleet.trainsets
  });
}
