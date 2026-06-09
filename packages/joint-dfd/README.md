# @joint/dfd

Data Flow Diagram (DFD) shapes and OTM (Open Threat Model) adapter for JointJS.

## Status

Shapes shipped (DFD-02). OTM adapter (inc-2) and ELK layout (inc-3) land in follow-up tickets.

## Package Structure

```
src/
├── shapes/       — DFD shape definitions (ProcessShape, DataStoreShape, …) — DFD-02
├── otm-adapter/  — OTM ↔ JointJS graph conversion — inc-2
├── layout/       — ELK.js hierarchical auto-layout — inc-3
└── index.mjs     — Public API re-exports
```

## Usage

```javascript
import * as joint from '@joint/core';
import {
    ProcessShape,
    DataStoreShape,
    ExternalEntityShape,
    TrustZoneContainer,
    DataFlowLink,
    ThreatBadge,
    TYPE_TO_SHAPE,
    shapeForType,
    registerShapes,
} from '@joint/dfd';

registerShapes(joint); // installs shapes under joint.shapes.dfd

const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
const paper = new joint.dia.Paper({
    el: document.getElementById('paper'),
    model: graph,
    cellViewNamespace: joint.shapes,
    embeddingMode: true,
});

const zone = new TrustZoneContainer({ trustRating: 70 });
zone.setZoneName('Application VPC');
zone.addTo(graph);

const api = new ProcessShape({ position: { x: 80, y: 80 } });
api.setName('API Gateway');
api.addTo(graph);
zone.embed(api);

ThreatBadge.attach(api.findView(paper), { count: 3, state: 'identified' });

paper.on('badge:pointerclick', (hostId) => {
    console.log('badge clicked on', hostId);
});
```

### Available exports

| Export | Kind | Purpose |
|---|---|---|
| `ProcessShape` | element | Rounded rectangle, in/out ports |
| `DataStoreShape` | element | Two parallel lines, in/out ports |
| `ExternalEntityShape` | element | Sharp-cornered rectangle (`setDashed(true)` for external-service) |
| `TrustZoneContainer` | element | Dashed container, tinted background by `trustRating` (0..100) |
| `DataFlowLink` | link | Directed arrow with asset label; `setBidirectional(true)` for both ends |
| `ThreatBadge` | highlighter | Small overlay badge on element or link; emits `badge:pointerclick` |
| `TYPE_TO_SHAPE` | map | OTM component sub-type → shape class |
| `shapeForType(type)` | function | Resolve a type to its shape class (falls back to `ProcessShape`) |
| `registerShapes(joint)` | function | Install the shapes onto `joint.shapes.dfd` |

A visual smoke-test fixture rendering all six shapes on a single Paper lives at
[`test/fixtures/visual-demo.html`](./test/fixtures/visual-demo.html).

## License

MPL-2.0 — inherited from JointJS.
