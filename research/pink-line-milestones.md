# Pink Line milestone import

Imported from the owner's supplied revised research on 22 November 2026.
The attached research was used as supplied; this import is not a fresh audit of
every linked article or original document. Article-access limitations and
uncertainties from that research remain in the records.

## Coverage and compatibility

`lines.json` uses the same milestone structure as Yellow: exact event dates,
reporting dates/bounds, month-only periods, inspection intervals, scope,
description, sources, comments and previous/revised target text.
The existing chronological feed consumes these records without UI changes.
Individual deliveries and inductions still come from `trainsets.json`, which
this import does not change or duplicate.

The full Kalena Agrahara - Nagawara corridor is approximately 21.25 km. The
approximately 7.5-km elevated section opened ceremonially on 13 November 2026;
passenger service started on 14 November. The approximately 13.76-km underground
section remained separate, with a May 2027 target reaffirmed on 20 November.
Tavarekere / SG Palya names are retained as supplied.

## Claims without a plottable date

These are retained here instead of receiving a guessed date or being forced into
the timeline's month-based format:

- DPR submission/acceptance: exact dates not established. Early IIMB / Gottigere
  alignment descriptions must not be equated automatically with the final line.
- Simplex elevated award: 2017 is supplied, but the award month conflicts between
  June in retrospective BMRCL reporting and September in later contemporary
  reporting. No direct award source URL is attached to that row in the supplied
  research. Neither 8 September nor a guessed first-of-month date is imported.
  The separately supported 26 October 2017 agreement is in `lines.json`.
- First physical elevated construction: exact commencement not verified from an
  original contemporary source. February 2018 in secondary summaries is not
  imported as an established event date.
- Formal whole-line civil completion: no verified certificate or single date.
  Final elevated segment launching and completed tunnelling remain distinct.
- Competing early phased forecast: September 2025 elevated / June 2026
  underground. Original announcement and the evidence publication date were not
  established in the supplied timeline. Preserve this sourced claim separately:
  [Moneycontrol report](https://www.moneycontrol.com/news/india/indias-most-congested-city-bengaluru-faces-train-set-supply-crisis-12820475.html).
  Both targets were later superseded and missed. The distinct December-based
  forecast has its own 30 October 2024 reporting-date record in `lines.json`.

## Date and deadline discipline

- GR agreement: August 2021 only. Its 21-month duration starts at agreement
  signing, not the 3 August LOA. Do not invent an exact contractual end day.
- RDSO programme: 28 April to 9 May 2026; the earlier scheduled 12 May finish is
  not the actual finish. The 4 June oscillation report and early-August Interim
  Speed Certificate are separate records.
- Early August certificate: stored as August 2026 with early-month precision
  preserved in title/comments, not an invented issue/receipt day.
- Underground track, ISA receipt and safety observations preserve evidence
  bounds. Near-complete electrification does not become completed work.
- Termination: preferred contemporary 29 January 2021 date, with the conflicting
  retrospective 29 June claim explicitly retained.
- Railway Board rolling-stock conditions are not assigned to the CMRS order.
- September's conflicting forecast precision is retained, not silently converted
  into a confirmed reversal or a precise day.
- The after-15-October statement is an earliest window, not a missed deadline.
- Tentative 15 November inauguration was a proposed ceremony appointment,
  superseded by 13 November; it is not a missed passenger-service deadline.
- May 2027 remains target text attached to October/November 2026 evidence dates,
  not an actual future opening event or an already missed deadline.
- Month-only records use the existing month-granularity sorting convention.
  Their chart placement does not establish an exact first-day event date.

## Phase-aware delay scorecard

Pink's reviewed targets are grouped into elevated and underground sections in
`reviewedLineStories`. Elevated opening is measured against passenger service on
14 November 2026; underground opening remains unrecorded. Replaced future targets
are distinguished from missed dates and the current target. Ceremony targets use
their own inauguration milestone, and reaffirmations are not counted again.

Whole-line forecasts and construction deadlines are not scored against elevated
passenger opening. Early overlapping forecasts remain independent sourced claims,
not a fabricated continuous revision chain. Undated reports retained above do not
gain an invented announcement date through scorecard presentation.

## Still unresolved

- Original DPR submission/acceptance and alignment revisions.
- Original Simplex award and retrospective termination discrepancy.
- Physical construction commencement, formal civil completion and exact GR
  agreement day.
- Exact elevated track/electrification completion, actual underground
  electrification completion and a distinct integrated-signalling-test programme.
- Original ISA certificate, Interim Speed Certificate, signed Railway Board
  sanction and complete CMRS authorisation conditions.
- Original announcements for the early competing schedules.
- Actual first underground mainline trial movement: the 20 November report
  establishes a permission request, not commenced trial runs.
