// graphToOtm — extract an OTM document from the current state of a JointJS dia.Graph.
//
// Maps:
//   TrustZoneContainer → otm.trustZones[]  (with current position in representations[])
//   ProcessShape | DataStoreShape | ExternalEntityShape → otm.components[]
//   DataFlowLink → otm.dataflows[]
//
// When existingOtm is provided, structural fields (trustZones, components, dataflows)
// are replaced with graph-derived data; all other top-level fields (project, threats,
// mitigations, assets, …) and per-entity non-structural attributes are preserved verbatim.
// threats[] and mitigations[] are NEVER modified.

import { TrustZoneContainer } from '../shapes/TrustZoneContainer.mjs';
import { DataFlowLink } from '../shapes/DataFlowLink.mjs';

const DEFAULT_TRUST_RATING = 50;

// Derive an OTM component type when the cell has no stored otmComponentType.
// Uses the JointJS class name as a fallback to pick the most generic OTM type.
function otmTypeFromCell(cell) {
    const stored = cell.get('otmComponentType');
    if (stored) return stored;
    const jjType = String(cell.get('type') || '');
    if (jjType.includes('DataStore')) return 'database';
    if (jjType.includes('ExternalEntity')) return 'external-service';
    return 'function';
}

// Build a single-entry representations array from the cell's current geometry.
function representationOf(cell) {
    const { x, y } = cell.position();
    const { width, height } = cell.size();
    return [{ position: { x, y }, size: { width, height }}];
}

// Extract an OTM document from `graph`.
//
// graph       — populated dia.Graph with DFD shapes (may have been edited)
// existingOtm — original OTM document; non-structural fields are preserved verbatim
export function graphToOtm(graph, existingOtm) {
    if (!graph) throw new Error('graphToOtm: graph is required');

    const existing = existingOtm || null;

    // Index existing OTM entities for O(1) merge lookups.
    const existingZonesById = new Map((existing?.trustZones || []).map(z => [z.id, z]));
    const existingComponentsById = new Map((existing?.components || []).map(c => [c.id, c]));
    const existingDataflowsById = new Map((existing?.dataflows || []).map(f => [f.id, f]));

    // Maps JointJS cell ID → OTM zone ID — needed to derive component.parent.trustZone.
    const cellIdToZoneId = new Map();

    // 1. Trust zones — TrustZoneContainer cells.
    const trustZones = [];
    for (const cell of graph.getElements()) {
        if (!(cell instanceof TrustZoneContainer)) continue;
        const zoneId = cell.get('otmTrustZoneId') || cell.id;
        const existingZone = existingZonesById.get(zoneId);
        const zone = {
            ...(existingZone || {}),
            id: zoneId,
            name: cell.attr('label/text') || zoneId,
            risk: {
                ...((existingZone && existingZone.risk) || {}),
                trustRating: cell.get('trustRating') ?? DEFAULT_TRUST_RATING
            },
            representations: representationOf(cell)
        };
        trustZones.push(zone);
        cellIdToZoneId.set(cell.id, zoneId);
    }

    // 2. Components — all non-TrustZoneContainer elements.
    const components = [];
    for (const cell of graph.getElements()) {
        if (cell instanceof TrustZoneContainer) continue;
        const componentId = cell.get('otmComponentId') || cell.id;
        const existingComponent = existingComponentsById.get(componentId);

        // Parent trust zone comes from JointJS embedding (cell.parent → zone cell → zone id).
        const parentCellId = cell.get('parent');
        const parentZoneId = parentCellId ? cellIdToZoneId.get(parentCellId) : undefined;

        const component = {
            ...(existingComponent || {}),
            id: componentId,
            name: cell.attr('label/text') || componentId,
            type: otmTypeFromCell(cell),
            representations: representationOf(cell)
        };

        if (parentZoneId) {
            component.parent = { ...(existingComponent?.parent || {}), trustZone: parentZoneId };
        } else {
            delete component.parent;
        }

        components.push(component);
    }

    // 3. Data flows — DataFlowLink cells.
    const dataflows = [];
    for (const link of graph.getLinks()) {
        if (!(link instanceof DataFlowLink)) continue;
        const sourceEndpoint = link.get('source') || {};
        const targetEndpoint = link.get('target') || {};
        if (!sourceEndpoint.id || !targetEndpoint.id) continue;

        const flowId = link.get('otmDataflowId') || link.id;
        const sourceCell = graph.getCell(sourceEndpoint.id);
        const targetCell = graph.getCell(targetEndpoint.id);
        const sourceId = sourceCell
            ? (sourceCell.get('otmComponentId') || sourceCell.id)
            : sourceEndpoint.id;
        const destId = targetCell
            ? (targetCell.get('otmComponentId') || targetCell.id)
            : targetEndpoint.id;

        // Assets are stored as comma-separated label text; split back into an array.
        const labelText = link.prop('labels/0/attrs/text/text') || '';
        const assets = labelText
            ? labelText.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        const existingFlow = existingDataflowsById.get(flowId);
        const flow = {
            ...(existingFlow || {}),
            id: flowId,
            source: sourceId,
            destination: destId,
            assets
        };

        // Name: prefer the value stored on the cell by otmToGraph; fall back to existingFlow.
        const storedName = link.get('otmDataflowName');
        if (storedName) flow.name = storedName;

        // bidirectional: only write true; remove false to stay consistent with OTM convention.
        if (link.get('bidirectional')) {
            flow.bidirectional = true;
        } else {
            delete flow.bidirectional;
        }

        dataflows.push(flow);
    }

    // 4. Assemble the output OTM document.
    //    Shallow-clone existingOtm so all unknown top-level fields (project, threats,
    //    mitigations, assets, otmVersion, …) are preserved unchanged.
    //    Then override the three structural arrays with graph-derived data.
    const result = existing ? { ...existing } : { otmVersion: '0.2.0' };
    result.trustZones = trustZones;
    result.components = components;
    result.dataflows = dataflows;

    return result;
}
