// frontend/src/utils/pathUtils.js
const path = {
    extname: (p) => {
        if (!p) return '';
        const lastDot = p.lastIndexOf('.');
        return lastDot === -1 ? '' : p.substring(lastDot);
    },
    basename: (p, ext) => {
        if (!p) return '';
        const lastSlash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
        let base = p.substring(lastSlash + 1);
        if (ext && base.endsWith(ext)) {
            base = base.substring(0, base.length - ext.length);
        }
        return base;
    },
    dirname: (p) => {
        if (!p) return '';
        const lastSlash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
        if (lastSlash === -1) return '.';
        if (lastSlash === 0 && (p.startsWith('/') || p.startsWith('\\'))) return p.substring(0,1) ; // Root directory like '/' or '\'
        return p.substring(0, lastSlash);
    },
    join: (...args) => {
        const parts = args.filter(arg => typeof arg === 'string' && arg !== null && arg !== undefined && arg !== '');
        if (parts.length === 0) return '.';
        let joined = parts.join('/');
        joined = joined.replace(/\\/g, '/').replace(/\/+/g, '/');
        if (joined !== '/' && joined.endsWith('/')) { // Avoid double slash at end unless it's root
            joined = joined.slice(0, -1);
        }
        return joined;
    },
    relative: (from, to) => {
        if (!from || !to) return to || '';
        
        // Normalize paths to use forward slashes
        from = from.replace(/\\/g, '/');
        to = to.replace(/\\/g, '/');
        
        // Remove trailing slashes
        from = from.replace(/\/+$/, '');
        to = to.replace(/\/+$/, '');
        
        // If they're the same, return empty string
        if (from === to) return '';
        
        // Split paths into parts
        const fromParts = from.split('/').filter(part => part !== '');
        const toParts = to.split('/').filter(part => part !== '');
        
        // Find common prefix
        let commonLength = 0;
        const minLength = Math.min(fromParts.length, toParts.length);
        for (let i = 0; i < minLength; i++) {
            if (fromParts[i] === toParts[i]) {
                commonLength++;
            } else {
                break;
            }
        }
        
        // Build relative path
        const upSteps = fromParts.length - commonLength;
        const downParts = toParts.slice(commonLength);
        
        const relativeParts = [];
        for (let i = 0; i < upSteps; i++) {
            relativeParts.push('..');
        }
        relativeParts.push(...downParts);
        
        return relativeParts.length > 0 ? relativeParts.join('/') : '.';
    }
};

export default path;