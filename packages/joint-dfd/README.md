# @joint/dfd

Data Flow Diagram (DFD) shapes and OTM (Open Threat Model) adapter for JointJS.

## Status

Scaffold — shapes, OTM adapter, and ELK layout are delivered in subsequent increments.

## Package Structure

```
src/
├── shapes/       — DFD shape definitions (ProcessShape, DataStoreShape, …) — DFD-02
├── otm-adapter/  — OTM ↔ JointJS graph conversion — inc-2
├── layout/       — ELK.js hierarchical auto-layout — inc-3
└── index.mjs     — Public API re-exports
```

## Usage (future)

```javascript
import {
  otmToGraph, graphToOtm, applyThreatOverlay, autoLayout,
  ProcessShape, DataStoreShape, ExternalEntityShape,
  TrustZoneContainer, DataFlowLink,
} from '@joint/dfd';
```

## License

MPL-2.0 — inherited from JointJS.
