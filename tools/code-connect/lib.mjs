export {
    FIGMA_CONFIG_PATH,
    GENERATED_DIR,
    REGISTRY_PATH,
    ROOT_DIR,
    isPathInside,
    resolveContainedPath,
    resolveGeneratedFilePath,
} from './paths.mjs';
export {isRecord, stableStringify} from './json-utils.mjs';
export {
    formatFigmaPropertyDefinitionDiffs,
    getFigmaProperty,
    getFigmaPropertyDefinitionDiffs,
    normalizeFigmaPropertyDefinitions,
} from './figma-properties.mjs';
export {getComponentProps} from './code-props.mjs';
export {readJson, readRegistry, validateRegistry} from './registry.mjs';
export {
    generateAll,
    generateComponentTemplate,
    getCodeSourceUrl,
    getExpectedGeneratedFiles,
    getFigmaNodeUrl,
    getGeneratedFilePath,
    getUnexpectedGeneratedFiles,
    normalizeNodeId,
    writeGeneratedFiles,
} from './template-generator.mjs';
