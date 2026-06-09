// elkLayout — ELK.js hierarchical auto-layout for DFD graphs.
// Converts the JointJS graph to an ELK model, runs the `layered` algorithm
// left-to-right, then writes computed positions back to elements.
//
// TrustZoneContainers become ELK compound nodes (with children).
// DataFlowLinks become ELK edges (cross-hierarchy edges live at root).
// Returns a Promise<graph> so callers can await completion.

import ELK from 'elkjs/lib/elk.bundled.js';

const CONTAINER_TYPE = 'dfd.TrustZoneContainer';

const DEFAULT_DIRECTION = 'RIGHT';
const DEFAULT_NODE_SPACING = 30;
const DEFAULT_LAYER_SPACING = 60;
const DEFAULT_PADDING = 40;

// Apply ELK-computed positions recursively.
// ELK returns positions relative to the parent node; we accumulate the
// absolute offset so JointJS (which stores absolute coords) gets the right value.
function applyPositions(elkNodes, graph, parentAbsX, parentAbsY) {
    for (const node of elkNodes) {
        const el = graph.getCell(node.id);
        if (!el) continue;

        const absX = parentAbsX + (node.x || 0);
        const absY = parentAbsY + (node.y || 0);

        el.position(absX, absY);

        if (Number.isFinite(node.width) && Number.isFinite(node.height)) {
            el.resize(node.width, node.height);
        }

        if (node.children && node.children.length > 0) {
            applyPositions(node.children, graph, absX, absY);
        }
    }
}

export async function elkLayout(graph, options = {}) {
    if (!graph) throw new Error('elkLayout: graph is required');

    const elements = graph.getElements();
    if (elements.length === 0) return graph;

    const {
        direction = DEFAULT_DIRECTION,
        nodeSpacing = DEFAULT_NODE_SPACING,
        layerSpacing = DEFAULT_LAYER_SPACING,
        padding = DEFAULT_PADDING,
    } = options;

    const elk = new ELK();

    const trustZones = elements.filter(el => el.get('type') === CONTAINER_TYPE);
    const components = elements.filter(el => el.get('type') !== CONTAINER_TYPE);

    // Map JointJS zone ID → ELK compound node (for child insertion).
    const zoneElkMap = new Map();
    const rootChildren = [];

    for (const zone of trustZones) {
        const { width, height } = zone.size();
        const elkNode = {
            id: zone.id,
            width: Math.max(width, 200),
            height: Math.max(height, 150),
            layoutOptions: {
                'elk.padding': `[top=${padding}, left=${padding}, bottom=${padding}, right=${padding}]`
            },
            children: []
        };
        zoneElkMap.set(zone.id, elkNode);
        rootChildren.push(elkNode);
    }

    for (const el of components) {
        const { width, height } = el.size();
        const elkNode = { id: el.id, width, height };
        const parentId = el.get('parent');
        if (parentId && zoneElkMap.has(parentId)) {
            zoneElkMap.get(parentId).children.push(elkNode);
        } else {
            rootChildren.push(elkNode);
        }
    }

    // All edges at root level; ELK resolves cross-hierarchy endpoints automatically.
    const rootEdges = [];
    for (const link of graph.getLinks()) {
        const source = link.get('source');
        const target = link.get('target');
        if (source && source.id && target && target.id) {
            rootEdges.push({ id: link.id, sources: [source.id], targets: [target.id] });
        }
    }

    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': direction,
            'elk.spacing.nodeNode': String(nodeSpacing),
            'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
        },
        children: rootChildren,
        edges: rootEdges
    };

    let layout;
    try {
        layout = await elk.layout(elkGraph);
    } catch {
        // Layout failed — elements remain at initial positions.
        return graph;
    }

    applyPositions(layout.children || [], graph, 0, 0);

    return graph;
}
