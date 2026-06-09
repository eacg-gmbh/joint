import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dia } from '@joint/core';
import { ThreatBadge, badgeColourForState } from '../../src/shapes/ThreatBadge.mjs';

test('ThreatBadge — extends dia.HighlighterView', () => {
    assert.ok(Object.prototype.isPrototypeOf.call(dia.HighlighterView.prototype, ThreatBadge.prototype));
});

test('ThreatBadge — exposes attach and detach static helpers', () => {
    assert.strictEqual(typeof ThreatBadge.attach, 'function');
    assert.strictEqual(typeof ThreatBadge.detach, 'function');
});

test('ThreatBadge — radius constant matches spec (r=12)', () => {
    assert.strictEqual(ThreatBadge.BADGE_RADIUS, 12);
});

test('badgeColourForState — red bucket (exposed, identified)', () => {
    assert.strictEqual(badgeColourForState('exposed').fill, '#D32F2F');
    assert.strictEqual(badgeColourForState('identified').fill, '#D32F2F');
});

test('badgeColourForState — yellow bucket (assessed, planned, implementing)', () => {
    assert.strictEqual(badgeColourForState('assessed').fill, '#FBC02D');
    assert.strictEqual(badgeColourForState('planned').fill, '#FBC02D');
    assert.strictEqual(badgeColourForState('implementing').fill, '#FBC02D');
});

test('badgeColourForState — green bucket (closed, eliminated)', () => {
    assert.strictEqual(badgeColourForState('closed').fill, '#388E3C');
    assert.strictEqual(badgeColourForState('eliminated').fill, '#388E3C');
});

test('badgeColourForState — grey bucket', () => {
    ['accepted', 'monitored', 'deferred', 'out-of-scope', 'transferred', 'escalated', 'expired'].forEach((state) => {
        assert.strictEqual(badgeColourForState(state).fill, '#9E9E9E', `expected grey for ${state}`);
    });
});

test('badgeColourForState — unknown state falls back to grey', () => {
    assert.strictEqual(badgeColourForState('something-else').fill, '#9E9E9E');
    assert.strictEqual(badgeColourForState(undefined).fill, '#9E9E9E');
});
