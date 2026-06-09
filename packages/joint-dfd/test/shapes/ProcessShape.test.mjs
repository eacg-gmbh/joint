import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { ProcessShape } from '../../src/shapes/ProcessShape.mjs';

test('ProcessShape — extends dia.Element', () => {
    const p = new ProcessShape();
    assert.ok(p instanceof dia.Element);
    assert.strictEqual(p.get('type'), 'dfd.ProcessShape');
});

test('ProcessShape — default size is 120×60', () => {
    const p = new ProcessShape();
    assert.deepStrictEqual(p.get('size'), { width: 120, height: 60 });
});

test('ProcessShape — body has rounded corners and the spec colours', () => {
    const p = new ProcessShape();
    assert.strictEqual(p.attr('body/rx'), 10);
    assert.strictEqual(p.attr('body/ry'), 10);
    assert.strictEqual(p.attr('body/fill'), '#E3F2FD');
    assert.strictEqual(p.attr('body/stroke'), '#1565C0');
});

test('ProcessShape — markup contains rect, image (icon), and text', () => {
    const p = new ProcessShape();
    const tags = p.markup.map(node => `${node.tagName}:${node.selector}`);
    assert.deepStrictEqual(tags, ['rect:body', 'image:icon', 'text:label']);
});

test('ProcessShape — has left in-port and right out-port', () => {
    const p = new ProcessShape();
    const ports = p.getPorts();
    assert.strictEqual(ports.length, 2);
    assert.strictEqual(ports[0].id, 'in');
    assert.strictEqual(ports[0].group, 'in');
    assert.strictEqual(ports[1].id, 'out');
    assert.strictEqual(ports[1].group, 'out');
    const groups = p.prop('ports/groups');
    assert.strictEqual(groups.in.position.name, 'left');
    assert.strictEqual(groups.out.position.name, 'right');
});

test('ProcessShape — setName updates label text', () => {
    const p = new ProcessShape();
    p.setName('Auth Service');
    assert.strictEqual(p.attr('label/text'), 'Auth Service');
});

test('ProcessShape — setIcon updates the icon image href', () => {
    const p = new ProcessShape();
    p.setIcon('https://example.com/icon.svg');
    assert.strictEqual(p.attr('icon/xlink:href'), 'https://example.com/icon.svg');
    assert.strictEqual(p.attr('icon/display'), 'inline');
    p.setIcon(null);
    assert.strictEqual(p.attr('icon/display'), 'none');
});
