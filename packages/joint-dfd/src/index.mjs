// Public API for @joint/dfd.
// Shapes land in DFD-02 (this increment); OTM adapter in inc-2; ELK layout in inc-3.

export const version = '0.1.0';

import { ProcessShape } from './shapes/ProcessShape.mjs';
import { DataStoreShape } from './shapes/DataStoreShape.mjs';
import { ExternalEntityShape } from './shapes/ExternalEntityShape.mjs';
import { TrustZoneContainer, trustRatingToFill } from './shapes/TrustZoneContainer.mjs';
import { DataFlowLink } from './shapes/DataFlowLink.mjs';
import { ThreatBadge, badgeColourForState } from './shapes/ThreatBadge.mjs';

export {
    ProcessShape,
    DataStoreShape,
    ExternalEntityShape,
    TrustZoneContainer,
    DataFlowLink,
    ThreatBadge,
    trustRatingToFill,
    badgeColourForState
};

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
export const TYPE_TO_SHAPE = {
    'web-client':       ExternalEntityShape,
    'human-actor':      ExternalEntityShape,
    'external-service': ExternalEntityShape,
    'web-service':      ProcessShape,
    'api-gateway':      ProcessShape,
    'function':         ProcessShape,
    'iam-service':      ProcessShape,
    'message-broker':   ProcessShape,
    'database':         DataStoreShape,
    'object-store':     DataStoreShape
};

// Resolve a component type to a shape class, falling back to ProcessShape.
export function shapeForType(type) {
    return TYPE_TO_SHAPE[type] || ProcessShape;
}

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
