import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    generateComponentTemplate,
    getCodeSourceUrl,
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
    const checkbox = getSampleComponent(registry);

    assert.equal(
        getFigmaNodeUrl(registry, checkbox),
        'https://www.figma.com/design/5vAAQi3Iwj9tACtMsduGos/YC%20Gravity%20UI%20%E2%80%93%20Code%20connect%20test?node-id=48571%3A15566',
    );
});

test('encodes Figma file names in generated node urls', () => {
    const registry = {...readRegistry(), figmaFileName: 'HALF-YC-Gravity-UI'};
    const checkbox = getSampleComponent(registry);

    assert.equal(
        getFigmaNodeUrl(registry, checkbox),
        'https://www.figma.com/design/5vAAQi3Iwj9tACtMsduGos/HALF-YC-Gravity-UI?node-id=48571%3A15566',
    );
});

test('builds GitHub source urls for generated templates', () => {
    const registry = readRegistry();
    const checkbox = getSampleComponent(registry);

    assert.equal(
        getCodeSourceUrl(registry, checkbox),
        'https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/Checkbox/Checkbox.tsx',
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
    const checkbox = getSampleComponent(registry);
    const sizeInput = checkbox.inputs.find((input) => input.name === 'size');

    delete sizeInput.values.XL;

    assert.match(
        validateRegistry(registry).join('\n'),
        /checkbox: "Size" enum mapping mismatch; missing \[XL\], extra \[\]/,
    );
});

test('rejects missing enum mappings', () => {
    const registry = cloneRegistry();
    const checkbox = getSampleComponent(registry);
    const sizeInput = checkbox.inputs.find((input) => input.name === 'size');

    delete sizeInput.values;

    assert.match(
        validateRegistry(registry).join('\n'),
        /checkbox: "Size" enum values must be an object/,
    );
});

test('rejects missing Figma property snapshots', () => {
    const registry = cloneRegistry();
    const checkbox = getSampleComponent(registry);

    checkbox.inputs = [];
    checkbox.example.props = [];
    delete checkbox.figmaProperties;

    assert.match(
        validateRegistry(registry).join('\n'),
        /checkbox: figmaProperties must be an object/,
    );
});

test('rejects generated files outside the generated directory', () => {
    const registry = cloneRegistry();
    const checkbox = getSampleComponent(registry);

    checkbox.generatedFile = '../OldCheckbox.figma.ts';

    assert.match(
        validateRegistry(registry).join('\n'),
        /checkbox: generatedFile must be a file name, not a path: \.\.\/OldCheckbox\.figma\.ts/,
    );
    assert.throws(
        () => getGeneratedFilePath(checkbox),
        /generatedFile must be a file name, not a path: \.\.\/OldCheckbox\.figma\.ts/,
    );
});

test('rejects source files outside the repository', () => {
    const registry = cloneRegistry();
    const checkbox = getSampleComponent(registry);

    checkbox.source = '../../../../../etc/passwd';

    assert.match(
        validateRegistry(registry).join('\n'),
        /checkbox: source must stay inside repository root: \.\.\/\.\.\/\.\.\/\.\.\/\.\.\/etc\/passwd/,
    );
});

test('rejects malformed inputs without throwing', () => {
    const registry = cloneRegistry();
    const checkbox = getSampleComponent(registry);

    checkbox.inputs = {};

    assert.match(validateRegistry(registry).join('\n'), /checkbox: inputs must be an array/);
});

test('rejects missing examples without throwing', () => {
    const registry = cloneRegistry();
    const checkbox = getSampleComponent(registry);

    delete checkbox.example;

    assert.match(validateRegistry(registry).join('\n'), /checkbox: example must be an object/);
});

test('rejects malformed examples without throwing', () => {
    const registry = cloneRegistry();
    const checkbox = getSampleComponent(registry);

    checkbox.example = [];

    assert.match(validateRegistry(registry).join('\n'), /checkbox: example must be an object/);
});

test('rejects malformed example props without throwing', () => {
    const registry = cloneRegistry();
    const checkbox = getSampleComponent(registry);

    checkbox.example.props = {};

    assert.match(validateRegistry(registry).join('\n'), /checkbox: example\.props must be an array/);
});

test('rejects generated props that do not exist in code', () => {
    const registry = cloneRegistry();
    const checkbox = getSampleComponent(registry);

    checkbox.example.props.push({prop: 'state', value: "'disabled'"});

    assert.match(validateRegistry(registry).join('\n'), /checkbox: unknown code prop "state"/);
});

test('generates the Checkbox template deterministically', () => {
    const registry = readRegistry();
    const checkbox = getSampleComponent(registry);
    const output = generateComponentTemplate(registry, checkbox);

    assert.match(output, /id: 'checkbox'/);
    assert.ok(
        output.includes(
            '// source=https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/Checkbox/Checkbox.tsx',
        ),
    );
    assert.match(output, /import \{Checkbox\} from '@gravity-ui\/uikit';/);
    assert.ok(output.includes("${figma.helpers.react.renderProp('checked', checked)}"));
    assert.ok(output.includes("${figma.helpers.react.renderProp('indeterminate', indeterminate)}"));
    assert.ok(output.includes("${figma.helpers.react.renderProp('disabled', state === 'Disabled')}"));
    assert.ok(
        output.includes(
            "${figma.helpers.react.renderProp('content', contentVisible ? contentText : undefined)}",
        ),
    );
    assert.doesNotMatch(output, /function renderReactProp/);
    assert.doesNotMatch(output, /type ReactPropValue/);
});

test('reports and removes unexpected generated templates', () => {
    const generatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-connect-generated-'));
    const registry = cloneRegistry();

    registry.components = [getSampleComponent(registry)];

    writeGeneratedFiles(registry, {generatedDir});
    fs.writeFileSync(path.join(generatedDir, 'OldCheckbox.figma.ts'), '');

    assert.deepEqual(
        writeGeneratedFiles(registry, {check: true, generatedDir}).map((filePath) =>
            path.basename(filePath),
        ),
        ['OldCheckbox.figma.ts'],
    );

    writeGeneratedFiles(registry, {generatedDir});

    assert.equal(fs.existsSync(path.join(generatedDir, 'OldCheckbox.figma.ts')), false);
});

function getSampleComponent(registry) {
    return registry.components.find((component) => component.id === 'checkbox');
}

function cloneRegistry() {
    return JSON.parse(JSON.stringify(readRegistry()));
}
