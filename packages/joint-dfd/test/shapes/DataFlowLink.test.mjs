import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { DataFlowLink } from '../../src/shapes/DataFlowLink.mjs';

test('DataFlowLink — extends dia.Link', () => {
    const link = new DataFlowLink();
    assert.ok(link instanceof dia.Link);
    assert.strictEqual(link.get('type'), 'dfd.DataFlowLink');
});

test('DataFlowLink — default attrs: grey stroke 1.5px with target marker', () => {
    const link = new DataFlowLink();
    assert.strictEqual(link.attr('line/stroke'), '#616161');
    assert.strictEqual(link.attr('line/strokeWidth'), 1.5);
    const marker = link.attr('line/targetMarker');
    assert.ok(marker, 'should have a target marker');
    assert.strictEqual(marker.type, 'path');
});

test('DataFlowLink — has a label at midpoint with rect background', () => {
    const link = new DataFlowLink();
    const labels = link.labels();
    assert.strictEqual(labels.length, 1);
    assert.strictEqual(labels[0].position, 0.5);
});

test('DataFlowLink — setAssetNames joins an array with commas', () => {
    const link = new DataFlowLink();
    link.setAssetNames(['email', 'password', 'token']);
    assert.strictEqual(link.prop('labels/0/attrs/text/text'), 'email, password, token');
});

test('DataFlowLink — setAssetNames accepts a single string', () => {
    const link = new DataFlowLink();
    link.setAssetNames('payload');
    assert.strictEqual(link.prop('labels/0/attrs/text/text'), 'payload');
});

test('DataFlowLink — setColour updates stroke and target marker', () => {
    const link = new DataFlowLink();
    link.setColour('#D32F2F');
    assert.strictEqual(link.attr('line/stroke'), '#D32F2F');
    assert.strictEqual(link.attr('line/targetMarker/fill'), '#D32F2F');
});

test('DataFlowLink — setBidirectional adds and removes source marker', () => {
    const link = new DataFlowLink();
    link.setBidirectional(true);
    assert.ok(link.attr('line/sourceMarker'));
    assert.strictEqual(link.get('bidirectional'), true);
    link.setBidirectional(false);
    assert.strictEqual(link.attr('line/sourceMarker'), undefined);
    assert.strictEqual(link.get('bidirectional'), false);
});
