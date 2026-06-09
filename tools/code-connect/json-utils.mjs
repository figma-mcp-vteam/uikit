export function stableStringify(value) {
    return JSON.stringify(sortJson(value));
}

export function isRecord(value) {
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
