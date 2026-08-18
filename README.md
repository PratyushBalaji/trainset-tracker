# trainset-tracker

A timeline from rolling stock procurement to induction.

## Data

The canonical dataset is stored in [`trainsets.json`](./trainsets.json). Version 1 keeps the data model deliberately small: contracts provide shared train specifications, while individual trainsets contain their own lifecycle milestones and any specification overrides.

### Top-level structure

```json
{
  "schema_version": "1.0.0",
  "contracts": {},
  "trainsets": {}
}
```

### IDs

IDs are namespaced by metro operator so the dataset can later include other systems without collisions.

Contract IDs use:

```text
<operator>-<contract>
```

For example:

```text
bmrcl-4rs-dm
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

Each contract and trainset will also have an immutable generated `uid`, independent of its human-readable ID.

## Contracts and inheritance

A contract contains shared/default specifications for trainsets supplied under it. These may include fields such as manufacturer, signalling technology, number of cars, gauge and intended line(s).

```json
"bmrcl-4rs-dm": { // bmrcl cbtc yellow line and dtg green/purple line rolling stock contract
  "uid": "contract_...",
  "defaults": {
    "manufacturer": "CRRC/Titagarh",
    "signalling": "CBTC", // set default as cbtc
    "cars_per_trainset": 6,
    "gauge_mm": 1435,
    "intended_lines": ["yellow"] // set default as yellow line
  }
}
```

Trainsets inherit only fields explicitly defined as inheritable by the program. A trainset may override an inherited value when its specification differs from the contract default.

```json
"bmrcl-4rs-dm-ts017": { // ts17 in the 4rs contract was a green line train
  "uid": "train_...",
  "contract": "bmrcl-4rs-dm",
  "trainset_number": "TS017",
  "overrides": { // this particular trainset differs from the default we set earlier
    "signalling": "DTG",
    "intended_lines": ["green", "purple"]
  },
  "milestones": {}
}
```

If an inheritable field is absent from `overrides`, its value is taken from the contract defaults. Overrides replace the contract value rather than modifying it.

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

The dataset will initially be maintained manually. Future tooling is expected to provide Python objects for contracts, trainsets and milestones, with import/export support for the canonical JSON file.

The Python layer will resolve contract inheritance so consumers can work with complete train objects without needing to understand the storage hierarchy. It may also provide resolved JSON or tabular exports for analysis.

Automated or AI-assisted contributions will not edit the canonical JSON directly. Instead, agents will submit regulated structured inputs to trusted Python code, which will validate and apply the requested changes. This same interface may later be exposed through an MCP server.

The canonical JSON remains the source of truth.
