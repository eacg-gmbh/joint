// threatOverlay — apply and clear threat-state decorations on a JointJS graph.
//
// applyThreatOverlay(graph, otm, risks?)
//   Reads threats from otm.components[].threats[] and otm.dataflows[].threats[].
//   The optional risks[] array supplements threats using moduleId matching.
//   For each cell the worst threat state drives badge colour; exposed/identified
//   threats turn data-flow links red and trust-zone borders red.
//
// clearThreatOverlay(graph)
//   Removes all overlay state and resets link/border colours to defaults.

const CONTAINER_TYPE = 'dfd.TrustZoneContainer';

const DEFAULT_LINK_COLOUR = '#616161';
const EXPOSED_LINK_COLOUR = '#D32F2F';
const DEFAULT_ZONE_STROKE = '#616161';
const EXPOSED_ZONE_STROKE = '#D32F2F';

// Threat states ordered worst → best (lower index = higher priority to show).
const STATE_PRIORITY = {
    exposed:        0,
    identified:     0,
    assessed:       1,
    planned:        1,
    implementing:   1,
    accepted:       2,
    monitored:      2,
    deferred:       2,
    'out-of-scope': 2,
    transferred:    2,
    escalated:      2,
    expired:        2,
    closed:         3,
    eliminated:     3,
};

function threatState(threat) {
    return String(threat.status || threat.state || '').toLowerCase();
}

function isExposed(state) {
    return state === 'exposed' || state === 'identified';
}

// Return the worst (highest-priority / most-visible) state from a threat array.
function worstState(threats) {
    let best = Infinity;
    let result = 'identified';
    for (const t of threats) {
        const s = threatState(t);
        const p = STATE_PRIORITY[s] ?? 2;
        if (p < best) {
            best = p;
            result = s || 'identified';
        }
    }
    return result;
}

// Build per-component and per-dataflow threat arrays from the OTM document.
function buildLookups(otm) {
    const componentThreats = new Map();
    for (const comp of otm.components || []) {
        if (comp && comp.id) {
            componentThreats.set(comp.id, Array.isArray(comp.threats) ? [...comp.threats] : []);
        }
    }
    const dataflowThreats = new Map();
    for (const flow of otm.dataflows || []) {
        if (flow && flow.id) {
            dataflowThreats.set(flow.id, Array.isArray(flow.threats) ? [...flow.threats] : []);
        }
    }
    return { componentThreats, dataflowThreats };
}

// Merge optional risks[] (top-level, matched by moduleId) into the lookup maps.
function mergeRisks(risks, componentThreats, dataflowThreats) {
    if (!Array.isArray(risks)) return;
    for (const risk of risks) {
        if (!risk) continue;
        const moduleId = risk.moduleId;
        if (!moduleId) continue;
        const entry = { status: risk.status || risk.state || 'identified' };
        if (componentThreats.has(moduleId)) {
            componentThreats.get(moduleId).push(entry);
        }
        if (dataflowThreats.has(moduleId)) {
            dataflowThreats.get(moduleId).push(entry);
        }
    }
}

// Apply threat overlay state to a JointJS graph.
// Stores { count, state } in the `overlayThreats` model attribute on each cell.
// Also sets DataFlowLink stroke colour and TrustZoneContainer border colour.
export function applyThreatOverlay(graph, otm, risks) {
    if (!graph) throw new Error('applyThreatOverlay: graph is required');

    const doc = otm || {};
    const { componentThreats, dataflowThreats } = buildLookups(doc);
    mergeRisks(risks, componentThreats, dataflowThreats);

    // Components — set overlayThreats attribute.
    for (const element of graph.getElements()) {
        if (element.get('type') === CONTAINER_TYPE) continue;

        const compId = element.get('otmComponentId');
        const threats = compId ? (componentThreats.get(compId) || []) : [];

        if (threats.length === 0) {
            element.set('overlayThreats', null);
        } else {
            element.set('overlayThreats', { count: threats.length, state: worstState(threats) });
        }
    }

    // DataFlowLinks — colour link, set overlayThreats attribute.
    for (const link of graph.getLinks()) {
        const flowId = link.get('otmDataflowId');
        const threats = flowId ? (dataflowThreats.get(flowId) || []) : [];

        if (threats.length === 0) {
            link.set('overlayThreats', null);
            link.setColour(DEFAULT_LINK_COLOUR);
        } else {
            const state = worstState(threats);
            link.set('overlayThreats', { count: threats.length, state });
            const hasExposed = threats.some(t => isExposed(threatState(t)));
            link.setColour(hasExposed ? EXPOSED_LINK_COLOUR : DEFAULT_LINK_COLOUR);
        }
    }

    // TrustZoneContainers — highlight border red if any embedded child has exposed threats.
    for (const element of graph.getElements()) {
        if (element.get('type') !== CONTAINER_TYPE) continue;

        const childrenHaveExposed = element.getEmbeddedCells().some(child => {
            const compId = child.get('otmComponentId');
            if (!compId) return false;
            const threats = componentThreats.get(compId) || [];
            return threats.some(t => isExposed(threatState(t)));
        });

        element.attr('body/stroke', childrenHaveExposed ? EXPOSED_ZONE_STROKE : DEFAULT_ZONE_STROKE);
    }
}

// Remove all overlay state and reset link/border colours to defaults.
export function clearThreatOverlay(graph) {
    if (!graph) throw new Error('clearThreatOverlay: graph is required');

    for (const element of graph.getElements()) {
        element.set('overlayThreats', null);
        if (element.get('type') === CONTAINER_TYPE) {
            element.attr('body/stroke', DEFAULT_ZONE_STROKE);
        }
    }

    for (const link of graph.getLinks()) {
        link.set('overlayThreats', null);
        link.setColour(DEFAULT_LINK_COLOUR);
    }
}
