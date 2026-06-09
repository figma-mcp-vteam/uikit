import fs from 'node:fs';
import path from 'node:path';

import {GENERATED_DIR, ROOT_DIR, resolveGeneratedFilePath} from './paths.mjs';

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

export function getCodeSourceUrl(registry, component) {
    if (!registry.sourceRepositoryUrl) {
        return component.source;
    }

    const repositoryUrl = registry.sourceRepositoryUrl.replace(/\.git$/, '').replace(/\/$/, '');
    const branch = registry.sourceBranch || 'main';
    const sourcePath = component.source.replaceAll('\\', '/').replace(/^\/+/, '');

    return `${repositoryUrl}/blob/${branch}/${sourcePath}`;
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
    const source = getCodeSourceUrl(registry, component);
    const inputLines = component.inputs.flatMap((input) => renderInput(input));
    const derivedLines = (component.derived || []).map(
        (derived) => `const ${derived.name} = ${derived.expression};`,
    );

    return [
        `// url=${url}`,
        `// source=${source}`,
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
    const propFragments = props.map(
        (prop) => `\${figma.helpers.react.renderProp(${stringLiteral(prop.prop)}, ${prop.value})}`,
    );

    if (component.example.children) {
        return [
            '',
            `<${componentName}${propFragments.join('')}>`,
            `    \${figma.helpers.react.renderChildren(${component.example.children})}`,
            `</${componentName}>`,
        ].join('\n');
    }

    return ['', `<${componentName}${propFragments.join('')} />`].join('\n');
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
