import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '../..');
export const REGISTRY_PATH = path.join(ROOT_DIR, 'figma/code-connect/registry.json');
export const GENERATED_DIR = path.join(ROOT_DIR, 'figma/code-connect/generated');
export const FIGMA_CONFIG_PATH = path.join(ROOT_DIR, 'figma.config.json');

export function resolveGeneratedFilePath(generatedDir, generatedFile) {
    if (typeof generatedFile !== 'string') {
        throw new Error('generatedFile must be a string');
    }

    if (path.basename(generatedFile) !== generatedFile || generatedFile.includes('\\')) {
        throw new Error(`generatedFile must be a file name, not a path: ${generatedFile}`);
    }

    return resolveContainedPath(generatedDir, generatedFile, 'generatedFile');
}

export function resolveContainedPath(baseDir, relativePath, label) {
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

export function isPathInside(filePath, directoryPath) {
    const relativePath = path.relative(directoryPath, filePath);

    return (
        relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
    );
}

function formatBasePath(basePath) {
    return basePath === ROOT_DIR ? 'repository root' : path.relative(ROOT_DIR, basePath);
}
