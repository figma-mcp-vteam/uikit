import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';

import {ROOT_DIR} from './paths.mjs';

const require = createRequire(import.meta.url);
const docgen = require('react-docgen-typescript');

const parser = docgen.withCustomConfig(path.join(ROOT_DIR, 'tsconfig.json'), {
    savePropValueAsString: true,
});

export function getComponentProps(sourcePath, componentName) {
    const docs = parser.parse(sourcePath);
    const doc = docs.find((item) => item.displayName === componentName);
    const props = new Set(Object.keys(doc?.props || {}));
    const source = fs.readFileSync(sourcePath, 'utf8');

    if (/\bchildren\??\s*:\s*React\.ReactNode/.test(source)) {
        props.add('children');
    }

    return props;
}
