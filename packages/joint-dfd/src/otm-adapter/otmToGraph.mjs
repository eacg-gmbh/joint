// otmToGraph — populate a JointJS dia.Graph from an OTM document.
//
// Maps:
//   otm.trustZones[]  → TrustZoneContainer
//   otm.components[]  → ProcessShape | DataStoreShape | ExternalEntityShape (by type)
//   otm.dataflows[]   → DataFlowLink (label = asset names)
//
// OTM IDs are stored on each cell (otmTrustZoneId / otmComponentId / otmDataflowId)
// and reused as JointJS cell IDs so callers can look up cells by OTM id.

import { TrustZoneContainer } from '../shapes/TrustZoneContainer.mjs';
import { DataFlowLink } from '../shapes/DataFlowLink.mjs';
import { shapeForType } from './typeMap.mjs';
import { elkLayout } from '../layout/elkLayout.mjs';

const DEFAULT_TRUST_RATING = 50;

// Pick the first usable position from an OTM element's representations[] array.
// Returns null if no representation carries an { x, y } position.
function pickPosition(representations) {
    if (!Array.isArray(representations)) return null;
    for (const rep of representations) {
        if (rep && rep.position && Number.isFinite(rep.position.x) && Number.isFinite(rep.position.y)) {
            return { x: rep.position.x, y: rep.position.y };
        }
    }
    return null;
}

// Same for size, returns null if absent or non-finite.
function pickSize(representations) {
    if (!Array.isArray(representations)) return null;
    for (const rep of representations) {
        if (rep && rep.size && Number.isFinite(rep.size.width) && Number.isFinite(rep.size.height)) {
            return { width: rep.size.width, height: rep.size.height };
        }
    }
    return null;
}

// Extract a trustRating from an OTM trust zone. The OTM example places it under
// `risk.trustRating`; older drafts use a top-level field — accept either.
function trustRatingOf(zone) {
    if (zone && zone.risk && Number.isFinite(zone.risk.trustRating)) return zone.risk.trustRating;
    if (zone && Number.isFinite(zone.trustRating)) return zone.trustRating;
    return DEFAULT_TRUST_RATING;
}

// Populate `graph` from the parsed OTM document `otm`.
// options.autoLayout — when truthy and no positions exist, calls elkLayout(graph).
//                      Defaults to true when no component carries position data.
// Returns { trustZones, components, dataflows } — maps of OTM id → JointJS cell.
export function otmToGraph(otm, graph, options = {}) {
    if (!graph) throw new Error('otmToGraph: graph is required');
    const doc = otm || {};

    const trustZoneCells = new Map();
    const componentCells = new Map();
    const dataflowCells = new Map();
    let anyPosition = false;

    // 1. Trust zones first so components can embed into them.
    for (const zone of doc.trustZones || []) {
        if (!zone || !zone.id) continue;
        const container = new TrustZoneContainer({
            id: zone.id,
            trustRating: trustRatingOf(zone)
        });
        container.setZoneName(zone.name || zone.id);
        container.set('otmTrustZoneId', zone.id);
        const pos = pickPosition(zone.representations);
        if (pos) {
            container.position(pos.x, pos.y);
            anyPosition = true;
        }
        const size = pickSize(zone.representations);
        if (size) container.resize(size.width, size.height);
        graph.addCell(container);
        trustZoneCells.set(zone.id, container);
    }

    // 2. Components — map by type, embed into parent zone, store OTM id.
    for (const component of doc.components || []) {
        if (!component || !component.id) continue;
        const ShapeClass = shapeForType(component.type);
        const element = new ShapeClass({ id: component.id });
        if (typeof element.setName === 'function') {
            element.setName(component.name || component.id);
        } else {
            element.attr('label/text', component.name || component.id);
        }
        element.set('otmComponentId', component.id);
        if (component.type) element.set('otmComponentType', component.type);

        const pos = pickPosition(component.representations);
        if (pos) {
            element.position(pos.x, pos.y);
            anyPosition = true;
        }
        const size = pickSize(component.representations);
        if (size) element.resize(size.width, size.height);

        graph.addCell(element);

        const parentZoneId = component.parent && component.parent.trustZone;
        if (parentZoneId && trustZoneCells.has(parentZoneId)) {
            trustZoneCells.get(parentZoneId).embed(element);
        }
        componentCells.set(component.id, element);
    }

    // 3. Data flows — link source → destination, label = asset names.
    for (const flow of doc.dataflows || []) {
        if (!flow || !flow.id || !flow.source || !flow.destination) continue;
        const link = new DataFlowLink({
            id: flow.id,
            source: { id: flow.source },
            target: { id: flow.destination }
        });
        link.setAssetNames(flow.assets || []);
        if (flow.bidirectional === true) link.setBidirectional(true);
        link.set('otmDataflowId', flow.id);
        if (flow.name) link.set('otmDataflowName', flow.name);
        graph.addCell(link);
        dataflowCells.set(flow.id, link);
    }

    // 4. Run auto-layout when no positions were supplied (default), or when
    //    the caller explicitly asked for it.
    // elkLayout is async; we fire-and-forget here so otmToGraph stays synchronous.
    // Callers that need guaranteed positions should await elkLayout(graph) directly.
    const shouldAutoLayout = options.autoLayout !== undefined
        ? !!options.autoLayout
        : !anyPosition;
    if (shouldAutoLayout) {
        const p = elkLayout(graph, options);
        if (p && typeof p.then === 'function') p.catch(() => {});
    }

    return { trustZones: trustZoneCells, components: componentCells, dataflows: dataflowCells };
}
