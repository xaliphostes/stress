export function trimAll(s: string) {
    return s
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/, '')
        .replace('\t', ' ')
        .trimEnd()
}
