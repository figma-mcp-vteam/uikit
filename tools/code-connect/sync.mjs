#!/usr/bin/env node

import fs from 'node:fs';

import {
    createFigmaSyncErrorReport,
    createFigmaSyncReport,
    formatFigmaSyncReport,
    getFigmaSyncExitCode,
    normalizeNodeId,
    readRegistry,
    validateRegistry,
} from './lib.mjs';

const options = parseArgs(process.argv.slice(2));
let report;

try {
    const token = process.env.FIGMA_ACCESS_TOKEN;

    if (!token) {
        report = createFigmaSyncErrorReport(
            'FIGMA_ACCESS_TOKEN is required for Code Connect sync.',
        );
        finish(report, options);
    }

    const registry = readRegistry();
    const validationErrors = validateRegistry(registry);

    if (validationErrors.length > 0) {
        report = createFigmaSyncErrorReport(validationErrors);
        finish(report, options);
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
        report = createFigmaSyncErrorReport(
            `Failed to fetch Figma nodes: ${response.status} ${response.statusText}`,
        );
        finish(report, options);
    }

    const data = await response.json();
    report = createFigmaSyncReport(registry, data.nodes);
} catch (error) {
    report = createFigmaSyncErrorReport(error instanceof Error ? error.message : String(error));
}

finish(report, options);

function parseArgs(args) {
    const parsed = {
        failOnDrift: true,
        format: 'text',
        output: undefined,
    };

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        if (arg === '--no-fail-on-drift') {
            parsed.failOnDrift = false;
            continue;
        }

        if (arg.startsWith('--format=')) {
            parsed.format = arg.slice('--format='.length);
            continue;
        }

        if (arg === '--format') {
            parsed.format = readRequiredArg(args, ++index, '--format');
            continue;
        }

        if (arg.startsWith('--output=')) {
            parsed.output = arg.slice('--output='.length);
            continue;
        }

        if (arg === '--output') {
            parsed.output = readRequiredArg(args, ++index, '--output');
            continue;
        }

        throw new Error(`Unsupported option: ${arg}`);
    }

    if (parsed.format !== 'text' && parsed.format !== 'json') {
        throw new Error(`Unsupported --format value: ${parsed.format}`);
    }

    return parsed;
}

function readRequiredArg(args, index, option) {
    const value = args[index];

    if (!value || value.startsWith('--')) {
        throw new Error(`${option} requires a value`);
    }

    return value;
}

function finish(syncReport, {failOnDrift, format, output}) {
    const content = formatFigmaSyncReport(syncReport, {format});

    if (output) {
        fs.writeFileSync(output, content);
    } else if (content) {
        const stream = format === 'json' ? process.stdout : process.stderr;

        stream.write(content);
    }

    process.exit(getFigmaSyncExitCode(syncReport, {failOnDrift}));
}
