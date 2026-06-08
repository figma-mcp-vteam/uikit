import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    generateComponentTemplate,
    getFigmaNodeUrl,
    getGeneratedFilePath,
    normalizeFigmaPropertyDefinitions,
    normalizeNodeId,
    readRegistry,
    stableStringify,
    validateRegistry,
    writeGeneratedFiles,
} from './lib.mjs';

test('normalizes Figma node ids', () => {
    assert.equal(normalizeNodeId('123-456'), '123:456');
    assert.equal(normalizeNodeId('123:456'), '123:456');
});

test('builds Figma node urls from registry entries', () => {
    const registry = readRegistry();
    const button = registry.components.find((component) => component.id === 'button');

    assert.equal(
        getFigmaNodeUrl(registry, button),
        'https://www.figma.com/design/GihZUtevc7oCwpDQrcdR4i/YC-Gravity-UI-Code-connect-test?node-id=41899%3A462118',
    );
});

test('encodes Figma file names in generated node urls', () => {
    const registry = {...readRegistry(), figmaFileName: 'YC Gravity UI – Code connect test'};
    const button = registry.components.find((component) => component.id === 'button');

    assert.equal(
        getFigmaNodeUrl(registry, button),
        'https://www.figma.com/design/GihZUtevc7oCwpDQrcdR4i/YC%20Gravity%20UI%20%E2%80%93%20Code%20connect%20test?node-id=41899%3A462118',
    );
});

test('normalizes Figma component property definitions from REST shape', () => {
    assert.deepEqual(
        normalizeFigmaPropertyDefinitions({
            'Content#1:2': {type: 'TEXT'},
            Size: {type: 'VARIANT', variantOptions: ['S', 'M']},
        }),
        {
            'Content#1:2': {name: 'Content', type: 'TEXT', key: 'Content#1:2'},
            Size: {name: 'Size', type: 'VARIANT', key: 'Size', variantOptions: ['S', 'M']},
        },
    );
});

test('stable stringifies objects independent of key insertion order', () => {
    assert.equal(
        stableStringify({
            b: {d: 1, c: 2},
            a: ['x', {b: true, a: false}],
        }),
        stableStringify({
            a: ['x', {a: false, b: true}],
            b: {c: 2, d: 1},
        }),
    );
});

test('validates the checked-in registry', () => {
    assert.deepEqual(validateRegistry(readRegistry()), []);
});

test('rejects non-exhaustive enum mappings', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');
    const viewInput = button.inputs.find((input) => input.name === 'view');

    delete viewInput.values.Action;

    assert.match(
        validateRegistry(registry).join('\n'),
        /button: "View" enum mapping mismatch; missing \[Action\], extra \[\]/,
    );
});

test('rejects missing enum mappings', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');
    const viewInput = button.inputs.find((input) => input.name === 'view');

    delete viewInput.values;

    assert.match(
        validateRegistry(registry).join('\n'),
        /button: "View" enum values must be an object/,
    );
});

test('rejects missing Figma property snapshots', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');

    button.inputs = [];
    button.example.props = [];
    delete button.figmaProperties;

    assert.match(
        validateRegistry(registry).join('\n'),
        /button: figmaProperties must be an object/,
    );
});

test('rejects generated files outside the generated directory', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');

    button.generatedFile = '../OldButton.figma.ts';

    assert.match(
        validateRegistry(registry).join('\n'),
        /button: generatedFile must be a file name, not a path: \.\.\/OldButton\.figma\.ts/,
    );
    assert.throws(
        () => getGeneratedFilePath(button),
        /generatedFile must be a file name, not a path: \.\.\/OldButton\.figma\.ts/,
    );
});

test('rejects source files outside the repository', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');

    button.source = '../../../../../etc/passwd';

    assert.match(
        validateRegistry(registry).join('\n'),
        /button: source must stay inside repository root: \.\.\/\.\.\/\.\.\/\.\.\/\.\.\/etc\/passwd/,
    );
});

test('rejects malformed inputs without throwing', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');

    button.inputs = {};

    assert.match(validateRegistry(registry).join('\n'), /button: inputs must be an array/);
});

test('rejects missing examples without throwing', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');

    delete button.example;

    assert.match(validateRegistry(registry).join('\n'), /button: example must be an object/);
});

test('rejects malformed examples without throwing', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');

    button.example = [];

    assert.match(validateRegistry(registry).join('\n'), /button: example must be an object/);
});

test('rejects malformed example props without throwing', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');

    button.example.props = {};

    assert.match(validateRegistry(registry).join('\n'), /button: example\.props must be an array/);
});

test('rejects generated props that do not exist in code', () => {
    const registry = cloneRegistry();
    const button = registry.components.find((component) => component.id === 'button');

    button.example.props.push({prop: 'state', value: "'disabled'"});

    assert.match(validateRegistry(registry).join('\n'), /button: unknown code prop "state"/);
});

test('generates the Button template deterministically', () => {
    const registry = readRegistry();
    const button = registry.components.find((component) => component.id === 'button');
    const output = generateComponentTemplate(registry, button);

    assert.match(output, /id: 'button'/);
    assert.match(output, /import \{Button\} from '@gravity-ui\/uikit';/);
    assert.ok(output.includes('view=${view}'));
    assert.ok(output.includes("disabled=${state === 'Disabled'}"));
    assert.ok(output.includes("selected=${state === 'Selected' || state === 'Selected hover'}"));
    assert.doesNotMatch(output, /iconOnly/);
});

test('reports and removes unexpected generated templates', () => {
    const generatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-connect-generated-'));
    const registry = cloneRegistry();

    registry.components = [registry.components.find((component) => component.id === 'button')];

    writeGeneratedFiles(registry, {generatedDir});
    fs.writeFileSync(path.join(generatedDir, 'OldButton.figma.ts'), '');

    assert.deepEqual(
        writeGeneratedFiles(registry, {check: true, generatedDir}).map((filePath) =>
            path.basename(filePath),
        ),
        ['OldButton.figma.ts'],
    );

    writeGeneratedFiles(registry, {generatedDir});

    assert.equal(fs.existsSync(path.join(generatedDir, 'OldButton.figma.ts')), false);
});

function cloneRegistry() {
    return JSON.parse(JSON.stringify(readRegistry()));
}
