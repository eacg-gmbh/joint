// Public API for @joint/dfd.
// Shapes land in DFD-02; OTM adapter (otmToGraph) in DFD-03; ELK layout in DFD-05.

export const version = '0.1.0';

import { ProcessShape } from './shapes/ProcessShape.mjs';
import { DataStoreShape } from './shapes/DataStoreShape.mjs';
import { ExternalEntityShape } from './shapes/ExternalEntityShape.mjs';
import { TrustZoneContainer, trustRatingToFill } from './shapes/TrustZoneContainer.mjs';
import { DataFlowLink } from './shapes/DataFlowLink.mjs';
import { ThreatBadge, badgeColourForState } from './shapes/ThreatBadge.mjs';
import { elkLayout } from './layout/elkLayout.mjs';

export {
    ProcessShape,
    DataStoreShape,
    ExternalEntityShape,
    TrustZoneContainer,
    DataFlowLink,
    ThreatBadge,
    trustRatingToFill,
    badgeColourForState,
    elkLayout
};

export { otmToGraph } from './otm-adapter/otmToGraph.mjs';
export { graphToOtm } from './otm-adapter/graphToOtm.mjs';
export { applyThreatOverlay, clearThreatOverlay } from './otm-adapter/threatOverlay.mjs';

// Namespace object suitable for use as JointJS `cellNamespace.dfd`.
// The keys must match the second segment of the cell type (e.g. "dfd.ProcessShape").
export const shapes = {
    ProcessShape,
    DataStoreShape,
    ExternalEntityShape,
    TrustZoneContainer,
    DataFlowLink,
    ThreatBadge
};

// OTM component sub-type → shape class. Unknown types fall back to ProcessShape.
// Lives in otm-adapter/typeMap.mjs to keep the OTM adapter free of cycles with
// this index module; re-exported here as part of the public API.
export { TYPE_TO_SHAPE, shapeForType } from './otm-adapter/typeMap.mjs';

// Attach the dfd shapes onto a joint module's `shapes` namespace so the graph
// can deserialize cells by their `type` field.
//
//   import * as joint from '@joint/core';
//   import { registerShapes } from '@joint/dfd';
//   registerShapes(joint);
//
export function registerShapes(joint) {
    if (!joint) throw new Error('registerShapes: joint module is required');
    if (!joint.shapes) joint.shapes = {};
    joint.shapes.dfd = { ...(joint.shapes.dfd || {}), ...shapes };
    return joint.shapes.dfd;
}
