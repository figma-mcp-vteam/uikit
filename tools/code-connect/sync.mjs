#!/usr/bin/env node

import {
    normalizeFigmaPropertyDefinitions,
    normalizeNodeId,
    readRegistry,
    stableStringify,
    validateRegistry,
} from './lib.mjs';

const token = process.env.FIGMA_ACCESS_TOKEN;

if (!token) {
    console.error('FIGMA_ACCESS_TOKEN is required for Code Connect sync.');
    process.exit(1);
}

const registry = readRegistry();
const validationErrors = validateRegistry(registry);

if (validationErrors.length > 0) {
    console.error(validationErrors.join('\n'));
    process.exit(1);
}

const nodeIds = registry.components.map((component) => normalizeNodeId(component.nodeId));
const url = new URL(`https://api.figma.com/v1/files/${registry.figmaFileKey}/nodes`);
url.searchParams.set('ids', nodeIds.join(','));

const response = await fetch(url, {
    headers: {
        'X-Figma-Token': token,
    },
});

if (!response.ok) {
    console.error(`Failed to fetch Figma nodes: ${response.status} ${response.statusText}`);
    process.exit(1);
}

const data = await response.json();
const errors = [];

for (const component of registry.components) {
    const nodeId = normalizeNodeId(component.nodeId);
    const node = data.nodes?.[nodeId]?.document;

    if (!node) {
        errors.push(`${component.id}: node ${nodeId} was not found in Figma`);
        continue;
    }

    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
        errors.push(
            `${component.id}: node ${nodeId} is ${node.type}, expected COMPONENT or COMPONENT_SET`,
        );
        continue;
    }

    const liveProperties = normalizeFigmaPropertyDefinitions(node.componentPropertyDefinitions);
    const expected = stableStringify(component.figmaProperties);
    const actual = stableStringify(liveProperties);

    if (actual !== expected) {
        errors.push(`${component.id}: Figma property snapshot is stale`);
    }
}

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
}
