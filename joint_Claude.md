# joint_Claude.md — DFD Extension for TrustSource

## Context

This is a fork of JointJS (MPL 2.0) maintained by EACG/TrustSource. We extend it with DFD (Data Flow Diagram) shapes, an OTM (Open Threat Model) adapter, and threat-overlay visualisation. The original CLAUDE.md describes the JointJS monorepo structure — read it first.

## Licence

**MPL 2.0** — inherited from JointJS. All new files are also MPL 2.0. Do not add proprietary code to this repository.

## What We're Adding

A new package in the monorepo workspace: `@joint/dfd` — containing DFD shapes, OTM adapter, threat overlay, and auto-layout. This follows JointJS's existing pattern (see `@joint/shapes-general` as a reference).

### Package Structure

```
packages/
├── joint-core/          # existing — DO NOT MODIFY source files
├── joint-react/         # existing — not used by us
├── joint-dfd/           # NEW — our DFD extension package
│   ├── package.json     # @joint/dfd, depends on @joint/core
│   ├── src/
│   │   ├── shapes/
│   │   │   ├── ProcessShape.mjs       # Rounded rectangle (DFD Process)
│   │   │   ├── DataStoreShape.mjs     # Parallel lines (DFD Data Store)
│   │   │   ├── ExternalEntityShape.mjs# Sharp-cornered rectangle
│   │   │   ├── TrustZoneContainer.mjs # Dashed container with tinted bg
│   │   │   ├── DataFlowLink.mjs       # Arrow with asset label
│   │   │   └── ThreatBadge.mjs        # Overlay badge (count + colour)
│   │   ├── otm-adapter/
│   │   │   ├── otmToGraph.mjs         # OTM Document → JointJS Graph
│   │   │   ├── graphToOtm.mjs         # JointJS Graph → OTM Document
│   │   │   └── threatOverlay.mjs      # Apply threat badges to graph
│   │   ├── layout/
│   │   │   └── elkLayout.mjs          # ELK.js hierarchical auto-layout
│   │   └── index.mjs                  # Public API
│   └── test/
│       ├── shapes.test.mjs
│       ├── otmToGraph.test.mjs
│       ├── graphToOtm.test.mjs
│       ├── threatOverlay.test.mjs
│       └── fixtures/
│           └── sample-otm.yaml        # Test OTM document
```

### Important: Follow monorepo conventions

- Use `.mjs` file extension (JointJS convention)
- Register the new package in the root `package.json` workspaces
- Depend on `@joint/core` as a workspace dependency
- Follow the ESLint config from `@joint/eslint-config`
- Use the same build tooling (Grunt or Vite, check what `@joint/shapes-general` uses)

## DFD Shapes — Specification

Per Shostack / STRIDE policy:

| Shape | DFD Element | Visual | Ports |
|---|---|---|---|
| ProcessShape | Process | Rounded rectangle, solid border, icon slot | In + Out |
| DataStoreShape | Data Store | Two parallel horizontal lines, label between | In + Out |
| ExternalEntityShape | External Entity | Sharp-cornered rectangle, solid or dashed border | In + Out |
| TrustZoneContainer | Trust Boundary | Dashed border, tinted background by trustRating | Embedding only |
| DataFlowLink | Data Flow | Directed arrow, label = asset names | N/A (link) |
| ThreatBadge | Overlay | Small circle on node/link, colour by threat state | N/A (decorator) |

### Shape Details

**ProcessShape:**
- SVG: `<rect>` with `rx/ry` for rounded corners
- Default size: 120×60
- Label: component name (centered)
- Ports: left (in), right (out) — for DataFlowLink connections
- Optional icon top-left based on sub-type (web-service, api-gateway, etc.)

**DataStoreShape:**
- SVG: two horizontal `<line>` elements with label between
- Default size: 140×50
- Classic DFD notation

**ExternalEntityShape:**
- SVG: `<rect>` with sharp corners
- Variant: dashed border for `external-service`
- Default size: 120×60

**TrustZoneContainer:**
- SVG: `<rect>` with `stroke-dasharray` (dashed border)
- Background colour: gradient from green (trustRating=100) to red (trustRating=0)
- Label: zone name (top-left)
- Resizable, components embedded inside (JointJS parent-child embedding)
- Components dragged in/out automatically update their trust zone assignment

**DataFlowLink:**
- Extends `dia.Link`
- Arrow marker at target end
- Label: comma-separated asset names
- Bidirectional variant: arrows on both ends
- Colour: default grey, red when carrying unmitigated threats

**ThreatBadge:**
- Small circle (r=12) positioned top-right of a shape or midpoint of a link
- Number inside = threat count
- Colour per state mapping (see below)
- Click handler emits `badge:pointerclick` event with component/flow ID

### Threat Badge Colours

```javascript
const BADGE_COLOURS = {
  red:    ['exposed', 'identified'],
  yellow: ['assessed', 'planned', 'implementing'],
  green:  ['closed', 'eliminated'],
  grey:   ['accepted', 'monitored', 'deferred', 'out-of-scope',
           'transferred', 'escalated', 'expired']
};
```

## OTM ↔ JointJS Adapter

### otmToGraph(otm, graph, options?)

Populates a JointJS `dia.Graph` from an OTM document.

| OTM element | JointJS element |
|---|---|
| `trustZones[]` | TrustZoneContainer (bg colour from trustRating) |
| `components[]` | ProcessShape / DataStoreShape / ExternalEntityShape (by type) |
| `components[].parent.trustZone` | Embedded in matching TrustZoneContainer |
| `dataflows[]` | DataFlowLink (source → destination, label = asset names) |
| `threats[]` on component/flow | ThreatBadge overlay |
| `representations[].position` | Element position (if present) |

When no position data exists → run auto-layout (ELK.js).

### graphToOtm(graph, existingOtm?)

Extracts structural changes from the graph back to OTM format.

**Rules:**
1. Preserve ALL fields from `existingOtm` that the diagram doesn't represent (threats, mitigations, risk scores, attributes, etc.)
2. Update `components[].parent.trustZone` from embedding relationships
3. Update/add/remove `dataflows[]` from links
4. Update/add/remove `components[]` from elements
5. Store positions in `components[].representations[]`
6. **NEVER** modify `threats[]` or `mitigations[]` — they are read-only

### Component Type → Shape Mapping

```javascript
const TYPE_TO_SHAPE = {
  'web-client':       'ExternalEntityShape',
  'human-actor':      'ExternalEntityShape',
  'external-service': 'ExternalEntityShape',
  'web-service':      'ProcessShape',
  'api-gateway':      'ProcessShape',
  'function':         'ProcessShape',
  'iam-service':      'ProcessShape',
  'message-broker':   'ProcessShape',
  'database':         'DataStoreShape',
  'object-store':     'DataStoreShape',
};
// Default for unknown types: ProcessShape
```

## Auto-Layout (ELK.js)

- Use `elkjs` npm package (Eclipse Layout Kernel compiled to JS)
- Algorithm: `layered` (hierarchical) — respects parent-child containment
- Trust zones = ELK compound nodes, components = child nodes
- Data flows = edges
- Direction: left-to-right (`elk.direction: RIGHT`)
- Run only when no position data exists in OTM, or when user clicks "Auto Layout" button

## Integration Notes

The consuming application (ts-app) uses this package as:

```javascript
import {
  otmToGraph,
  graphToOtm,
  applyThreatOverlay,
  autoLayout,
  ProcessShape,
  DataStoreShape,
  ExternalEntityShape,
  TrustZoneContainer,
  DataFlowLink,
} from '@joint/dfd';
```

The shapes must be registered with JointJS's shape namespace so the graph can serialise/deserialise them:

```javascript
import * as joint from '@joint/core';
joint.shapes.dfd = { ProcessShape, DataStoreShape, ... };
```

## Constraints

- DO NOT modify existing JointJS source files in `packages/joint-core/` — only add new files in `packages/joint-dfd/`
- All new code is MPL 2.0
- No React/Vue/Angular dependencies — vanilla JS + JointJS APIs only
- Must export as both ESM and UMD for compatibility
- Test with the OTM example from `ts-tm-agent/background/otm/EXAMPLE.yaml`
