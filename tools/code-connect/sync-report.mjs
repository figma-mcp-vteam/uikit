import {formatFigmaPropertyDefinitionDiffs, normalizeFigmaPropertyDefinitions} from './figma-properties.mjs';
import {normalizeNodeId} from './template-generator.mjs';

export const CODE_CONNECT_SYNC_COMMENT_MARKER = '<!-- code-connect-sync -->';

export function createFigmaSyncReport(registry, nodesById = {}) {
    const messages = [];
    let componentsChecked = 0;
    let hasError = false;

    for (const component of registry.components || []) {
        const nodeId = normalizeNodeId(component.nodeId);
        const node = nodesById[nodeId]?.document;

        if (!node) {
            hasError = true;
            messages.push(`${component.id}: node ${nodeId} was not found in Figma`);
            continue;
        }

        if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
            hasError = true;
            messages.push(
                `${component.id}: node ${nodeId} is ${node.type}, expected COMPONENT or COMPONENT_SET`,
            );
            continue;
        }

        componentsChecked++;

        const liveProperties = normalizeFigmaPropertyDefinitions(node.componentPropertyDefinitions);
        messages.push(
            ...formatFigmaPropertyDefinitionDiffs(
                component.id,
                component.figmaProperties,
                liveProperties,
            ),
        );
    }

    return {
        status: hasError ? 'error' : messages.length > 0 ? 'drift' : 'ok',
        componentsChecked,
        messages,
    };
}

export function createFigmaSyncErrorReport(messages, componentsChecked = 0) {
    return {
        status: 'error',
        componentsChecked,
        messages: Array.isArray(messages) ? messages : [messages],
    };
}

export function formatFigmaSyncReport(report, {format = 'text'} = {}) {
    if (format === 'json') {
        return `${JSON.stringify(report, null, 2)}\n`;
    }

    return report.messages.length > 0 ? `${report.messages.join('\n')}\n` : '';
}

export function getFigmaSyncExitCode(report, {failOnDrift = true} = {}) {
    if (report.status === 'error') {
        return 1;
    }

    if (report.status === 'drift') {
        return failOnDrift ? 1 : 0;
    }

    return 0;
}

export function renderFigmaSyncComment(report) {
    const title =
        report.status === 'error'
            ? '### Code Connect ↔ Figma sync failed'
            : '### Code Connect ↔ Figma drift detected';
    const details =
        report.messages.length > 0
            ? ['```text', ...report.messages, '```'].join('\n')
            : 'No drift details were reported.';
    const resolution =
        report.status === 'error'
            ? [
                  'How to resolve:',
                  '- Check `FIGMA_ACCESS_TOKEN`, Figma API access, and registry validity.',
                  '- Re-run the workflow after the infrastructure issue is fixed.',
              ]
            : [
                  'How to resolve:',
                  '- If the Figma change is intentional, update `figma/code-connect/registry.json` and run `npm run code-connect:generate`.',
                  '- If the registry is still correct, fix the Figma component properties.',
              ];

    return [
        CODE_CONNECT_SYNC_COMMENT_MARKER,
        title,
        '',
        `Checked components: ${report.componentsChecked}`,
        '',
        details,
        '',
        ...resolution,
        '',
    ].join('\n');
}
