import { jsConfig } from '@joint/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    ...jsConfig,
    {
        ignores: ['node_modules/', 'dist/', 'build/']
    }
]);
