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
    }
};

export default path;