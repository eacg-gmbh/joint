import { test } from 'node:test';
import assert from 'node:assert/strict';
import { version } from '../src/index.mjs';

test('@joint/dfd package can be imported', () => {
    assert.strictEqual(typeof version, 'string', 'version should be a string');
    assert.strictEqual(version, '0.1.0', 'version should match package version');
});
