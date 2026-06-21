import {isRecord} from './json-utils.mjs';

export function normalizeFigmaPropertyDefinitions(definitions = {}) {
    const normalized = {};

    for (const [key, definition] of Object.entries(definitions)) {
        normalized[key] = {
            name: definition.name || getFigmaPropertyDisplayName(key, definition),
            type: definition.type,
            key,
        };

        if (Array.isArray(definition.variantOptions)) {
            normalized[key].variantOptions = definition.variantOptions;
        }
    }

    return normalized;
}

export function formatFigmaPropertyDefinitionDiffs(
    componentId,
    expectedDefinitions,
    actualDefinitions,
) {
    const diffs = getFigmaPropertyDefinitionDiffs(expectedDefinitions, actualDefinitions);

    if (diffs.length === 0) {
        return [];
    }

    return [
        `${componentId}: Figma property snapshot is stale`,
        ...diffs.map((diff) => `  - ${diff}`),
    ];
}

export function getFigmaPropertyDefinitionDiffs(expectedDefinitions, actualDefinitions) {
    const expected = isRecord(expectedDefinitions) ? expectedDefinitions : {};
    const actual = isRecord(actualDefinitions) ? actualDefinitions : {};
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    const diffs = [];

    for (const key of expectedKeys.filter((propertyKey) => !Object.hasOwn(actual, propertyKey))) {
        diffs.push(`missing in Figma: ${formatPropertyDefinition(key, expected[key])}`);
    }

    for (const key of actualKeys.filter((propertyKey) => !Object.hasOwn(expected, propertyKey))) {
        diffs.push(`extra in Figma: ${formatPropertyDefinition(key, actual[key])}`);
    }

    for (const key of expectedKeys.filter((propertyKey) => Object.hasOwn(actual, propertyKey))) {
        const expectedDefinition = expected[key];
        const actualDefinition = actual[key];

        if (expectedDefinition.type !== actualDefinition.type) {
            diffs.push(
                `${stringLiteral(key)} type mismatch: expected ${expectedDefinition.type}, got ${actualDefinition.type}`,
            );
            continue;
        }

        if (expectedDefinition.type === 'VARIANT') {
            const expectedOptions = expectedDefinition.variantOptions || [];
            const actualOptions = actualDefinition.variantOptions || [];
            const missing = expectedOptions.filter((option) => !actualOptions.includes(option));
            const extra = actualOptions.filter((option) => !expectedOptions.includes(option));

            if (missing.length > 0 || extra.length > 0) {
                diffs.push(
                    `${stringLiteral(key)} variant options mismatch: missing in Figma [${missing.join(
                        ', ',
                    )}], extra in Figma [${extra.join(', ')}]`,
                );
            }
        }
    }

    return diffs;
}

export function getFigmaProperty(figmaProperties, name) {
    const matches = Object.entries(figmaProperties).filter(
        ([key, property]) => key === name || property.name === name,
    );

    return matches.length === 1 ? matches[0][1] : undefined;
}

function formatPropertyDefinition(key, definition = {}) {
    const name = definition.name || getFigmaPropertyDisplayName(key, definition);
    const options = Array.isArray(definition.variantOptions)
        ? ` options=[${definition.variantOptions.join(', ')}]`
        : '';

    return `${stringLiteral(key)} (${definition.type || 'unknown'} "${name}"${options})`;
}

function getFigmaPropertyDisplayName(key, definition) {
    if (definition.type === 'VARIANT') {
        return key;
    }

    const hashIndex = key.lastIndexOf('#');

    return hashIndex === -1 ? key : key.slice(0, hashIndex);
}

function stringLiteral(value) {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
