import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { ExternalEntityShape } from '../../src/shapes/ExternalEntityShape.mjs';

test('ExternalEntityShape — extends dia.Element', () => {
    const e = new ExternalEntityShape();
    assert.ok(e instanceof dia.Element);
    assert.strictEqual(e.get('type'), 'dfd.ExternalEntityShape');
});

test('ExternalEntityShape — default size is 120×60', () => {
    const e = new ExternalEntityShape();
    assert.deepStrictEqual(e.get('size'), { width: 120, height: 60 });
});

test('ExternalEntityShape — sharp corners (rx=0, ry=0) and spec colours', () => {
    const e = new ExternalEntityShape();
    assert.strictEqual(e.attr('body/rx'), 0);
    assert.strictEqual(e.attr('body/ry'), 0);
    assert.strictEqual(e.attr('body/fill'), '#FFF3E0');
    assert.strictEqual(e.attr('body/stroke'), '#E65100');
});

test('ExternalEntityShape — markup is a rect + a label', () => {
    const e = new ExternalEntityShape();
    const tags = e.markup.map(node => `${node.tagName}:${node.selector}`);
    assert.deepStrictEqual(tags, ['rect:body', 'text:label']);
});

test('ExternalEntityShape — has left in-port and right out-port', () => {
    const e = new ExternalEntityShape();
    const ports = e.getPorts();
    assert.strictEqual(ports.length, 2);
    assert.strictEqual(ports[0].group, 'in');
    assert.strictEqual(ports[1].group, 'out');
});

test('ExternalEntityShape — setDashed toggles strokeDasharray', () => {
    const e = new ExternalEntityShape();
    e.setDashed(true);
    assert.strictEqual(e.attr('body/strokeDasharray'), '6,3');
    e.setDashed(false);
    assert.strictEqual(e.attr('body/strokeDasharray'), 'none');
});

test('ExternalEntityShape — setName updates label text', () => {
    const e = new ExternalEntityShape();
    e.setName('Browser');
    assert.strictEqual(e.attr('label/text'), 'Browser');
});
