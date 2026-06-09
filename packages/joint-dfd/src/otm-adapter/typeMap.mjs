// OTM component sub-type → DFD shape class.
// Unknown types fall back to ProcessShape.

import { ProcessShape } from '../shapes/ProcessShape.mjs';
import { DataStoreShape } from '../shapes/DataStoreShape.mjs';
import { ExternalEntityShape } from '../shapes/ExternalEntityShape.mjs';

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

export function shapeForType(type) {
    return TYPE_TO_SHAPE[type] || ProcessShape;
}
