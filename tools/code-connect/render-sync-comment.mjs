#!/usr/bin/env node

import fs from 'node:fs';

import {renderFigmaSyncComment} from './lib.mjs';

const [reportPath, commentPath] = process.argv.slice(2);

try {
    if (!reportPath || !commentPath) {
        throw new Error('Usage: render-sync-comment.mjs <report-json-path> <comment-md-path>');
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    validateReport(report);
    fs.writeFileSync(commentPath, renderFigmaSyncComment(report));
    process.stdout.write(`${report.status}\n`);
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
}

function validateReport(report) {
    if (!report || typeof report !== 'object' || Array.isArray(report)) {
        throw new Error('Sync report must be an object');
    }

    if (!['ok', 'drift', 'error'].includes(report.status)) {
        throw new Error(`Unsupported sync report status: ${String(report.status)}`);
    }

    if (typeof report.componentsChecked !== 'number') {
        throw new Error('Sync report componentsChecked must be a number');
    }

    if (!Array.isArray(report.messages)) {
        throw new Error('Sync report messages must be an array');
    }
}
