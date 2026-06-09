import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { applyThreatOverlay, clearThreatOverlay, shapes, badgeColourForState, ThreatBadge } from '../src/index.mjs';
import { otmToGraph } from '../src/otm-adapter/otmToGraph.mjs';

function makeGraph() {
    return new dia.Graph({}, { cellNamespace: { dfd: shapes }});
}

// OTM document with threats nested in components and dataflows.
function otmWithThreats() {
    return {
        trustZones: [
            { id: 'zone-a', name: 'Zone A', risk: { trustRating: 50 }},
            { id: 'zone-b', name: 'Zone B', risk: { trustRating: 80 }}
        ],
        components: [
            {
                id: 'comp-exposed', name: 'Exposed Comp', type: 'web-service',
                parent: { trustZone: 'zone-a' },
                threats: [
                    { id: 't1', status: 'exposed' },
                    { id: 't2', status: 'assessed' }
                ]
            },
            {
                id: 'comp-yellow', name: 'Yellow Comp', type: 'web-service',
                parent: { trustZone: 'zone-b' },
                threats: [
                    { id: 't3', status: 'planned' },
                    { id: 't4', status: 'closed' }
                ]
            },
            {
                id: 'comp-green', name: 'Green Comp', type: 'database',
                parent: { trustZone: 'zone-b' },
                threats: [
                    { id: 't5', status: 'closed' }
                ]
            },
            {
                id: 'comp-none', name: 'No Threat Comp', type: 'web-client',
                parent: { trustZone: 'zone-a' }
                // no threats array
            }
        ],
        dataflows: [
            {
                id: 'flow-exposed', name: 'Flow with exposed threat',
                source: 'comp-exposed', destination: 'comp-yellow',
                assets: ['data'],
                threats: [{ id: 'ft1', status: 'exposed' }]
            },
            {
                id: 'flow-yellow', name: 'Flow with yellow threat',
                source: 'comp-yellow', destination: 'comp-green',
                assets: ['data'],
                threats: [{ id: 'ft2', status: 'assessed' }]
            },
            {
                id: 'flow-none', name: 'Flow with no threats',
                source: 'comp-green', destination: 'comp-exposed',
                assets: ['data']
            }
        ]
    };
}

test('applyThreatOverlay — component with exposed threat gets red badge state', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    const comp = graph.getCell('comp-exposed');
    const overlay = comp.get('overlayThreats');
    assert.ok(overlay, 'overlay should be set');
    assert.strictEqual(overlay.count, 2);
    assert.strictEqual(overlay.state, 'exposed');
    assert.strictEqual(badgeColourForState(overlay.state).fill, '#D32F2F');
});

test('applyThreatOverlay — component with only yellow threats gets yellow badge state', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    const comp = graph.getCell('comp-yellow');
    const overlay = comp.get('overlayThreats');
    assert.ok(overlay);
    assert.strictEqual(overlay.count, 2);
    assert.strictEqual(overlay.state, 'planned');
    assert.strictEqual(badgeColourForState(overlay.state).fill, '#FBC02D');
});

test('applyThreatOverlay — component with only closed threats gets green badge state', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    const comp = graph.getCell('comp-green');
    const overlay = comp.get('overlayThreats');
    assert.ok(overlay);
    assert.strictEqual(overlay.count, 1);
    assert.strictEqual(overlay.state, 'closed');
    assert.strictEqual(badgeColourForState(overlay.state).fill, '#388E3C');
});

test('applyThreatOverlay — component with no threats has null overlay', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    const comp = graph.getCell('comp-none');
    assert.strictEqual(comp.get('overlayThreats'), null);
});

test('applyThreatOverlay — data flow with exposed threat gets red link colour', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    const link = graph.getCell('flow-exposed');
    assert.strictEqual(link.attr('line/stroke'), '#D32F2F');
    const overlay = link.get('overlayThreats');
    assert.ok(overlay);
    assert.strictEqual(overlay.count, 1);
    assert.strictEqual(overlay.state, 'exposed');
});

test('applyThreatOverlay — data flow with non-exposed threat keeps default grey colour', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    const link = graph.getCell('flow-yellow');
    assert.strictEqual(link.attr('line/stroke'), '#616161');
    const overlay = link.get('overlayThreats');
    assert.ok(overlay);
    assert.strictEqual(overlay.state, 'assessed');
});

test('applyThreatOverlay — data flow with no threats has null overlay and default colour', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    const link = graph.getCell('flow-none');
    assert.strictEqual(link.get('overlayThreats'), null);
    assert.strictEqual(link.attr('line/stroke'), '#616161');
});

test('applyThreatOverlay — trust zone border turns red when child has exposed threat', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    // zone-a contains comp-exposed (exposed threat) → red border
    const zoneA = graph.getCell('zone-a');
    assert.strictEqual(zoneA.attr('body/stroke'), '#D32F2F');

    // zone-b has no exposed threats (only planned, closed) → default grey
    const zoneB = graph.getCell('zone-b');
    assert.strictEqual(zoneB.attr('body/stroke'), '#616161');
});

test('clearThreatOverlay — removes overlay attributes from all cells', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    // Verify overlays are set before clearing
    assert.ok(graph.getCell('comp-exposed').get('overlayThreats'));

    clearThreatOverlay(graph);

    for (const el of graph.getElements()) {
        assert.strictEqual(el.get('overlayThreats'), null, `${el.id} should have null overlay`);
    }
    for (const link of graph.getLinks()) {
        assert.strictEqual(link.get('overlayThreats'), null, `${link.id} should have null overlay`);
    }
});

test('clearThreatOverlay — resets link colours to default grey', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    // flow-exposed was red
    assert.strictEqual(graph.getCell('flow-exposed').attr('line/stroke'), '#D32F2F');

    clearThreatOverlay(graph);

    for (const link of graph.getLinks()) {
        assert.strictEqual(link.attr('line/stroke'), '#616161', `${link.id} should be default grey`);
    }
});

test('clearThreatOverlay — resets trust zone borders to default grey', () => {
    const graph = makeGraph();
    otmToGraph(otmWithThreats(), graph, { autoLayout: false });
    applyThreatOverlay(graph, otmWithThreats());

    // zone-a was red
    assert.strictEqual(graph.getCell('zone-a').attr('body/stroke'), '#D32F2F');

    clearThreatOverlay(graph);

    for (const el of graph.getElements()) {
        if (el.get('type') === 'dfd.TrustZoneContainer') {
            assert.strictEqual(el.attr('body/stroke'), '#616161', `${el.id} border should be grey`);
        }
    }
});

test('applyThreatOverlay — risks[] supplements component threats via moduleId', () => {
    const graph = makeGraph();
    const otm = {
        components: [
            { id: 'srv', name: 'Server', type: 'web-service' }
        ],
        dataflows: []
    };
    otmToGraph(otm, graph, { autoLayout: false });

    const risks = [{ moduleId: 'srv', status: 'exposed' }];
    applyThreatOverlay(graph, otm, risks);

    const comp = graph.getCell('srv');
    const overlay = comp.get('overlayThreats');
    assert.ok(overlay);
    assert.strictEqual(overlay.state, 'exposed');
});

test('applyThreatOverlay — threat.state field is accepted in addition to threat.status', () => {
    const graph = makeGraph();
    const otm = {
        components: [
            {
                id: 'c1', name: 'C1', type: 'web-service',
                threats: [{ id: 't', state: 'assessed' }]
            }
        ],
        dataflows: []
    };
    otmToGraph(otm, graph, { autoLayout: false });
    applyThreatOverlay(graph, otm);

    const overlay = graph.getCell('c1').get('overlayThreats');
    assert.ok(overlay);
    assert.strictEqual(overlay.state, 'assessed');
    assert.strictEqual(badgeColourForState(overlay.state).fill, '#FBC02D');
});

test('applyThreatOverlay — empty graph does not throw', () => {
    const graph = makeGraph();
    assert.doesNotThrow(() => applyThreatOverlay(graph, {}));
});

test('clearThreatOverlay — empty graph does not throw', () => {
    const graph = makeGraph();
    assert.doesNotThrow(() => clearThreatOverlay(graph));
});

test('ThreatBadge — click emits badge:pointerclick with the cell id', () => {
    let notified = null;
    const mockCellView = {
        model: { id: 'comp-123' },
        notify(event, id) {
            notified = { event, id };
        }
    };

    // Directly invoke the click handler on a prototype instance to test the event path
    // without requiring a DOM or paper.
    const badge = Object.create(ThreatBadge.prototype);
    badge.cellView = mockCellView;

    const mockEvt = { stopPropagation() {} };
    badge.onPointerClick(mockEvt);

    assert.deepStrictEqual(notified, { event: 'badge:pointerclick', id: 'comp-123' });
});
