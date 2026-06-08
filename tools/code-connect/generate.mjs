#!/usr/bin/env node

import {readRegistry, validateRegistry, writeGeneratedFiles} from './lib.mjs';

const check = process.argv.includes('--check');
const registry = readRegistry();
const validationErrors = validateRegistry(registry);

if (validationErrors.length > 0) {
    console.error(validationErrors.join('\n'));
    process.exit(1);
}

const staleFiles = writeGeneratedFiles(registry, {check});

if (staleFiles.length > 0) {
    console.error('Generated Code Connect files are out of date:');
    for (const file of staleFiles) {
        console.error(`- ${file}`);
    }
    console.error('Run `npm run code-connect:generate` and commit the result.');
    process.exit(1);
}
