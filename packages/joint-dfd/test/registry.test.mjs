import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    ProcessShape,
    DataStoreShape,
    ExternalEntityShape,
    TrustZoneContainer,
    DataFlowLink,
    ThreatBadge,
    shapes,
    TYPE_TO_SHAPE,
    shapeForType,
    registerShapes
} from '../src/index.mjs';

test('shapes namespace exports every shape class', () => {
    assert.strictEqual(shapes.ProcessShape, ProcessShape);
    assert.strictEqual(shapes.DataStoreShape, DataStoreShape);
    assert.strictEqual(shapes.ExternalEntityShape, ExternalEntityShape);
    assert.strictEqual(shapes.TrustZoneContainer, TrustZoneContainer);
    assert.strictEqual(shapes.DataFlowLink, DataFlowLink);
    assert.strictEqual(shapes.ThreatBadge, ThreatBadge);
});

test('TYPE_TO_SHAPE — web-* maps to ExternalEntityShape or ProcessShape', () => {
    assert.strictEqual(TYPE_TO_SHAPE['web-client'], ExternalEntityShape);
    assert.strictEqual(TYPE_TO_SHAPE['human-actor'], ExternalEntityShape);
    assert.strictEqual(TYPE_TO_SHAPE['external-service'], ExternalEntityShape);
    assert.strictEqual(TYPE_TO_SHAPE['web-service'], ProcessShape);
    assert.strictEqual(TYPE_TO_SHAPE['api-gateway'], ProcessShape);
    assert.strictEqual(TYPE_TO_SHAPE['function'], ProcessShape);
    assert.strictEqual(TYPE_TO_SHAPE['iam-service'], ProcessShape);
    assert.strictEqual(TYPE_TO_SHAPE['message-broker'], ProcessShape);
});

test('TYPE_TO_SHAPE — database and object-store map to DataStoreShape', () => {
    assert.strictEqual(TYPE_TO_SHAPE['database'], DataStoreShape);
    assert.strictEqual(TYPE_TO_SHAPE['object-store'], DataStoreShape);
});

test('shapeForType — unknown type falls back to ProcessShape', () => {
    assert.strictEqual(shapeForType('something-unknown'), ProcessShape);
    assert.strictEqual(shapeForType(undefined), ProcessShape);
    assert.strictEqual(shapeForType('database'), DataStoreShape);
});

test('registerShapes — installs shapes onto joint.shapes.dfd', () => {
    const joint = { shapes: {}};
    const ns = registerShapes(joint);
    assert.strictEqual(joint.shapes.dfd, ns);
    assert.strictEqual(ns.ProcessShape, ProcessShape);
    assert.strictEqual(ns.DataFlowLink, DataFlowLink);
});

test('registerShapes — creates the shapes namespace if absent', () => {
    const joint = {};
    registerShapes(joint);
    assert.ok(joint.shapes);
    assert.strictEqual(joint.shapes.dfd.ProcessShape, ProcessShape);
});

test('registerShapes — throws without a joint module', () => {
    assert.throws(() => registerShapes(undefined));
});
