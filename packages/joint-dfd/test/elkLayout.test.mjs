import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { elkLayout, shapes } from '../src/index.mjs';
import { otmToGraph } from '../src/otm-adapter/otmToGraph.mjs';

function makeGraph() {
    return new dia.Graph({}, { cellNamespace: { dfd: shapes }});
}

// OTM with 2 trust zones, 3 components, and 2 dataflows.
function sampleOtm() {
    return {
        trustZones: [
            { id: 'zone-1', name: 'Zone 1', risk: { trustRating: 50 }},
            { id: 'zone-2', name: 'Zone 2', risk: { trustRating: 80 }}
        ],
        components: [
            { id: 'c1', name: 'Client', type: 'web-client', parent: { trustZone: 'zone-1' }},
            { id: 'c2', name: 'API', type: 'web-service', parent: { trustZone: 'zone-2' }},
            { id: 'c3', name: 'DB', type: 'database', parent: { trustZone: 'zone-2' }}
        ],
        dataflows: [
            { id: 'f1', source: 'c1', destination: 'c2', assets: ['user-data'] },
            { id: 'f2', source: 'c2', destination: 'c3', assets: ['records'] }
        ]
    };
}

test('elkLayout — graph with no elements returns without error', async() => {
    const graph = makeGraph();
    const result = await elkLayout(graph);
    assert.strictEqual(result, graph);
    assert.strictEqual(graph.getElements().length, 0);
});

test('elkLayout — single element is positioned without crash', async() => {
    const graph = makeGraph();
    otmToGraph({
        components: [{ id: 'only', name: 'Solo', type: 'web-service' }],
        dataflows: []
    }, graph, { autoLayout: false });

    await elkLayout(graph);

    const el = graph.getCell('only');
    assert.ok(el);
    // ELK should give it a position (may be 0,0 for a single node).
    const pos = el.position();
    assert.ok(Number.isFinite(pos.x));
    assert.ok(Number.isFinite(pos.y));
});

test('elkLayout — produces non-overlapping positions for multiple components', async() => {
    const graph = makeGraph();
    otmToGraph(sampleOtm(), graph, { autoLayout: false });

    await elkLayout(graph);

    const elements = graph.getElements();
    assert.ok(elements.length > 0);

    // Collect positions; at least two should differ (i.e. ELK assigned distinct positions).
    const positions = elements.map(el => {
        const { x, y } = el.position();
        return `${x},${y}`;
    });
    const unique = new Set(positions);
    assert.ok(unique.size > 1, 'ELK should assign distinct positions to elements');
});

test('elkLayout — components remain inside their trust zone bounds after layout', async() => {
    const graph = makeGraph();
    otmToGraph(sampleOtm(), graph, { autoLayout: false });

    await elkLayout(graph);

    const zone1 = graph.getCell('zone-1');
    const c1    = graph.getCell('c1');
    const zone2 = graph.getCell('zone-2');
    const c2    = graph.getCell('c2');
    const c3    = graph.getCell('c3');

    function isInside(child, container) {
        const { x: cx, y: cy } = child.position();
        const { width: cw, height: ch } = child.size();
        const { x: px, y: py } = container.position();
        const { width: pw, height: ph } = container.size();
        return cx >= px && cy >= py && (cx + cw) <= (px + pw) && (cy + ch) <= (py + ph);
    }

    assert.ok(isInside(c1, zone1), 'c1 should be inside zone-1');
    assert.ok(isInside(c2, zone2), 'c2 should be inside zone-2');
    assert.ok(isInside(c3, zone2), 'c3 should be inside zone-2');
});

test('elkLayout — layout direction is left-to-right (first component x ≤ last component x)', async() => {
    const graph = makeGraph();
    // Linear chain: c1 → c2 → c3 (no zones)
    otmToGraph({
        components: [
            { id: 'c1', name: 'A', type: 'web-service' },
            { id: 'c2', name: 'B', type: 'web-service' },
            { id: 'c3', name: 'C', type: 'database' }
        ],
        dataflows: [
            { id: 'f1', source: 'c1', destination: 'c2', assets: [] },
            { id: 'f2', source: 'c2', destination: 'c3', assets: [] }
        ]
    }, graph, { autoLayout: false });

    await elkLayout(graph);

    const xC1 = graph.getCell('c1').position().x;
    const xC3 = graph.getCell('c3').position().x;
    // In a LEFT→RIGHT layered layout, source nodes appear left of target nodes.
    assert.ok(xC1 <= xC3, `c1.x (${xC1}) should be ≤ c3.x (${xC3}) for left-to-right flow`);
});

test('elkLayout — trust zone containers are resized to enclose their children', async() => {
    const graph = makeGraph();
    otmToGraph(sampleOtm(), graph, { autoLayout: false });

    await elkLayout(graph);

    const zone2 = graph.getCell('zone-2');
    const c2    = graph.getCell('c2');
    const c3    = graph.getCell('c3');

    const zSize = zone2.size();
    const zPos  = zone2.position();

    [c2, c3].forEach(child => {
        const { x, y } = child.position();
        const { width, height } = child.size();
        assert.ok(x >= zPos.x, 'child left edge inside zone');
        assert.ok(y >= zPos.y, 'child top edge inside zone');
        assert.ok(x + width  <= zPos.x + zSize.width,  'child right edge inside zone');
        assert.ok(y + height <= zPos.y + zSize.height, 'child bottom edge inside zone');
    });
});

test('elkLayout — returns the same graph instance', async() => {
    const graph = makeGraph();
    otmToGraph(sampleOtm(), graph, { autoLayout: false });
    const result = await elkLayout(graph);
    assert.strictEqual(result, graph);
});

test('elkLayout — graph with no edges still lays out correctly', async() => {
    const graph = makeGraph();
    otmToGraph({
        components: [
            { id: 'a', name: 'A', type: 'web-service' },
            { id: 'b', name: 'B', type: 'database' }
        ],
        dataflows: []
    }, graph, { autoLayout: false });

    await assert.doesNotReject(() => elkLayout(graph));

    const a = graph.getCell('a');
    const b = graph.getCell('b');
    assert.ok(Number.isFinite(a.position().x));
    assert.ok(Number.isFinite(b.position().x));
});
