import assert from 'node:assert/strict';
import test from 'node:test';

import {
    generateComponentTemplate,
    getFigmaNodeUrl,
    normalizeFigmaPropertyDefinitions,
    normalizeNodeId,
    readRegistry,
    validateRegistry,
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

function cloneRegistry() {
    return JSON.parse(JSON.stringify(readRegistry()));
}
