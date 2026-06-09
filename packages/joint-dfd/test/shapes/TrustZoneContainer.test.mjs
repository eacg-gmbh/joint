import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { TrustZoneContainer, trustRatingToFill } from '../../src/shapes/TrustZoneContainer.mjs';

test('TrustZoneContainer — extends dia.Element', () => {
    const z = new TrustZoneContainer();
    assert.ok(z instanceof dia.Element);
    assert.strictEqual(z.get('type'), 'dfd.TrustZoneContainer');
});

test('TrustZoneContainer — default size is the minimum 200×150', () => {
    const z = new TrustZoneContainer();
    assert.deepStrictEqual(z.get('size'), { width: 200, height: 150 });
});

test('TrustZoneContainer — dashed border', () => {
    const z = new TrustZoneContainer();
    assert.strictEqual(z.attr('body/strokeDasharray'), '8,4');
});

test('TrustZoneContainer — has no ports (container only)', () => {
    const z = new TrustZoneContainer();
    assert.strictEqual(z.getPorts().length, 0);
});

test('TrustZoneContainer — clamps resize below the minimum', () => {
    const z = new TrustZoneContainer();
    z.resize(50, 50);
    const size = z.get('size');
    assert.ok(size.width >= 200, `width should clamp to 200, got ${size.width}`);
    assert.ok(size.height >= 150, `height should clamp to 150, got ${size.height}`);
});

test('TrustZoneContainer — setZoneName updates label text', () => {
    const z = new TrustZoneContainer();
    z.setZoneName('Public DMZ');
    assert.strictEqual(z.attr('label/text'), 'Public DMZ');
});

test('TrustZoneContainer — setTrustRating recomputes the fill colour', () => {
    const z = new TrustZoneContainer();
    z.setTrustRating(0);
    const redFill = z.attr('body/fill');
    z.setTrustRating(100);
    const greenFill = z.attr('body/fill');
    assert.notStrictEqual(redFill, greenFill);
    assert.match(redFill, /^rgba\(/);
    assert.match(greenFill, /^rgba\(/);
});

test('trustRatingToFill — extremes and midpoint', () => {
    // Spec: 0=red, 50=yellow, 100=green, alpha=0.1.
    const red = trustRatingToFill(0);
    const yellow = trustRatingToFill(50);
    const green = trustRatingToFill(100);
    assert.match(red, /^rgba\(244, 67, 54, 0\.1\)$/);
    assert.match(yellow, /^rgba\(244, 193, 7, 0\.1\)$/);
    assert.match(green, /^rgba\(76, 175, 80, 0\.1\)$/);
});

test('trustRatingToFill — out-of-range input is clamped', () => {
    assert.strictEqual(trustRatingToFill(-10), trustRatingToFill(0));
    assert.strictEqual(trustRatingToFill(999), trustRatingToFill(100));
});
