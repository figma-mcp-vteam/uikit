import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const docgen = require('react-docgen-typescript');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '../..');
export const REGISTRY_PATH = path.join(ROOT_DIR, 'figma/code-connect/registry.json');
export const GENERATED_DIR = path.join(ROOT_DIR, 'figma/code-connect/generated');
export const FIGMA_CONFIG_PATH = path.join(ROOT_DIR, 'figma.config.json');

const parser = docgen.withCustomConfig(path.join(ROOT_DIR, 'tsconfig.json'), {
    savePropValueAsString: true,
});

export function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function readRegistry(filePath = REGISTRY_PATH) {
    return readJson(filePath);
}

export function normalizeNodeId(nodeId) {
    return nodeId.replace(/-/g, ':');
}

export function getFigmaNodeUrl(registry, component) {
    const nodeId = encodeURIComponent(normalizeNodeId(component.nodeId));
    const fileName = registry.figmaFileName || 'Code-Connect';

    return `https://www.figma.com/design/${registry.figmaFileKey}/${fileName}?node-id=${nodeId}`;
}

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

export function getGeneratedFilePath(component) {
    return path.join(GENERATED_DIR, component.generatedFile || `${component.name}.figma.ts`);
}

export function getExpectedGeneratedFiles(registry) {
    return registry.components.map((component) => getGeneratedFilePath(component));
}

export function generateAll(registry) {
    return new Map(
        registry.components.map((component) => [
            getGeneratedFilePath(component),
            generateComponentTemplate(registry, component),
        ]),
    );
}

export function generateComponentTemplate(registry, component) {
    const url = getFigmaNodeUrl(registry, component);
    const inputLines = component.inputs.flatMap((input) => renderInput(input));
    const derivedLines = (component.derived || []).map(
        (derived) => `const ${derived.name} = ${derived.expression};`,
    );

    return [
        `// url=${url}`,
        `// source=${component.source}`,
        `// component=${component.name}`,
        "import figma from 'figma';",
        '',
        'const instance = figma.selectedInstance;',
        ...inputLines,
        ...derivedLines,
        '',
        'export default {',
        `    id: ${stringLiteral(component.id)},`,
        `    imports: [${JSON.stringify(component.importStatement)}],`,
        `    example: figma.tsx\`${renderExample(component)}\`,`,
        '    metadata: {nestable: true},',
        '};',
        '',
    ].join('\n');
}

export function writeGeneratedFiles(registry, {check = false} = {}) {
    const generated = generateAll(registry);
    const errors = [];

    if (!check) {
        fs.mkdirSync(GENERATED_DIR, {recursive: true});
    }

    for (const [filePath, content] of generated) {
        if (check) {
            const currentContent = fs.existsSync(filePath)
                ? fs.readFileSync(filePath, 'utf8')
                : undefined;

            if (currentContent !== content) {
                errors.push(path.relative(ROOT_DIR, filePath));
            }
        } else {
            fs.writeFileSync(filePath, content);
        }
    }

    return errors;
}

export function validateRegistry(registry) {
    const errors = [];

    if (registry.version !== 1) {
        errors.push('registry.version must be 1');
    }

    if (!registry.figmaFileKey) {
        errors.push('registry.figmaFileKey is required');
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

    const sourcePath = path.join(ROOT_DIR, component.source || '');

    if (!fs.existsSync(sourcePath)) {
        errors.push(`${context}: source file does not exist: ${component.source}`);
    }

    const availableProps = fs.existsSync(sourcePath)
        ? getComponentProps(sourcePath, component.name)
        : new Set();

    const figmaProperties = component.figmaProperties || {};
    validateUnique(
        Object.values(figmaProperties).map((property) => property.name),
        `${context} Figma property display name`,
        errors,
    );

    for (const input of component.inputs || []) {
        validateInput(input, figmaProperties, context, errors);
    }

    for (const prop of component.example?.props || []) {
        if (!availableProps.has(prop.prop)) {
            errors.push(`${context}: unknown code prop "${prop.prop}"`);
        }
    }

    if (component.example?.children && !availableProps.has('children')) {
        errors.push(`${context}: unknown code prop "children"`);
    }
}

function validateInput(input, figmaProperties, context, errors) {
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

function getComponentProps(sourcePath, componentName) {
    const docs = parser.parse(sourcePath);
    const doc = docs.find((item) => item.displayName === componentName);
    const props = new Set(Object.keys(doc?.props || {}));
    const source = fs.readFileSync(sourcePath, 'utf8');

    if (/\bchildren\??\s*:\s*React\.ReactNode/.test(source)) {
        props.add('children');
    }

    return props;
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

function getFigmaProperty(figmaProperties, name) {
    const matches = Object.entries(figmaProperties).filter(
        ([key, property]) => key === name || property.name === name,
    );

    return matches.length === 1 ? matches[0][1] : undefined;
}

function getFigmaPropertyDisplayName(key, definition) {
    if (definition.type === 'VARIANT') {
        return key;
    }

    const hashIndex = key.lastIndexOf('#');

    return hashIndex === -1 ? key : key.slice(0, hashIndex);
}

function renderInput(input) {
    switch (input.kind) {
        case 'enum':
            return [
                `const ${input.name} = instance.getEnum(${stringLiteral(
                    input.figma,
                )}, ${renderObject(input.values)});`,
            ];
        case 'boolean':
            return [`const ${input.name} = instance.getBoolean(${stringLiteral(input.figma)});`];
        case 'text': {
            const fallback = input.fallback ? ` || ${stringLiteral(input.fallback)}` : '';

            return [
                `const ${input.name} = instance.getString(${stringLiteral(input.figma)})${fallback};`,
            ];
        }
        case 'literal':
            return [`const ${input.name} = ${renderLiteral(input.value)};`];
        default:
            throw new Error(`Unsupported input kind: ${input.kind}`);
    }
}

function renderObject(values) {
    const entries = Object.entries(values).map(
        ([key, value]) => `${stringLiteral(key)}: ${renderLiteral(value)}`,
    );

    return `{${entries.join(', ')}}`;
}

function renderExample(component) {
    const componentName = component.example.component || component.name;
    const props = component.example.props || [];
    const propLines = props.map((prop) => `    ${prop.prop}=\${${prop.value}}`);

    if (component.example.children) {
        return [
            '',
            `<${componentName}`,
            ...propLines,
            '>',
            `    \${${component.example.children}}`,
            `</${componentName}>`,
        ].join('\n');
    }

    return ['', `<${componentName}`, ...propLines, '/>'].join('\n');
}

function renderLiteral(value) {
    if (typeof value === 'string') {
        return stringLiteral(value);
    }

    if (value === undefined) {
        return 'undefined';
    }

    return JSON.stringify(value);
}

function stringLiteral(value) {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
