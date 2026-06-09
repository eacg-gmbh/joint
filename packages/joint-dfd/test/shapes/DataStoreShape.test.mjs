import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { DataStoreShape } from '../../src/shapes/DataStoreShape.mjs';

test('DataStoreShape — extends dia.Element', () => {
    const d = new DataStoreShape();
    assert.ok(d instanceof dia.Element);
    assert.strictEqual(d.get('type'), 'dfd.DataStoreShape');
});

test('DataStoreShape — default size is 140×50', () => {
    const d = new DataStoreShape();
    assert.deepStrictEqual(d.get('size'), { width: 140, height: 50 });
});

test('DataStoreShape — markup has two horizontal lines and a label', () => {
    const d = new DataStoreShape();
    const tags = d.markup.map(node => `${node.tagName}:${node.selector}`);
    assert.deepStrictEqual(tags, [
        'rect:body',
        'line:topLine',
        'line:bottomLine',
        'text:label'
    ]);
});

test('DataStoreShape — both lines use the spec green stroke', () => {
    const d = new DataStoreShape();
    assert.strictEqual(d.attr('topLine/stroke'), '#2E7D32');
    assert.strictEqual(d.attr('bottomLine/stroke'), '#2E7D32');
});

test('DataStoreShape — has left in-port and right out-port', () => {
    const d = new DataStoreShape();
    const ports = d.getPorts();
    assert.strictEqual(ports.length, 2);
    assert.strictEqual(ports[0].group, 'in');
    assert.strictEqual(ports[1].group, 'out');
});

test('DataStoreShape — setName updates label text', () => {
    const d = new DataStoreShape();
    d.setName('Users');
    assert.strictEqual(d.attr('label/text'), 'Users');
});
