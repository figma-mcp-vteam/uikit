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

    return `https://www.figma.com/design/${registry.figmaFileKey}/${encodeURIComponent(
        fileName,
    )}?node-id=${nodeId}`;
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

export function getGeneratedFilePath(component, generatedDir = GENERATED_DIR) {
    const generatedFile = component.generatedFile || `${component.name}.figma.ts`;

    return resolveGeneratedFilePath(generatedDir, generatedFile);
}

export function getExpectedGeneratedFiles(registry, generatedDir = GENERATED_DIR) {
    return registry.components.map((component) => getGeneratedFilePath(component, generatedDir));
}

export function generateAll(registry, generatedDir = GENERATED_DIR) {
    return new Map(
        registry.components.map((component) => [
            getGeneratedFilePath(component, generatedDir),
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

export function getUnexpectedGeneratedFiles(registry, generatedDir = GENERATED_DIR) {
    const expectedFiles = new Set(getExpectedGeneratedFiles(registry, generatedDir));

    return listGeneratedTemplateFiles(generatedDir).filter(
        (filePath) => !expectedFiles.has(filePath),
    );
}

export function writeGeneratedFiles(registry, {check = false, generatedDir = GENERATED_DIR} = {}) {
    const generated = generateAll(registry, generatedDir);
    const unexpectedFiles = getUnexpectedGeneratedFiles(registry, generatedDir);
    const errors = [];

    if (check) {
        errors.push(...unexpectedFiles.map((filePath) => path.relative(ROOT_DIR, filePath)));
    } else {
        fs.mkdirSync(generatedDir, {recursive: true});

        for (const filePath of unexpectedFiles) {
            fs.unlinkSync(filePath);
        }
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

export function stableStringify(value) {
    return JSON.stringify(sortJson(value));
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

function resolveGeneratedFilePath(generatedDir, generatedFile) {
    if (typeof generatedFile !== 'string') {
        throw new Error('generatedFile must be a string');
    }

    if (path.basename(generatedFile) !== generatedFile || generatedFile.includes('\\')) {
        throw new Error(`generatedFile must be a file name, not a path: ${generatedFile}`);
    }

    return resolveContainedPath(generatedDir, generatedFile, 'generatedFile');
}

function resolveContainedPath(baseDir, relativePath, label) {
    if (typeof relativePath !== 'string') {
        throw new Error(`${label} must be a string`);
    }

    if (path.isAbsolute(relativePath)) {
        throw new Error(`${label} must be relative: ${relativePath}`);
    }

    const basePath = path.resolve(baseDir);
    const resolvedPath = path.resolve(basePath, relativePath);

    if (!isPathInside(resolvedPath, basePath)) {
        throw new Error(`${label} must stay inside ${formatBasePath(basePath)}: ${relativePath}`);
    }

    return resolvedPath;
}

function isPathInside(filePath, directoryPath) {
    const relativePath = path.relative(directoryPath, filePath);

    return (
        relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
    );
}

function formatBasePath(basePath) {
    return basePath === ROOT_DIR ? 'repository root' : path.relative(ROOT_DIR, basePath);
}

function listGeneratedTemplateFiles(generatedDir) {
    if (!fs.existsSync(generatedDir)) {
        return [];
    }

    return fs
        .readdirSync(generatedDir, {withFileTypes: true})
        .filter((entry) => entry.isFile() && entry.name.endsWith('.figma.ts'))
        .map((entry) => path.join(generatedDir, entry.name))
        .sort();
}

function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sortJson(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sortJson(item));
    }

    if (isRecord(value)) {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, sortJson(value[key])]),
        );
    }

    return value;
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
