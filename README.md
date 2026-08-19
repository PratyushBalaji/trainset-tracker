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

where the trainset number is always zero-padded to three digits.

For example:

```text
bmrcl-4rs-dm-ts001
bmrcl-4rs-dm-ts017
bmrcl-4rs-dm-ts036
```

Each contract and trainset also has an immutable generated `uid`, independent of its human-readable ID.

## Contracts

A contract describes the procurement package itself. It stores the contract awardee and the rolling stock types sanctioned under that contract.

```jsonc
"bmrcl-4rs-dm": { // bmrcl yellow-line cbtc + green/purple-line dtg rolling stock contract
  "uid": "contract_...",
  "awardee": "CRRC Nanjing Puzhen",
  "rolling_stock": [
    "bmrcl-4rs-dm-cbtc",
    "bmrcl-4rs-dm-dtg"
  ]
}
```

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
"bmrcl-4rs-dm-dtg": { // separate 4rs-dm design for green/purple lines
  "signalling": "DTG",
  "cars_per_trainset": 6,
  "gauge_mm": 1435,
  "traction_power": "750 V DC third rail",
  "carbody": "stainless steel",
  "intended_lines": ["green", "purple"]
}
```

This keeps procurement identity separate from technical design. For example, older 2RS-DM DTG trains and newer 4RS-DM DTG trains should remain separate rolling stock types even if they share operational standards, because they are different train designs.

## Trainsets

A trainset is one physical train. It references its procurement contract and rolling stock type, and stores physical-train information such as its manufacturer and trainset number.

```jsonc
"bmrcl-4rs-dm-ts017": { // ts017 is a titagarh-built dtg train for the green/purple fleet
  "uid": "train_...",
  "contract": "bmrcl-4rs-dm",
  "rolling_stock": "bmrcl-4rs-dm-dtg",
  "trainset_number": "TS017",
  "manufacturer": "Titagarh Rail Systems",
  "milestones": {}
}
```

Most trainsets should not need overrides. If an individual train genuinely differs from its rolling stock specification, an optional `overrides` object may be added to that trainset. If no override exists, the field should simply be omitted rather than stored as an empty object.

## Milestones

Milestones represent dated events in an individual trainset's lifecycle. Version 1 milestone records contain a date, sources and optional comments.

```json
"depot_arrival": {
  "date": "YYYY-MM-DD",
  "sources": [
    "https://...",
    "https://...",
    "https://..."
  ],
  "comments": null
}
```

Every populated milestone must include at least three reputed citations. Citations are stored directly as raw source URLs or archived source URLs.

The milestone vocabulary will be kept consistent across trainsets so the data can be queried and compared programmatically.

## Planned tooling

The dataset will initially be maintained manually. Future tooling is expected to provide Python objects for contracts, rolling stock, trainsets and milestones, with import/export support for the canonical JSON file.

The Python layer will resolve each trainset's referenced rolling stock specification and any optional train-level overrides so consumers can work with complete train objects without needing to understand the storage hierarchy. It may also provide resolved JSON or tabular exports for analysis.

Automated or AI-assisted contributions will not edit the canonical JSON directly. Instead, agents will submit regulated structured inputs to trusted Python code, which will validate relationships and apply the requested changes. In particular, the updater will enforce that a trainset can only reference a rolling stock type sanctioned by its selected contract. This same interface may later be exposed through an MCP server.

The canonical JSON remains the source of truth.
