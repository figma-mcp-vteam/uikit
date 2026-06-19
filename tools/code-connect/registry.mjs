import fs from 'node:fs';

import {getComponentProps} from './code-props.mjs';
import {getFigmaProperty} from './figma-properties.mjs';
import {isRecord} from './json-utils.mjs';
import {
    GENERATED_DIR,
    REGISTRY_PATH,
    ROOT_DIR,
    resolveContainedPath,
    resolveGeneratedFilePath,
} from './paths.mjs';

export function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function readRegistry(filePath = REGISTRY_PATH) {
    return readJson(filePath);
}

export function validateRegistry(registry) {
    const errors = [];

    if (!isRecord(registry)) {
        errors.push('registry must be an object');
        return errors;
    }

    if (registry.version !== 1) {
        errors.push('registry.version must be 1');
    }

    if (!registry.figmaFileKey) {
        errors.push('registry.figmaFileKey is required');
    }

    if (registry.sourceRepositoryUrl) {
        try {
            const url = new URL(registry.sourceRepositoryUrl);

            if (url.protocol !== 'https:' && url.protocol !== 'http:') {
                errors.push('registry.sourceRepositoryUrl must be an http(s) URL');
            }
        } catch {
            errors.push('registry.sourceRepositoryUrl must be an http(s) URL');
        }
    } else {
        errors.push('registry.sourceRepositoryUrl is required');
    }

    if (!registry.sourceBranch) {
        errors.push('registry.sourceBranch is required');
    }

    if (!Array.isArray(registry.components)) {
        errors.push('registry.components must be an array');
        return errors;
    }

    validateUnique(
        registry.components.map((component) => component.id),
        'component id',
        errors,
    );
    validateUnique(
        registry.components.map(
            (component) => component.generatedFile || `${component.name}.figma.ts`,
        ),
        'generated file',
        errors,
    );

    for (const component of registry.components) {
        validateComponent(component, errors);
    }

    return errors;
}

function validateComponent(component, errors) {
    const context = component.id || component.name || '<unknown>';

    for (const field of ['id', 'name', 'nodeId', 'source', 'importStatement']) {
        if (!component[field]) {
            errors.push(`${context}: ${field} is required`);
        }
    }

    validateGeneratedFile(component, context, errors);

    const sourcePath = getSourcePath(component, context, errors);
    const availableProps = sourcePath ? getComponentProps(sourcePath, component.name) : undefined;

    if (!isRecord(component.figmaProperties)) {
        errors.push(`${context}: figmaProperties must be an object`);
    }

    const figmaProperties = isRecord(component.figmaProperties) ? component.figmaProperties : {};
    validateUnique(
        Object.values(figmaProperties).map((property) => property.name),
        `${context} Figma property display name`,
        errors,
    );

    if (!Array.isArray(component.inputs)) {
        errors.push(`${context}: inputs must be an array`);
    }

    for (const input of Array.isArray(component.inputs) ? component.inputs : []) {
        validateInput(input, figmaProperties, context, errors);
    }

    const example = isRecord(component.example) ? component.example : undefined;

    if (!example) {
        errors.push(`${context}: example must be an object`);
    }

    const exampleProps = example?.props;

    if (exampleProps !== undefined && !Array.isArray(exampleProps)) {
        errors.push(`${context}: example.props must be an array`);
    }

    for (const prop of Array.isArray(exampleProps) ? exampleProps : []) {
        if (!availableProps) {
            continue;
        }

        if (!availableProps.has(prop.prop)) {
            errors.push(`${context}: unknown code prop "${prop.prop}"`);
        }
    }

    if (example?.children && availableProps && !availableProps.has('children')) {
        errors.push(`${context}: unknown code prop "children"`);
    }
}

function validateInput(input, figmaProperties, context, errors) {
    if (!isRecord(input)) {
        errors.push(`${context}: input must be an object`);
        return;
    }

    if (input.kind === 'literal') {
        return;
    }

    const property = getFigmaProperty(figmaProperties, input.figma);

    if (!property) {
        errors.push(`${context}: missing Figma property "${input.figma}"`);
        return;
    }

    if (input.kind === 'enum') {
        if (property.type !== 'VARIANT') {
            errors.push(`${context}: "${input.figma}" must be a VARIANT property`);
            return;
        }

        if (!isRecord(input.values)) {
            errors.push(`${context}: "${input.figma}" enum values must be an object`);
            return;
        }

        validateEnumMapping(input, property, context, errors);
        return;
    }

    if (input.kind === 'boolean' && property.type !== 'BOOLEAN') {
        errors.push(`${context}: "${input.figma}" must be a BOOLEAN property`);
    }

    if (input.kind === 'text' && property.type !== 'TEXT') {
        errors.push(`${context}: "${input.figma}" must be a TEXT property`);
    }
}

function validateEnumMapping(input, property, context, errors) {
    const expected = property.variantOptions || [];
    const actual = Object.keys(input.values || {});
    const missing = expected.filter((value) => !actual.includes(value));
    const extra = actual.filter((value) => !expected.includes(value));

    if (missing.length > 0 || extra.length > 0) {
        errors.push(
            `${context}: "${input.figma}" enum mapping mismatch; missing [${missing.join(
                ', ',
            )}], extra [${extra.join(', ')}]`,
        );
    }
}

function validateUnique(values, label, errors) {
    const seen = new Set();

    for (const value of values) {
        if (!value) {
            continue;
        }

        if (seen.has(value)) {
            errors.push(`duplicate ${label}: ${value}`);
        }

        seen.add(value);
    }
}

function validateGeneratedFile(component, context, errors) {
    try {
        resolveGeneratedFilePath(
            GENERATED_DIR,
            component.generatedFile || `${component.name}.figma.ts`,
        );
    } catch (error) {
        errors.push(`${context}: ${error.message}`);
    }
}

function getSourcePath(component, context, errors) {
    if (!component.source) {
        return undefined;
    }

    let sourcePath;

    try {
        sourcePath = resolveContainedPath(ROOT_DIR, component.source, 'source');
    } catch (error) {
        errors.push(`${context}: ${error.message}`);
        return undefined;
    }

    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
        errors.push(`${context}: source file does not exist: ${component.source}`);
        return undefined;
    }

    return sourcePath;
}
