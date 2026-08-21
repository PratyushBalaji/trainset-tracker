# trainset-tracker

> **Scope:** Version 1 includes BMRCL rolling stock procured under 4RS-DM and later contracts; legacy 2RS-DM and 3RS-DM fleets are excluded because sufficiently granular trainset-level lifecycle dates are not consistently available.

A timeline from rolling stock procurement to induction.

## Data

The canonical dataset is stored in [`trainsets.json`](./trainsets.json). Version 1 keeps the data model deliberately small: contracts describe procurement packages, rolling stock entries describe materially distinct train designs/specifications, and trainsets represent the individual physical trains whose timelines are being tracked.

### Top-level structure

```json
{
  "schema_version": "1.1.0",
  "contracts": {},
  "rolling_stock": {},
  "trainsets": {}
}
```

## IDs

IDs are namespaced by metro operator so the dataset can later include other systems without collisions.

Contract IDs use:

```text
<operator>-<contract>
```

For example:

```text
bmrcl-4rs-dm
bmrcl-5rs-dm
```

Rolling stock IDs identify a materially distinct design/specification family. They may include a contract and a distinguishing suffix when one contract sanctions more than one type.

For example:

```text
bmrcl-4rs-dm-cbtc
bmrcl-4rs-dm-dtg
bmrcl-5rs-dm
```

Trainset IDs use:

```text
<operator>-<contract>-ts<NNN>
```

where the trainset number is always zero-padded to three digits. Trainset numbering is contract-scoped, so `bmrcl-4rs-dm-ts001` and `bmrcl-5rs-dm-ts001` are distinct trains.

For example:

```text
bmrcl-4rs-dm-ts001
bmrcl-4rs-dm-ts017
bmrcl-5rs-dm-ts001
```

Each contract and trainset also has an immutable generated `uid`, independent of its human-readable ID.

## Contracts

A contract describes the procurement package itself. It stores the awardee, known procurement dates, original contract scope/value, and the rolling stock types sanctioned under that contract.

```jsonc
"bmrcl-5rs-dm": {
  "uid": "contract_...",
  "awardee": "BEML",
  "tendered_on": "2022-09-19",
  "awarded_on": "2023-08-07",
  "signed_on": "2023-08-19",
  "base_cars": 318,
  "base_contract_value": {
    "amount": 3176.43,
    "currency": "INR",
    "unit": "crore"
  },
  "rolling_stock": ["bmrcl-5rs-dm"]
}
```

`tendered_on` is the date the tender/NIT was issued, `awarded_on` is the contract award or Letter of Acceptance date, and `signed_on` is the later formal agreement date where separately known. These fields are omitted when an exact date cannot be established rather than storing an approximate day.

`base_cars` and `base_contract_value` describe the original awarded procurement only. Later top-up orders or extensions are deliberately not folded into these values; they can be represented separately if contract-extension history is added to the schema.

A trainset's selected `rolling_stock` value must be one of the rolling stock IDs listed by its contract.

## Rolling stock

A rolling stock entry represents a materially distinct train design/specification family. Trains that happen to use the same signalling, gauge or intended lines are not automatically the same rolling stock type if the underlying design differs.

```jsonc
"bmrcl-4rs-dm-cbtc": { // yellow-line train design sanctioned under 4rs-dm
  "signalling": "CBTC",
  "cars_per_trainset": 6,
  "gauge_mm": 1435,
  "traction_power": "750 V DC third rail",
  "carbody": "stainless steel",
  "intended_lines": ["yellow"]
},
"bmrcl-4rs-dm-dtg": { // separate 4rs-dm design capable of green/purple assignment
  "signalling": "DTG",
  "cars_per_trainset": 6,
  "gauge_mm": 1435,
  "traction_power": "750 V DC third rail",
  "carbody": "stainless steel",
  "intended_lines": ["purple", "green"]
},
"bmrcl-5rs-dm": { // beml cbtc design used for pink and blue line trains
  "signalling": "CBTC",
  "cars_per_trainset": 6,
  "gauge_mm": 1435,
  "traction_power": "750 V DC third rail",
  "carbody": "stainless steel",
  "intended_lines": ["pink", "blue"]
}
```

This keeps procurement identity separate from technical design. For example, older 2RS-DM DTG trains and newer 4RS-DM DTG trains should remain separate rolling stock types even if they share operational standards, because they are different train designs.

## Trainsets

A trainset is one physical train. It references its procurement contract and rolling stock type, and stores physical-train information such as its manufacturer, trainset number and line identity.

```jsonc
"bmrcl-4rs-dm-ts016": {
  "uid": "train_...",
  "contract": "bmrcl-4rs-dm",
  "rolling_stock": "bmrcl-4rs-dm-dtg",
  "trainset_number": "TS016",
  "manufacturer": "CRRC Nanjing Puzhen",
  "intended_line": "purple",
  "operational_line": "green",
  "milestones": {}
}
```

`intended_line` identifies the line the individual train was built/liveried for. It is stored on every trainset even when its rolling stock has only one possible intended line, so each train remains self-describing.

`operational_line` identifies the line on which the train is actually assigned to operate. It is omitted when it is the same as `intended_line`. This distinction allows, for example, a Purple-liveried train later assigned to Green Line operation to retain both identities without changing its original intended line.

The manufacturer is also stored per trainset rather than assumed from the contract, because the same contract and rolling stock family may contain trains manufactured at different facilities or by different manufacturers.

Most trainsets should not need overrides. If an individual train genuinely differs from its rolling stock specification, an optional `overrides` object may be added to that trainset. If no override exists, the field should simply be omitted rather than stored as an empty object.

## Milestones

Milestones represent dated events in an individual trainset's lifecycle. Version 1 milestone records contain a date, a sources array and, when useful, a comment.

```json
"depot_arrival": {
  "date": "YYYY-MM-DD",
  "sources": [
    "https://...",
    "https://..."
  ]
}
```

`date` values use ISO `YYYY-MM-DD`. If an exact date cannot be established with sufficient confidence, the milestone should normally be omitted rather than stored with a null date.

Sources are stored directly as raw source URLs or archived source URLs. Multiple independent, reputable sources are preferred, but there is no fixed minimum citation count. A source should directly support the trainset and event being recorded; conflicting or weak sources should not be included merely to increase the source count.

In limited cases, a date may be reasonably inferred from surrounding evidence rather than directly reported. An inferred milestone must make that explicit with an empty or appropriately limited `sources` array and a `comments` field explaining the inference. For example:

```json
"depot_arrival": {
  "date": "2026-02-04",
  "sources": [],
  "comments": "No direct source found for complete-trainset arrival. Inferred from the remaining coaches being dispatched late the previous night and the factory's proximity to the depot."
}
```

Comments are intended for non-obvious circumstances such as split coach dispatches/arrivals, conflicting contemporary reporting or inferred dates. They should be omitted when the milestone is self-explanatory.

### Milestone vocabulary

The vocabulary is kept consistent across trainsets so lifecycle data can be queried and compared programmatically. Milestones currently used include:

- `factory_dispatch` — the first physical portion of the trainset leaves the manufacturer for delivery. A ceremonial rollout alone does not normally qualify. Where coaches move in separate batches, the first physical departure is recorded and later batches may be explained in `comments`.
- `depot_arrival` — the complete trainset has reached its destination depot. If coaches arrive in separate batches, the date on which the full trainset is present is used.
- `first_mainline_run` — the first confirmed movement of a prototype/trainset on mainline tracks. This is retained where the first run is a distinct, useful prototype milestone.
- `mainline_testing` — commencement of confirmed dynamic testing/trial runs on operational or mainline track. Static testing, depot-only testing and inspection-bay work do not qualify.
- `revenue_induction` — the trainset begins passenger/revenue service.

Not every trainset will have every milestone. In particular, `first_mainline_run` is generally useful for prototypes, while later trains may only receive `mainline_testing` when a defensible train-specific start date is available.

## Planned tooling

The dataset will initially be maintained manually. Future tooling is expected to provide Python objects for contracts, rolling stock, trainsets and milestones, with import/export support for the canonical JSON file.

The Python layer will resolve each trainset's referenced rolling stock specification and any optional train-level overrides so consumers can work with complete train objects without needing to understand the storage hierarchy. It may also provide resolved JSON or tabular exports for analysis.

Automated or AI-assisted contributions will not edit the canonical JSON directly. Instead, agents will submit regulated structured inputs to trusted Python code, which will validate relationships and apply the requested changes. In particular, the updater will enforce that a trainset can only reference a rolling stock type sanctioned by its selected contract. This same interface may later be exposed through an MCP server.

The canonical JSON remains the source of truth.
