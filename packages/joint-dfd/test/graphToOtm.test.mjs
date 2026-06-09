import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { otmToGraph } from '../src/otm-adapter/otmToGraph.mjs';
import { graphToOtm } from '../src/otm-adapter/graphToOtm.mjs';
import {
    ProcessShape,
    DataFlowLink,
    shapes
} from '../src/index.mjs';

// Parsed equivalent of test/fixtures/sample-otm.yaml.
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
    return new dia.Graph({}, { cellNamespace: { dfd: shapes }});
}

// ─── Round-trip ──────────────────────────────────────────────────────────────

test('graphToOtm — round-trip: otmToGraph then graphToOtm is structurally equivalent', () => {
    const graph = makeGraph();
    const otm = sampleOtm();
    otmToGraph(otm, graph, { autoLayout: false });

    const out = graphToOtm(graph, otm);

    assert.strictEqual(out.trustZones.length, 2);
    assert.strictEqual(out.components.length, 3);
    assert.strictEqual(out.dataflows.length, 2);

    // Component names and parent assignments preserved.
    const webClient = out.components.find(c => c.id === 'web-client');
    assert.ok(webClient, 'web-client present');
    assert.strictEqual(webClient.name, 'Browser');
    assert.strictEqual(webClient.parent.trustZone, 'internet');

    const database = out.components.find(c => c.id === 'database');
    assert.strictEqual(database.parent.trustZone, 'private');

    // Data flow source/destination and assets preserved.
    const flow = out.dataflows.find(f => f.id === 'client-to-api');
    assert.ok(flow, 'client-to-api present');
    assert.strictEqual(flow.source, 'web-client');
    assert.strictEqual(flow.destination, 'web-service');
    assert.deepStrictEqual(flow.assets, ['user-data']);

    // project preserved from existingOtm.
    assert.deepStrictEqual(out.project, otm.project);
    // otmVersion preserved.
    assert.strictEqual(out.otmVersion, '0.2.0');
});

test('graphToOtm — round-trip: non-structural zone fields (type) are preserved', () => {
    const graph = makeGraph();
    const otm = sampleOtm();
    otmToGraph(otm, graph, { autoLayout: false });

    const out = graphToOtm(graph, otm);

    const internet = out.trustZones.find(z => z.id === 'internet');
    assert.strictEqual(internet.type, 'public');
    const priv = out.trustZones.find(z => z.id === 'private');
    assert.strictEqual(priv.type, 'private');
});

// ─── Edit: trust zone reassignment ───────────────────────────────────────────

test('graphToOtm — edit: trust zone reassignment reflected in output', () => {
    const graph = makeGraph();
    const otm = sampleOtm();
    const result = otmToGraph(otm, graph, { autoLayout: false });

    // Move web-client from internet → private by updating the parent attribute directly.
    const webClient = result.components.get('web-client');
    const privateZone = result.trustZones.get('private');
    result.trustZones.get('internet').unembed(webClient);
    privateZone.embed(webClient);

    const out = graphToOtm(graph, otm);
    const webClientOut = out.components.find(c => c.id === 'web-client');
    assert.strictEqual(webClientOut.parent.trustZone, 'private');
});

// ─── Add component ────────────────────────────────────────────────────────────

test('graphToOtm — add component: new shape appears in OTM components', () => {
    const graph = makeGraph();
    const otm = sampleOtm();
    otmToGraph(otm, graph, { autoLayout: false });

    const newShape = new ProcessShape({ id: 'new-process' });
    newShape.setName('New Process');
    graph.addCell(newShape);

    const out = graphToOtm(graph, otm);
    assert.strictEqual(out.components.length, 4);
    const newComp = out.components.find(c => c.id === 'new-process');
    assert.ok(newComp, 'new-process present');
    assert.strictEqual(newComp.name, 'New Process');
    assert.strictEqual(newComp.type, 'function'); // derived from ProcessShape
});

// ─── Remove component ────────────────────────────────────────────────────────

test('graphToOtm — remove component: removed shape absent from OTM', () => {
    const graph = makeGraph();
    const otm = sampleOtm();
    otmToGraph(otm, graph, { autoLayout: false });

    graph.getCell('database').remove();

    const out = graphToOtm(graph, otm);
    assert.strictEqual(out.components.length, 2);
    const db = out.components.find(c => c.id === 'database');
    assert.strictEqual(db, undefined);
});

// ─── Add data flow ────────────────────────────────────────────────────────────

test('graphToOtm — add data flow: new link appears in OTM dataflows', () => {
    const graph = makeGraph();
    const otm = sampleOtm();
    otmToGraph(otm, graph, { autoLayout: false });

    const newLink = new DataFlowLink({
        id: 'db-to-web',
        source: { id: 'database' },
        target: { id: 'web-client' }
    });
    newLink.setAssetNames(['report-data']);
    graph.addCell(newLink);

    const out = graphToOtm(graph, otm);
    assert.strictEqual(out.dataflows.length, 3);
    const newFlow = out.dataflows.find(f => f.id === 'db-to-web');
    assert.ok(newFlow, 'db-to-web present');
    assert.strictEqual(newFlow.source, 'database');
    assert.strictEqual(newFlow.destination, 'web-client');
    assert.deepStrictEqual(newFlow.assets, ['report-data']);
});

// ─── Preserve threats ────────────────────────────────────────────────────────

test('graphToOtm — preserve threats: threats[] unchanged', () => {
    const graph = makeGraph();
    const otm = {
        ...sampleOtm(),
        threats: [
            { id: 't-sqli', name: 'SQL Injection', categories: ['Tampering'], risk: { likelihood: 60, impact: 90 }}
        ]
    };
    otmToGraph(otm, graph, { autoLayout: false });

    const out = graphToOtm(graph, otm);
    assert.deepStrictEqual(out.threats, otm.threats);
});

// ─── Preserve mitigations ────────────────────────────────────────────────────

test('graphToOtm — preserve mitigations: mitigations[] unchanged', () => {
    const graph = makeGraph();
    const otm = {
        ...sampleOtm(),
        mitigations: [
            { id: 'm-1', name: 'Input Validation', ref: 't-sqli' }
        ]
    };
    otmToGraph(otm, graph, { autoLayout: false });

    const out = graphToOtm(graph, otm);
    assert.deepStrictEqual(out.mitigations, otm.mitigations);
});

// ─── No existingOtm ──────────────────────────────────────────────────────────

test('graphToOtm — no existingOtm: produces minimal valid OTM', () => {
    const graph = makeGraph();
    const shape = new ProcessShape({ id: 'p1' });
    shape.setName('Process One');
    graph.addCell(shape);

    const out = graphToOtm(graph);

    assert.ok(out.otmVersion, 'has otmVersion');
    assert.ok(Array.isArray(out.trustZones), 'trustZones is array');
    assert.ok(Array.isArray(out.components), 'components is array');
    assert.ok(Array.isArray(out.dataflows), 'dataflows is array');
    assert.strictEqual(out.trustZones.length, 0);
    assert.strictEqual(out.components.length, 1);
    assert.strictEqual(out.components[0].id, 'p1');
    assert.strictEqual(out.components[0].name, 'Process One');
    assert.strictEqual(out.dataflows.length, 0);
});

// ─── Position persistence ─────────────────────────────────────────────────────

test('graphToOtm — position persistence: current element position in representations[]', () => {
    const graph = makeGraph();
    const otm = sampleOtm();
    otmToGraph(otm, graph, { autoLayout: false });

    graph.getCell('web-client').position(300, 400);
    graph.getCell('web-service').position(600, 200);

    const out = graphToOtm(graph, otm);

    const webClientOut = out.components.find(c => c.id === 'web-client');
    assert.ok(Array.isArray(webClientOut.representations));
    assert.strictEqual(webClientOut.representations[0].position.x, 300);
    assert.strictEqual(webClientOut.representations[0].position.y, 400);

    const webServiceOut = out.components.find(c => c.id === 'web-service');
    assert.strictEqual(webServiceOut.representations[0].position.x, 600);
    assert.strictEqual(webServiceOut.representations[0].position.y, 200);
});

test('graphToOtm — position persistence: trust zone position in representations[]', () => {
    const graph = makeGraph();
    const otm = sampleOtm();
    const result = otmToGraph(otm, graph, { autoLayout: false });

    result.trustZones.get('internet').position(10, 20);
    result.trustZones.get('internet').resize(500, 400);

    const out = graphToOtm(graph, otm);
    const internetOut = out.trustZones.find(z => z.id === 'internet');
    assert.strictEqual(internetOut.representations[0].position.x, 10);
    assert.strictEqual(internetOut.representations[0].position.y, 20);
    assert.strictEqual(internetOut.representations[0].size.width, 500);
    assert.strictEqual(internetOut.representations[0].size.height, 400);
});

// ─── Pass-through: unknown top-level fields ───────────────────────────────────

test('graphToOtm — unknown top-level fields in existingOtm are passed through', () => {
    const graph = makeGraph();
    const otm = { ...sampleOtm(), customField: { arbitrary: true }, assets: ['asset-1'] };
    otmToGraph(otm, graph, { autoLayout: false });

    const out = graphToOtm(graph, otm);
    assert.deepStrictEqual(out.customField, { arbitrary: true });
    assert.deepStrictEqual(out.assets, ['asset-1']);
});

// ─── graph argument required ──────────────────────────────────────────────────

test('graphToOtm — throws when graph is not provided', () => {
    assert.throws(() => graphToOtm(undefined), /graph is required/);
    assert.throws(() => graphToOtm(null), /graph is required/);
});

// ─── Bidirectional data flows ─────────────────────────────────────────────────

test('graphToOtm — bidirectional flag round-trips correctly', () => {
    const graph = makeGraph();
    const otm = {
        ...sampleOtm(),
        dataflows: [
            { id: 'one-way', source: 'web-client', destination: 'web-service', assets: ['x'] },
            { id: 'two-way', source: 'web-client', destination: 'web-service', assets: ['y'], bidirectional: true }
        ]
    };
    otmToGraph(otm, graph, { autoLayout: false });

    const out = graphToOtm(graph, otm);
    const oneWay = out.dataflows.find(f => f.id === 'one-way');
    const twoWay = out.dataflows.find(f => f.id === 'two-way');

    assert.strictEqual(oneWay.bidirectional, undefined);
    assert.strictEqual(twoWay.bidirectional, true);
});

// ─── Empty graph ──────────────────────────────────────────────────────────────

test('graphToOtm — empty graph produces empty structural arrays', () => {
    const graph = makeGraph();
    const otm = sampleOtm();
    const out = graphToOtm(graph, otm);

    assert.strictEqual(out.trustZones.length, 0);
    assert.strictEqual(out.components.length, 0);
    assert.strictEqual(out.dataflows.length, 0);
    assert.deepStrictEqual(out.project, otm.project);
});
