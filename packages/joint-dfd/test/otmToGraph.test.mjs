import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { otmToGraph } from '../src/otm-adapter/otmToGraph.mjs';
import {
    ProcessShape,
    DataStoreShape,
    ExternalEntityShape,
    TrustZoneContainer,
    DataFlowLink,
    shapes
} from '../src/index.mjs';

// Parsed equivalent of test/fixtures/sample-otm.yaml. The adapter contract is
// "caller provides parsed JS object", so the test inlines the parse result
// rather than pulling in a YAML dependency.
function sampleOtm() {
    return {
        otmVersion: '0.2.0',
        project: { name: 'Sample Project', id: 'sample-project' },
        trustZones: [
            { id: 'internet', name: 'Internet', type: 'public', risk: { trustRating: 20 }},
            { id: 'private', name: 'Private Network', type: 'private', risk: { trustRating: 100 }}
        ],
        components: [
            { id: 'web-client', name: 'Browser', type: 'web-client', parent: { trustZone: 'internet' }},
            { id: 'web-service', name: 'API Server', type: 'web-service', parent: { trustZone: 'private' }},
            { id: 'database', name: 'Customer DB', type: 'database', parent: { trustZone: 'private' }}
        ],
        dataflows: [
            { id: 'client-to-api', name: 'HTTPS requests', source: 'web-client', destination: 'web-service', assets: ['user-data'] },
            { id: 'api-to-db', name: 'SQL queries', source: 'web-service', destination: 'database', assets: ['customer-records'] }
        ]
    };
}

function makeGraph() {
    // cellNamespace lets dia.Graph resolve our custom 'dfd.*' types.
    return new dia.Graph({}, { cellNamespace: { dfd: shapes }});
}

test('otmToGraph — populates a graph from the sample OTM fixture', () => {
    const graph = makeGraph();
    otmToGraph(sampleOtm(), graph);

    // 2 zones + 3 components + 2 dataflows
    assert.strictEqual(graph.getElements().length, 5);
    assert.strictEqual(graph.getLinks().length, 2);
});

test('otmToGraph — empty OTM produces an empty graph, no errors', () => {
    const graph = makeGraph();
    assert.doesNotThrow(() => otmToGraph({}, graph));
    assert.strictEqual(graph.getCells().length, 0);

    const graph2 = makeGraph();
    assert.doesNotThrow(() => otmToGraph({ trustZones: [], components: [], dataflows: [] }, graph2));
    assert.strictEqual(graph2.getCells().length, 0);
});

test('otmToGraph — requires a graph argument', () => {
    assert.throws(() => otmToGraph({}, undefined));
});

test('otmToGraph — trust zones become TrustZoneContainer with the right colour band', () => {
    const graph = makeGraph();
    const result = otmToGraph(sampleOtm(), graph);

    const internet = result.trustZones.get('internet');
    const priv = result.trustZones.get('private');

    assert.ok(internet instanceof TrustZoneContainer);
    assert.ok(priv instanceof TrustZoneContainer);
    assert.strictEqual(internet.get('trustRating'), 20);
    assert.strictEqual(priv.get('trustRating'), 100);
    assert.strictEqual(internet.attr('label/text'), 'Internet');
    assert.strictEqual(priv.attr('label/text'), 'Private Network');

    // trustRating=100 → green-ish fill; trustRating=20 → red-ish fill
    const internetFill = internet.attr('body/fill');
    const privFill = priv.attr('body/fill');
    assert.ok(internetFill.startsWith('rgba('));
    assert.ok(privFill.startsWith('rgba('));
    assert.notStrictEqual(internetFill, privFill);
});

test('otmToGraph — component types map to the correct DFD shape class', () => {
    const otm = {
        trustZones: [],
        components: [
            { id: 'c-web-service', name: 'svc', type: 'web-service' },
            { id: 'c-api-gateway', name: 'gw', type: 'api-gateway' },
            { id: 'c-function', name: 'fn', type: 'function' },
            { id: 'c-iam', name: 'iam', type: 'iam-service' },
            { id: 'c-mq', name: 'mq', type: 'message-broker' },
            { id: 'c-db', name: 'db', type: 'database' },
            { id: 'c-obj', name: 'obj', type: 'object-store' },
            { id: 'c-web', name: 'web', type: 'web-client' },
            { id: 'c-human', name: 'human', type: 'human-actor' },
            { id: 'c-ext', name: 'ext', type: 'external-service' }
        ],
        dataflows: []
    };
    const graph = makeGraph();
    const result = otmToGraph(otm, graph, { autoLayout: false });

    assert.ok(result.components.get('c-web-service') instanceof ProcessShape);
    assert.ok(result.components.get('c-api-gateway') instanceof ProcessShape);
    assert.ok(result.components.get('c-function') instanceof ProcessShape);
    assert.ok(result.components.get('c-iam') instanceof ProcessShape);
    assert.ok(result.components.get('c-mq') instanceof ProcessShape);
    assert.ok(result.components.get('c-db') instanceof DataStoreShape);
    assert.ok(result.components.get('c-obj') instanceof DataStoreShape);
    assert.ok(result.components.get('c-web') instanceof ExternalEntityShape);
    assert.ok(result.components.get('c-human') instanceof ExternalEntityShape);
    assert.ok(result.components.get('c-ext') instanceof ExternalEntityShape);
});

test('otmToGraph — unknown component type defaults to ProcessShape', () => {
    const otm = {
        components: [{ id: 'unknown', name: 'unknown thing', type: 'something-new' }]
    };
    const graph = makeGraph();
    const result = otmToGraph(otm, graph, { autoLayout: false });
    assert.ok(result.components.get('unknown') instanceof ProcessShape);
});

test('otmToGraph — components are embedded in their parent trust zone', () => {
    const graph = makeGraph();
    const result = otmToGraph(sampleOtm(), graph);

    const internet = result.trustZones.get('internet');
    const priv = result.trustZones.get('private');
    const webClient = result.components.get('web-client');
    const webService = result.components.get('web-service');
    const database = result.components.get('database');

    assert.strictEqual(webClient.get('parent'), internet.id);
    assert.strictEqual(webService.get('parent'), priv.id);
    assert.strictEqual(database.get('parent'), priv.id);

    const internetChildren = internet.getEmbeddedCells();
    assert.strictEqual(internetChildren.length, 1);
    assert.strictEqual(internetChildren[0].id, 'web-client');
});

test('otmToGraph — data flow links carry the right source, target, and asset label', () => {
    const graph = makeGraph();
    const result = otmToGraph(sampleOtm(), graph);

    const flow = result.dataflows.get('client-to-api');
    assert.ok(flow instanceof DataFlowLink);
    assert.strictEqual(flow.get('source').id, 'web-client');
    assert.strictEqual(flow.get('target').id, 'web-service');
    assert.strictEqual(flow.prop('labels/0/attrs/text/text'), 'user-data');

    const flow2 = result.dataflows.get('api-to-db');
    assert.strictEqual(flow2.prop('labels/0/attrs/text/text'), 'customer-records');
});

test('otmToGraph — data flow joins multiple asset names with commas', () => {
    const otm = {
        components: [
            { id: 'a', name: 'A', type: 'web-service' },
            { id: 'b', name: 'B', type: 'database' }
        ],
        dataflows: [{
            id: 'a-b', name: 'flow', source: 'a', destination: 'b',
            assets: ['email', 'password', 'token']
        }]
    };
    const graph = makeGraph();
    const result = otmToGraph(otm, graph, { autoLayout: false });
    assert.strictEqual(result.dataflows.get('a-b').prop('labels/0/attrs/text/text'), 'email, password, token');
});

test('otmToGraph — bidirectional flag flips the link variant', () => {
    const otm = {
        components: [
            { id: 'a', name: 'A', type: 'web-service' },
            { id: 'b', name: 'B', type: 'web-service' }
        ],
        dataflows: [
            { id: 'one-way', source: 'a', destination: 'b', assets: ['x'] },
            { id: 'two-way', source: 'a', destination: 'b', assets: ['y'], bidirectional: true }
        ]
    };
    const graph = makeGraph();
    const result = otmToGraph(otm, graph, { autoLayout: false });

    assert.strictEqual(result.dataflows.get('one-way').get('bidirectional'), false);
    assert.strictEqual(result.dataflows.get('one-way').attr('line/sourceMarker'), undefined);
    assert.strictEqual(result.dataflows.get('two-way').get('bidirectional'), true);
    assert.ok(result.dataflows.get('two-way').attr('line/sourceMarker'));
});

test('otmToGraph — OTM IDs stored on cells for reverse mapping', () => {
    const graph = makeGraph();
    const result = otmToGraph(sampleOtm(), graph);

    assert.strictEqual(result.trustZones.get('internet').get('otmTrustZoneId'), 'internet');
    assert.strictEqual(result.components.get('web-client').get('otmComponentId'), 'web-client');
    assert.strictEqual(result.components.get('web-client').get('otmComponentType'), 'web-client');
    assert.strictEqual(result.dataflows.get('client-to-api').get('otmDataflowId'), 'client-to-api');
});

test('otmToGraph — uses position data from representations[] when present', () => {
    const otm = {
        trustZones: [{
            id: 'zone-1', name: 'Z', risk: { trustRating: 50 },
            representations: [{ position: { x: 50, y: 60 }, size: { width: 400, height: 300 }}]
        }],
        components: [{
            id: 'c-1', name: 'C', type: 'web-service',
            parent: { trustZone: 'zone-1' },
            representations: [{ position: { x: 100, y: 200 }, size: { width: 200, height: 80 }}]
        }],
        dataflows: []
    };
    const graph = makeGraph();
    const result = otmToGraph(otm, graph);

    const zone = result.trustZones.get('zone-1');
    assert.deepStrictEqual(zone.position(), { x: 50, y: 60 });
    assert.deepStrictEqual(zone.size(), { width: 400, height: 300 });

    const c = result.components.get('c-1');
    assert.deepStrictEqual(c.position(), { x: 100, y: 200 });
    assert.deepStrictEqual(c.size(), { width: 200, height: 80 });
});

test('otmToGraph — positions from OTM are preserved verbatim (no auto-layout overwrite)', () => {
    const otm = {
        components: [{
            id: 'c-1', name: 'C', type: 'web-service',
            representations: [{ position: { x: 123, y: 456 }}]
        }],
        dataflows: []
    };
    const graph = makeGraph();
    otmToGraph(otm, graph);
    assert.deepStrictEqual(graph.getCell('c-1').position(), { x: 123, y: 456 });
});

test('otmToGraph — autoLayout option is honoured (explicit false skips the stub)', () => {
    // The default is to call elkLayout when no positions are present. Passing
    // autoLayout:false skips the call. We verify the call happens / doesn't via
    // a tracked-call wrapper. Since the public adapter holds a static import of
    // elkLayout, we observe behaviour by ensuring both code paths run cleanly
    // and that components without positions land at the default (0,0).
    const otm = { components: [{ id: 'x', name: 'X', type: 'web-service' }], dataflows: [] };

    const graphA = makeGraph();
    otmToGraph(otm, graphA, { autoLayout: false });
    assert.deepStrictEqual(graphA.getCell('x').position(), { x: 0, y: 0 });

    const graphB = makeGraph();
    assert.doesNotThrow(() => otmToGraph(otm, graphB, { autoLayout: true }));
});

test('otmToGraph — components without parent.trustZone are not embedded', () => {
    const otm = {
        trustZones: [{ id: 'z', name: 'Z', risk: { trustRating: 50 }}],
        components: [
            { id: 'orphan', name: 'O', type: 'web-service' },
            { id: 'child', name: 'C', type: 'web-service', parent: { trustZone: 'z' }}
        ],
        dataflows: []
    };
    const graph = makeGraph();
    const result = otmToGraph(otm, graph, { autoLayout: false });
    assert.strictEqual(result.components.get('orphan').get('parent'), undefined);
    assert.strictEqual(result.components.get('child').get('parent'), 'z');
});

test('otmToGraph — references to a missing trust zone do not crash', () => {
    const otm = {
        trustZones: [],
        components: [
            { id: 'c', name: 'C', type: 'web-service', parent: { trustZone: 'does-not-exist' }}
        ],
        dataflows: []
    };
    const graph = makeGraph();
    assert.doesNotThrow(() => otmToGraph(otm, graph, { autoLayout: false }));
    assert.strictEqual(graph.getCell('c').get('parent'), undefined);
});

test('otmToGraph — malformed entries (missing id, missing endpoints) are skipped', () => {
    const otm = {
        trustZones: [{ name: 'NoId' }],
        components: [{ name: 'NoId', type: 'web-service' }],
        dataflows: [
            { id: 'no-source', destination: 'x', assets: [] },
            { id: 'no-target', source: 'x', assets: [] }
        ]
    };
    const graph = makeGraph();
    otmToGraph(otm, graph, { autoLayout: false });
    assert.strictEqual(graph.getCells().length, 0);
});
