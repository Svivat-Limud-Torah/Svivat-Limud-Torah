// backend/server.js
const express = require('express');
const cron = require('node-cron'); // For scheduling
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs'); // For sync operations like existsSync
const path = require('path');
const readline = require('readline');
const dbOperations = require('./database');
const { performSearchV2 } = require('./searchLogicV2');
const questionnaireService = require('./services/QuestionnaireService');
const learningGraphService = require('./services/LearningGraphService');
const pilpultaRoutes = require('./routes/pilpultaRoutes'); // Import Pilpulta routes
const smartSearchRoutes = require('./routes/smartSearchRoutes'); // Import Smart Search routes
const textOrganizationRoutes = require('./routes/textOrganizationRoutes'); // Import Text Organization routes
const userDataService = require('./services/UserDataService'); // To be created
const fileConversionService = require('./services/FileConversionService'); // Import File Conversion service

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Ensure body parsing middleware is before routes

const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
const ALLOWED_EXTENSIONS_FOR_SEARCH = ['.txt', '.md', '.json', '.js', '.jsx', '.html', '.css'];
const STYLES_SUFFIX = '.styles.json';

async function getUpdatedDirectoryStructure(folderPath) {
    if (!folderPath || !fsSync.existsSync(folderPath)) {
        console.warn(`Attempted to refresh non-existent folder: ${folderPath}`);
        return null;
    }
    const folderStat = await fs.stat(folderPath);
    if (!folderStat.isDirectory()) {
        console.warn(`Attempted to refresh non-directory path: ${folderPath}`);
        return null;
    }
    return readDirectoryRecursive(folderPath, folderPath);
}

app.get('/api/hello', (req, res) => res.json({ message: 'שלום מהשרת! החיבור הצליח.' }));

app.post('/api/open-folder', async (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath) return res.status(400).json({ error: 'נתיב תיקייה חסר' });
    try {
        await fs.access(folderPath);
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) return res.status(400).json({ error: `הנתיב '${folderPath}' אינו תיקייה.`});
        const directoryStructure = await readDirectoryRecursive(folderPath, folderPath);
        res.json(directoryStructure);
    } catch (error) {
        console.error('שגיאה בפתיחת תיקייה:', error);
        if (error.code === 'ENOENT') return res.status(404).json({ error: `התיקייה '${folderPath}' לא נמצאה.` });
        if (error.code === 'EPERM' || error.code === 'EACCES') return res.status(403).json({ error: `אין הרשאת גישה לתיקייה '${folderPath}'.` });
        res.status(500).json({ error: 'שגיאה בקריאת תוכן התיקייה' });
    }
});

async function readDirectoryRecursive(dirPath, basePath) {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true });
    const items = await Promise.all(
        dirents.map(async (dirent) => {
            const absolutePath = path.join(dirPath, dirent.name);
            const relativePath = path.relative(basePath, absolutePath).replace(/\\/g, '/');
            const ext = path.extname(dirent.name).toLowerCase();

            if (dirent.name.endsWith(STYLES_SUFFIX)) {
                return null;
            }

            let itemType = 'file';
            if (dirent.isDirectory()) itemType = 'folder';
            else if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) itemType = 'image';

            const item = { name: dirent.name, path: relativePath, isFolder: dirent.isDirectory(), type: itemType, };
            if (dirent.isDirectory()) item.children = await readDirectoryRecursive(absolutePath, basePath);
            return item;
        })
    );
    return items.filter(item => item !== null).sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        if (a.type === b.type) return a.name.localeCompare(b.name, 'he');
        const typeOrder = { folder: 0, image: 1, file: 2 };
        return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    });
}

app.post('/api/file-content', async (req, res) => {
    const { baseFolderPath, relativeFilePath, fileName } = req.body;
    if (!baseFolderPath || !relativeFilePath || !fileName) return res.status(400).json({ error: 'נתיב תיקיית בסיס, נתיב קובץ יחסי או שם קובץ חסרים.' });

    const resolvedBase = path.resolve(baseFolderPath);
    const absoluteFilePath = path.resolve(resolvedBase, relativeFilePath);
    const stylesFilePath = absoluteFilePath + STYLES_SUFFIX;

    try {
        if (!absoluteFilePath.startsWith(resolvedBase)) return res.status(403).json({ error: 'גישה לקובץ נדחתה (מחוץ לתיקיית הבסיס).' });
        await fs.access(absoluteFilePath);
        const stats = await fs.stat(absoluteFilePath);
        if (stats.isDirectory()) return res.status(400).json({ error: `'${relativeFilePath}' הוא תיקייה, לא קובץ.`});

        const ext = path.extname(fileName).toLowerCase();
        if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
            dbOperations.recordFileUsage(baseFolderPath, relativeFilePath, fileName);
            return res.json({ message: 'קובץ תמונה. השתמש ב-API ייעודי לתמונות.', type: 'image', styles: [] });
        }

        const content = await fs.readFile(absoluteFilePath, 'utf-8');
        let styles = [];
        try {
            await fs.access(stylesFilePath);
            const stylesContent = await fs.readFile(stylesFilePath, 'utf-8');
            const parsedStylesContainer = JSON.parse(stylesContent);
            if (parsedStylesContainer && Array.isArray(parsedStylesContainer.styles)) {
                styles = parsedStylesContainer.styles;
            } else if (Array.isArray(parsedStylesContainer)) {
                 styles = parsedStylesContainer;
            }
        } catch (styleError) {
            if (styleError.code !== 'ENOENT') {
                console.warn(`שגיאה בקריאת קובץ סגנונות '${stylesFilePath}': ${styleError.message}`);
            }
        }

        dbOperations.recordFileUsage(baseFolderPath, relativeFilePath, fileName);
        res.json({ content, type: 'file', styles });
    } catch (error) {
        console.error(`שגיאה בקריאת הקובץ '${absoluteFilePath}':`, error);
        if (error.code === 'ENOENT') return res.status(404).json({ error: `הקובץ '${relativeFilePath}' לא נמצא.` });
        if (error.code === 'EPERM' || error.code === 'EACCES') return res.status(403).json({ error: `אין הרשאת גישה לקובץ '${relativeFilePath}'.` });
        res.status(500).json({ error: 'שגיאה בקריאת הקובץ.' });
    }
});

app.get('/api/image-content', async (req, res) => {
    const { baseFolderPath, relativeFilePath } = req.query;
    if (!baseFolderPath || !relativeFilePath) return res.status(400).json({ error: 'נתיב תיקיית בסיס או נתיב קובץ יחסי חסרים.' });

    const resolvedBase = path.resolve(baseFolderPath);
    const absoluteFilePath = path.resolve(resolvedBase, relativeFilePath);

    try {
        if (!absoluteFilePath.startsWith(resolvedBase)) return res.status(403).json({ error: 'גישה לקובץ תמונה נדחתה.' });
        await fs.access(absoluteFilePath);
        const stats = await fs.stat(absoluteFilePath);
        if (stats.isDirectory()) return res.status(400).json({ error: `'${relativeFilePath}' הוא תיקייה.` });
        const ext = path.extname(relativeFilePath).toLowerCase();
        if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) return res.status(400).json({ error: `הקובץ '${relativeFilePath}' אינו קובץ תמונה נתמך.` });

        const imageData = await fs.readFile(absoluteFilePath);
        let mimeType = 'application/octet-stream';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.svg') mimeType = 'image/svg+xml';
        else if (ext === '.bmp') mimeType = 'image/bmp';
        else if (ext === '.ico') mimeType = 'image/x-icon';
        res.setHeader('Content-Type', mimeType);
        res.send(imageData);
    } catch (error) {
        console.error(`שגיאה בקריאת קובץ תמונה '${absoluteFilePath}':`, error);
        if (error.code === 'ENOENT') return res.status(404).json({ error: `קובץ התמונה '${relativeFilePath}' לא נמצא.` });
        if (error.code === 'EPERM' || error.code === 'EACCES') return res.status(403).json({ error: `אין הרשאת גישה לקובץ התמונה '${relativeFilePath}'.` });
        res.status(500).json({ error: 'שגיאה בקריאת קובץ התמונה.' });
    }
});

app.post('/api/save-file', async (req, res) => {
    const { baseFolderPath, relativeFilePath, content, fileName, styles } = req.body;
    if (!baseFolderPath || !relativeFilePath || content === undefined || !fileName) return res.status(400).json({ error: 'מידע חסר לשמירת קובץ.' });

    const resolvedBase = path.resolve(baseFolderPath);
    const absoluteFilePath = path.resolve(resolvedBase, relativeFilePath);
    const stylesFilePath = absoluteFilePath + STYLES_SUFFIX;

    try {
        if (!absoluteFilePath.startsWith(resolvedBase)) return res.status(403).json({ error: 'שמירת קובץ נדחתה (מחוץ לתיקיית הבסיס).' });

        await fs.writeFile(absoluteFilePath, content, 'utf-8');

        if (styles && Array.isArray(styles)) {
            const stylesToSave = JSON.stringify({ version: 1, styles: styles }, null, 2);
            await fs.writeFile(stylesFilePath, stylesToSave, 'utf-8');
        }

        dbOperations.recordFileUsage(baseFolderPath, relativeFilePath, fileName);
        res.json({ message: `הקובץ '${relativeFilePath}' נשמר בהצלחה.` });
    } catch (error) {
        console.error(`שגיאה בשמירת הקובץ '${absoluteFilePath}' או סגנונותיו:`, error);
        if (error.code === 'EPERM' || error.code === 'EACCES') return res.status(403).json({ error: `אין הרשאת כתיבה לקובץ '${relativeFilePath}'.` });
        res.status(500).json({ error: 'שגיאה בשמירת הקובץ.' });
    }
});

app.post('/api/create-file', async (req, res) => {
    const { baseFolderPath, newFilePath, content } = req.body;
    if (!baseFolderPath || !newFilePath) return res.status(400).json({ error: 'מידע חסר ליצירת קובץ.' });

    const resolvedBase = path.resolve(baseFolderPath);
    const absoluteNewFilePath = path.resolve(resolvedBase, newFilePath);

    if (!absoluteNewFilePath.startsWith(resolvedBase)) {
        return res.status(403).json({ error: 'יצירת קובץ נדחתה (מחוץ לתיקיית הבסיס).' });
    }

    const parentDir = path.dirname(absoluteNewFilePath);
    try {
        await fs.access(parentDir);
    } catch (parentAccessError) {
         return res.status(400).json({ error: `תיקיית האב '${path.dirname(newFilePath)}' אינה קיימת ליצירת הקובץ.` });
    }

    try {
        try { await fs.access(absoluteNewFilePath); return res.status(400).json({ error: `הקובץ '${newFilePath}' כבר קיים.` }); }
        catch (accessError) { if (accessError.code !== 'ENOENT') throw accessError; }

        await fs.writeFile(absoluteNewFilePath, content || '', 'utf-8');

        const fileName = path.basename(newFilePath);
        dbOperations.recordFileUsage(baseFolderPath, newFilePath, fileName);
        const updatedStructure = await getUpdatedDirectoryStructure(baseFolderPath);
        const ext = path.extname(fileName).toLowerCase();
        let newFileType = SUPPORTED_IMAGE_EXTENSIONS.includes(ext) ? 'image' : 'file';

        res.status(201).json({
            message: `הקובץ '${newFilePath}' נוצר בהצלחה.`,
            newFile: { name: fileName, path: newFilePath, isFolder: false, type: newFileType },
            directoryStructure: updatedStructure
        });
    } catch (error) {
        console.error(`שגיאה ביצירת הקובץ '${absoluteNewFilePath}':`, error);
        if (error.code === 'EPERM' || error.code === 'EACCES') return res.status(403).json({ error: `אין הרשאת כתיבה ליצירת הקובץ '${newFilePath}'.` });
        res.status(500).json({ error: 'שגיאה ביצירת הקובץ.' });
    }
});

app.delete('/api/delete-item', async (req, res) => {
    const { baseFolderPath, relativePathToDelete } = req.body;
    if (!baseFolderPath || !relativePathToDelete) {
        return res.status(400).json({ error: 'מידע חסר למחיקת פריט.' });
    }

    const resolvedBase = path.resolve(baseFolderPath);
    const absolutePathToDelete = path.resolve(resolvedBase, relativePathToDelete);
    const stylesPathToDelete = absolutePathToDelete + STYLES_SUFFIX;

    if (!absolutePathToDelete.startsWith(resolvedBase)) {
        return res.status(403).json({ error: 'מחיקת פריט נדחתה (מחוץ לתיקיית הבסיס).' });
    }

    try {
        const stats = await fs.stat(absolutePathToDelete);

        await dbOperations.deleteFileUsage(baseFolderPath, relativePathToDelete, stats.isDirectory(), (dbErr, changes) => {
            if (dbErr) {
                console.error(`DB error during deleteFileUsage for ${relativePathToDelete}: ${dbErr.message}. Still attempting FS delete.`);
            }
            console.log(`DB: ${changes} usage records deleted for ${relativePathToDelete}.`);
        });

        if (stats.isDirectory()) {
            await fs.rm(absolutePathToDelete, { recursive: true, force: true });
        } else {
            await fs.unlink(absolutePathToDelete);
            try {
                await fs.access(stylesPathToDelete);
                await fs.unlink(stylesPathToDelete);
            } catch (styleError) {
                if (styleError.code !== 'ENOENT') {
                    console.warn(`אזהרה: לא ניתן למחוק קובץ סגנונות ${stylesPathToDelete}: ${styleError.message}`);
                }
            }
        }

        const updatedStructure = await getUpdatedDirectoryStructure(baseFolderPath);
        res.json({
            message: `${stats.isDirectory() ? 'התיקייה' : 'הקובץ'} '${relativePathToDelete}' נמחק(ה).`,
            directoryStructure: updatedStructure
        });

    } catch (error) {
        console.error(`שגיאה במחיקת הפריט '${absolutePathToDelete}':`, error);
        if (error.code === 'ENOENT') return res.status(404).json({ error: `הפריט '${relativePathToDelete}' לא נמצא.` });
        if (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'EBUSY') return res.status(403).json({ error: `אין הרשאה למחיקת '${relativePathToDelete}' או שהקובץ בשימוש.` });
        res.status(500).json({ error: 'שגיאה במחיקת הפריט.' });
    }
});


app.post('/api/create-folder', async (req, res) => {
    const { baseFolderPath, newFolderRelativePath } = req.body;
    if (!baseFolderPath || !newFolderRelativePath) {
        return res.status(400).json({ error: 'מידע חסר ליצירת תיקייה.' });
    }

    const resolvedBase = path.resolve(baseFolderPath);
    const absoluteNewFolderPath = path.resolve(resolvedBase, newFolderRelativePath);

    if (!absoluteNewFolderPath.startsWith(resolvedBase)) {
        return res.status(403).json({ error: 'יצירת תיקייה נדחתה (מחוץ לתיקיית הבסיס).' });
    }

    try {
        try {
            await fs.access(absoluteNewFolderPath);
            return res.status(400).json({ error: `התיקייה '${newFolderRelativePath}' כבר קיימת.` });
        } catch (accessError) {
            if (accessError.code !== 'ENOENT') throw accessError;
        }

        await fs.mkdir(absoluteNewFolderPath, { recursive: true });

        const updatedStructure = await getUpdatedDirectoryStructure(baseFolderPath);
        res.status(201).json({
            message: `התיקייה '${newFolderRelativePath}' נוצרה בהצלחה.`,
            newFolder: {
                name: path.basename(newFolderRelativePath),
                path: newFolderRelativePath,
                isFolder: true,
                type: 'folder',
                children: []
            },
            directoryStructure: updatedStructure
        });
    } catch (error) {
        console.error(`שגיאה ביצירת התיקייה '${absoluteNewFolderPath}':`, error);
        if (error.code === 'EPERM' || error.code === 'EACCES') return res.status(403).json({ error: `אין הרשאת כתיבה ליצירת התיקייה '${newFolderRelativePath}'.` });
        res.status(500).json({ error: 'שגיאה ביצירת התיקייה.' });
    }
});

app.post('/api/rename-item', async (req, res) => {
    const { baseFolderPath, oldRelativePath, newName } = req.body;
    if (!baseFolderPath || !oldRelativePath || !newName) {
        return res.status(400).json({ error: 'מידע חסר לשינוי שם.' });
    }
    if (newName.includes('/') || newName.includes('\\')) {
        return res.status(400).json({ error: 'שם חדש אינו יכול לכלול תווים כמו / או \\.' });
    }

    const resolvedBase = path.resolve(baseFolderPath);
    const absoluteOldPath = path.resolve(resolvedBase, oldRelativePath);
    const newRelativePath = path.join(path.dirname(oldRelativePath), newName).replace(/\\/g, '/');
    const absoluteNewPath = path.resolve(resolvedBase, newRelativePath);

    const oldStylesPath = absoluteOldPath + STYLES_SUFFIX;
    const newStylesPath = absoluteNewPath + STYLES_SUFFIX;

    if (!absoluteOldPath.startsWith(resolvedBase) || !absoluteNewPath.startsWith(resolvedBase)) {
        return res.status(403).json({ error: 'שינוי שם נדחה (מחוץ לתיקיית הבסיס).' });
    }
    if (absoluteOldPath === absoluteNewPath) {
         return res.status(200).json({ message: "השם החדש זהה לישן. לא בוצע שינוי.", directoryStructure: await getUpdatedDirectoryStructure(baseFolderPath), renamedItem: { oldRelativePath, newRelativePath, newName, isFolder: (await fs.stat(absoluteOldPath)).isDirectory() } });
    }

    try {
        const stats = await fs.stat(absoluteOldPath);

        try {
            await fs.access(absoluteNewPath);
            return res.status(400).json({ error: `פריט בשם '${newName}' כבר קיים במיקום זה.` });
        } catch (accessError) {
            if (accessError.code !== 'ENOENT') throw accessError;
        }

        await fs.rename(absoluteOldPath, absoluteNewPath);

        if (!stats.isDirectory()) {
            try {
                await fs.access(oldStylesPath);
                await fs.rename(oldStylesPath, newStylesPath);
            } catch (styleError) {
                if (styleError.code !== 'ENOENT') {
                     console.warn(`אזהרה: לא ניתן לשנות שם לקובץ סגנונות מ-${oldStylesPath} ל-${newStylesPath}: ${styleError.message}`);
                }
            }
        }

        const oldAbsoluteFilePathForDB = path.join(baseFolderPath, oldRelativePath);
        const newAbsoluteFilePathForDB = path.join(baseFolderPath, newRelativePath);

        if (stats.isDirectory()) {
            await dbOperations.updateDescendantPaths(baseFolderPath, oldRelativePath, baseFolderPath, newRelativePath, (dbErr, changes) => {
                 if (dbErr) console.error(`DB error during updateDescendantPaths for rename ${oldRelativePath} -> ${newRelativePath}: ${dbErr.message}`);
                 else console.log(`DB: ${changes} descendant paths updated for rename.`);
            });
        } else {
             await dbOperations.updateFileUsagePath(oldAbsoluteFilePathForDB, newAbsoluteFilePathForDB, baseFolderPath, newRelativePath, newName, (dbErr, changes) => {
                if (dbErr) console.error(`DB error during updateFileUsagePath for rename ${oldRelativePath} -> ${newRelativePath}: ${dbErr.message}`);
                else console.log(`DB: ${changes} file usage path updated for rename.`);
            });
        }

        const updatedStructure = await getUpdatedDirectoryStructure(baseFolderPath);
        res.json({
            message: `השם של '${oldRelativePath}' שונה ל-'${newName}' בהצלחה.`,
            directoryStructure: updatedStructure,
            renamedItem: { oldRelativePath, newRelativePath, newName, isFolder: stats.isDirectory() }
        });

    } catch (error) {
        console.error(`שגיאה בשינוי שם של '${oldRelativePath}' ל-'${newName}':`, error);
        if (error.code === 'ENOENT') return res.status(404).json({ error: `הפריט '${oldRelativePath}' לא נמצא.`});
        if (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'EBUSY') return res.status(403).json({ error: `אין הרשאה לשינוי שם או שהקובץ בשימוש.` });
        res.status(500).json({ error: error.message || 'שגיאה בשינוי שם הפריט.' });
    }
});

app.post('/api/move-item', async (req, res) => {
    const { sourceBaseFolderPath, sourceRelativePath, targetBaseFolderPath, targetParentRelativePath } = req.body;

    if (!sourceBaseFolderPath || !sourceRelativePath || !targetBaseFolderPath || targetParentRelativePath === undefined) {
        return res.status(400).json({ error: 'מידע חסר להעברת פריט.' });
    }

    const resolvedSourceBase = path.resolve(sourceBaseFolderPath);
    const resolvedTargetBase = path.resolve(targetBaseFolderPath);

    const absoluteSourcePath = path.resolve(resolvedSourceBase, sourceRelativePath);
    const itemName = path.basename(sourceRelativePath);
    const absoluteTargetPath = path.resolve(resolvedTargetBase, targetParentRelativePath, itemName);
    const newRelativePathInTargetBase = path.join(targetParentRelativePath, itemName).replace(/\\/g, '/');

    const sourceStylesPath = absoluteSourcePath + STYLES_SUFFIX;
    const targetStylesPath = absoluteTargetPath + STYLES_SUFFIX;

    if (!absoluteSourcePath.startsWith(resolvedSourceBase) ||
        !absoluteTargetPath.startsWith(resolvedTargetBase)) {
        return res.status(403).json({ error: 'העברת פריט נדחתה (מחוץ לתיקיית הבסיס המותרת).' });
    }
    if (absoluteSourcePath === absoluteTargetPath) {
         return res.status(400).json({ error: 'מקור ויעד ההעברה זהים.' });
    }

    try {
        const sourceStats = await fs.stat(absoluteSourcePath);
        if (sourceStats.isDirectory() && absoluteTargetPath.startsWith(absoluteSourcePath + path.sep)) {
            return res.status(400).json({ error: 'לא ניתן להעביר תיקייה לתוך עצמה או לתוך אחד מצאצאיה.' });
        }

        try {
            await fs.access(absoluteTargetPath);
            return res.status(400).json({ error: `פריט בשם '${itemName}' כבר קיים ביעד '${targetParentRelativePath || path.basename(targetBaseFolderPath)}'.` });
        } catch (accessError) {
            if (accessError.code !== 'ENOENT') throw accessError;
        }

        const absoluteTargetParentDir = path.dirname(absoluteTargetPath);
        try {
            await fs.access(absoluteTargetParentDir);
            const targetParentStats = await fs.stat(absoluteTargetParentDir);
            if (!targetParentStats.isDirectory()) {
                 return res.status(400).json({ error: `נתיב היעד '${targetParentRelativePath}' אינו תיקייה.` });
            }
        } catch (parentAccessError) {
             return res.status(400).json({ error: `תיקיית היעד '${targetParentRelativePath}' לא נמצאה.` });
        }

        await fs.rename(absoluteSourcePath, absoluteTargetPath);

        if (!sourceStats.isDirectory()) {
            try {
                await fs.access(sourceStylesPath);
                await fs.rename(sourceStylesPath, targetStylesPath);
            } catch (styleError) {
                if (styleError.code !== 'ENOENT') {
                    console.warn(`אזהרה: לא ניתן להעביר קובץ סגנונות מ-${sourceStylesPath} ל-${targetStylesPath}: ${styleError.message}`);
                }
            }
        }

        const oldAbsoluteFilePathForDB = path.join(sourceBaseFolderPath, sourceRelativePath);

        if (sourceStats.isDirectory()) {
            await dbOperations.updateDescendantPaths(sourceBaseFolderPath, sourceRelativePath, targetBaseFolderPath, newRelativePathInTargetBase, (dbErr, changes) => {
                if (dbErr) console.error(`DB error during updateDescendantPaths for move: ${dbErr.message}`);
                else console.log(`DB: ${changes} descendant paths updated for move.`);
            });
        } else {
             await dbOperations.updateFileUsagePath(oldAbsoluteFilePathForDB, path.join(targetBaseFolderPath, newRelativePathInTargetBase), targetBaseFolderPath, newRelativePathInTargetBase, itemName, (dbErr, changes) => {
                if (dbErr) console.error(`DB error during updateFileUsagePath for move: ${dbErr.message}`);
                else console.log(`DB: ${changes} file usage path updated for move.`);
            });
        }

        let updatedSourceStructure = null;
        if (sourceBaseFolderPath !== targetBaseFolderPath && fsSync.existsSync(sourceBaseFolderPath)) {
             updatedSourceStructure = await getUpdatedDirectoryStructure(sourceBaseFolderPath);
        } else if (sourceBaseFolderPath === targetBaseFolderPath) {
        }

        const updatedTargetStructure = await getUpdatedDirectoryStructure(targetBaseFolderPath);

        res.json({
            message: `הפריט '${itemName}' הועבר בהצלחה אל '${targetParentRelativePath || path.basename(targetBaseFolderPath)}'.`,
            updatedSourceStructure: updatedSourceStructure,
            updatedTargetStructure: updatedTargetStructure,
            movedItemDetails: {
                originalSourceBaseFolderPath: sourceBaseFolderPath,
                originalSourceRelativePath: sourceRelativePath,
                newTargetBaseFolderPath: targetBaseFolderPath,
                newTargetRelativePath: newRelativePathInTargetBase,
                itemName: itemName,
                isFolder: sourceStats.isDirectory()
            }
        });

    } catch (error) {
        console.error(`שגיאה בהעברת '${sourceRelativePath}' אל '${targetBaseFolderPath}/${targetParentRelativePath}':`, error);
        if (error.code === 'ENOENT' && error.path === absoluteSourcePath) return res.status(404).json({ error: `פריט המקור '${sourceRelativePath}' לא נמצא.`});
        if (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'EBUSY') return res.status(403).json({ error: `אין הרשאה להעברת הפריט או שהקובץ בשימוש.`});
        res.status(500).json({ error: error.message || 'שגיאה בהעברת הפריט.' });
    }
});


async function searchInFile(filePath, searchTerm, baseDirForRelativePaths) {
    if (filePath.endsWith(STYLES_SUFFIX)) return null;

    const fileStream = fsSync.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    const matches = [];
    let lineNumber = 0;
    const searchTermLower = searchTerm.toLowerCase();
    for await (const line of rl) {
        lineNumber++;
        if (line.toLowerCase().includes(searchTermLower)) matches.push({ lineNumber, lineText: line.substring(0, 200) });
    }
    if (matches.length > 0) return {
        fileName: path.basename(filePath),
        relativePath: path.relative(baseDirForRelativePaths, filePath).replace(/\\/g, '/'),
        matches,
        isFolder: false,
        type: SUPPORTED_IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase()) ? 'image' : 'file'
    };
    return null;
}

async function findFilesRecursive(directoryToSearch, baseDirForRelativePaths, searchTermToFind, collectedResults) {
    try {
        const dirents = await fs.readdir(directoryToSearch, { withFileTypes: true });
        for (const dirent of dirents) {
            const absoluteEntryPath = path.join(directoryToSearch, dirent.name);
            if (dirent.name.endsWith(STYLES_SUFFIX)) continue;

            if (dirent.isDirectory()) {
                await findFilesRecursive(absoluteEntryPath, baseDirForRelativePaths, searchTermToFind, collectedResults);
            } else if (dirent.isFile() && ALLOWED_EXTENSIONS_FOR_SEARCH.includes(path.extname(dirent.name).toLowerCase())) {
                try {
                    const fileSearchResult = await searchInFile(absoluteEntryPath, searchTermToFind, baseDirForRelativePaths);
                    if (fileSearchResult) collectedResults.push(fileSearchResult);
                } catch (searchError) {
                    console.warn(`שגיאה בחיפוש בקובץ ${absoluteEntryPath}: ${searchError.message}`);
                }
            }
        }
    } catch (error) {
        console.warn(`שגיאה בקריאת תיקייה ${directoryToSearch} לחיפוש: ${error.message}`);
    }
}

app.post('/api/search', async (req, res) => {
    const { baseFolderPath, searchTerm, scopePath } = req.body;
    if (!baseFolderPath || !searchTerm) return res.status(400).json({ error: 'מידע חסר לחיפוש.' });
    if (searchTerm.trim().length < 2) return res.status(400).json({ error: 'מילת חיפוש קצרה מדי.' });

    let results = [];
    const resolvedBaseForSearch = path.resolve(baseFolderPath);

    try {
        await fs.access(resolvedBaseForSearch);
        const baseFolderStats = await fs.stat(resolvedBaseForSearch);
        if (!baseFolderStats.isDirectory()) return res.status(400).json({ error: `הנתיב '${baseFolderPath}' אינו תיקייה.`});

        let searchStartPath = resolvedBaseForSearch;
        if (scopePath) {
            const absoluteScopePath = path.resolve(resolvedBaseForSearch, scopePath);
            if (!absoluteScopePath.startsWith(resolvedBaseForSearch)) return res.status(403).json({ error: 'היקף חיפוש לא חוקי.' });

            await fs.access(absoluteScopePath);
            const scopeStats = await fs.stat(absoluteScopePath);

            if (scopeStats.isFile()) {
                if (absoluteScopePath.endsWith(STYLES_SUFFIX) || !ALLOWED_EXTENSIONS_FOR_SEARCH.includes(path.extname(absoluteScopePath).toLowerCase())) {
                    return res.status(400).json({ error: 'לא ניתן לחפש בסוג קובץ זה או בקובץ סגנונות.' });
                }
                const fileSearchResult = await searchInFile(absoluteScopePath, searchTerm, resolvedBaseForSearch);
                if (fileSearchResult) results.push(fileSearchResult);
            } else if (scopeStats.isDirectory()) {
                searchStartPath = absoluteScopePath;
                await findFilesRecursive(searchStartPath, resolvedBaseForSearch, searchTerm, results);
            } else {
                 return res.status(400).json({ error: 'נתיב היקף חיפוש לא תקין.' });
            }
        } else {
            await findFilesRecursive(searchStartPath, resolvedBaseForSearch, searchTerm, results);
        }
        res.json(results);
    } catch (error) {
        console.error(`שגיאה בחיפוש:`, error);
        if (error.code === 'ENOENT') return res.status(404).json({ error: `נתיב החיפוש או ההיקף לא נמצא.` });
        res.status(500).json({ error: 'שגיאה בביצוע החיפוש.' });
    }
});

app.post('/api/v2/search', async (req, res) => {
    const {
        basePath,
        searchTerm,
        options,
        includePatterns,
        excludePatterns,
    } = req.body;

    if (!basePath || typeof basePath !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing "basePath" parameter.' });
    }
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid or missing "searchTerm" parameter.' });
    }
    if (searchTerm.trim().length < 1 && (!options || !options.isRegex)) {
        return res.status(400).json({ error: 'Search term is too short.' });
    }
    if (options && typeof options !== 'object') {
        return res.status(400).json({ error: 'Invalid "options" parameter format.' });
    }
    if (includePatterns && !Array.isArray(includePatterns)) {
        return res.status(400).json({ error: 'Invalid "includePatterns" parameter format.' });
    }
    if (excludePatterns && !Array.isArray(excludePatterns)) {
        return res.status(400).json({ error: 'Invalid "excludePatterns" parameter format.' });
    }

    const searchOptions = {
        isRegex: options?.isRegex || false,
        caseSensitive: options?.caseSensitive || false,
        wholeWord: options?.wholeWord || false,
    };

    try {
        try {
            const stats = await fs.stat(basePath);
            if (!stats.isDirectory()) {
                return res.status(400).json({ error: `"basePath" (${basePath}) is not a directory.` });
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({ error: `"basePath" (${basePath}) not found.` });
            }
            throw err;
        }

        const results = await performSearchV2(
            basePath,
            searchTerm,
            searchOptions,
            includePatterns,
            excludePatterns
        );
        res.json(results);
    } catch (error) {
        console.error('Error in /api/v2/search endpoint:', error);
        if (error.message.includes("Invalid regular expression")) {
             return res.status(400).json({ error: `Invalid regular expression: ${error.message}` });
        }
        res.status(500).json({ error: 'An unexpected error occurred during the search.' });
    }
});


app.get('/api/files/recent', (req, res) => {
    const baseFolderPath = req.query.baseFolderPath;
    const limit = parseInt(req.query.limit) || 10;
    if (!baseFolderPath) return res.status(400).json({ error: 'פרמטר baseFolderPath חסר.' });
    dbOperations.getRecentFiles(baseFolderPath, limit, (err, rows) => {
        if (err) {
            console.error('שגיאה בשליפת קבצים אחרונים:', err);
            return res.status(500).json({ error: 'שגיאה בשליפת קבצים אחרונים.' });
        }
        const processedRows = rows.map(row => ({...row, rootName: path.basename(row.base_folder_path) }));
        res.json(processedRows);
    });
});

app.get('/api/files/frequent', (req, res) => {
    const baseFolderPath = req.query.baseFolderPath;
    const limit = parseInt(req.query.limit) || 10;
    if (!baseFolderPath) return res.status(400).json({ error: 'פרמטר baseFolderPath חסר.' });
    dbOperations.getFrequentFiles(baseFolderPath, limit, (err, rows) => {
        if (err) {
            console.error('שגיאה בשליפת קבצים נפוצים:', err);
            return res.status(500).json({ error: 'שגיאה בשליפת קבצים נפוצים.' });
        }
        const processedRows = rows.map(row => ({...row, rootName: path.basename(row.base_folder_path) }));
        res.json(processedRows);
    });
});


app.get('/api/settings/last-opened-folders', (req, res) => {
    dbOperations.getSetting('lastOpenedFolderPaths', (err, value) => {
        if (err) {
            console.error("שגיאה בשליפת lastOpenedFolderPaths:", err.message);
            return res.status(500).json({ error: "שגיאה בשליפת הגדרה." });
        }
        try {
            const folderPaths = value ? JSON.parse(value) : [];
            res.json({ folderPaths });
        } catch (parseError) {
            console.error("שגיאה בפענוח lastOpenedFolderPaths:", parseError);
            res.json({ folderPaths: [] });
        }
    });
});

app.post('/api/settings/last-opened-folders', (req, res) => {
    const { folderPaths } = req.body;
    if (!Array.isArray(folderPaths)) return res.status(400).json({ error: "folderPaths חייב להיות מערך." });
    dbOperations.saveSetting('lastOpenedFolderPaths', JSON.stringify(folderPaths), (err) => {
        if (err) {
            console.error("שגיאה בשמירת lastOpenedFolderPaths:", err.message);
            return res.status(500).json({ error: "שגיאה בשמירת הגדרה." });
        }
        res.json({ message: "הגדרת תיקיות אחרונות נשמרה." });
    });
});


// --- Repetition API Endpoints ---
app.post('/api/repetitions', (req, res) => {
    const { name, content, reminder_interval_1, reminder_interval_2, reminder_interval_3, reminder_interval_4 } = req.body;
    if (!name || reminder_interval_1 === undefined) {
        return res.status(400).json({ error: "שם החזרה והמרווח הראשון נדרשים." });
    }
    const int1 = parseInt(reminder_interval_1, 10);
    const int2 = reminder_interval_2 !== undefined && reminder_interval_2 !== null ? parseInt(reminder_interval_2, 10) : null;
    const int3 = reminder_interval_3 !== undefined && reminder_interval_3 !== null ? parseInt(reminder_interval_3, 10) : null;
    const int4 = reminder_interval_4 !== undefined && reminder_interval_4 !== null ? parseInt(reminder_interval_4, 10) : null;

    if (isNaN(int1) || (int2 !== null && isNaN(int2)) || (int3 !== null && isNaN(int3)) || (int4 !== null && isNaN(int4))) {
        return res.status(400).json({ error: "ערכי המרווחים חייבים להיות מספרים."});
    }
    if (int1 <= 0 && (int2 === null || int2 <= 0) && (int3 === null || int3 <= 0) && (int4 === null || int4 <= 0) ){
        return res.status(400).json({ error: "לפחות מרווח חיובי אחד נדרש."});
    }

    const repetitionData = {
        name,
        content: content || null,
        reminder_interval_1: int1 > 0 ? int1 : null,
        reminder_interval_2: int2 > 0 ? int2 : null,
        reminder_interval_3: int3 > 0 ? int3 : null,
        reminder_interval_4: int4 > 0 ? int4 : null,
    };

    dbOperations.addRepetition(repetitionData, (err, newRepetition) => {
        if (err) {
            console.error("שגיאה בהוספת חזרה:", err.message);
            return res.status(500).json({ error: "שגיאה פנימית בשרת בעת הוספת חזרה." });
        }
        res.status(201).json(newRepetition);
    });
});

app.get('/api/repetitions', (req, res) => {
    dbOperations.getAllRepetitions((err, repetitions) => {
        if (err) {
            console.error("שגיאה בשליפת חזרות:", err.message);
            return res.status(500).json({ error: "שגיאה פנימית בשרת בעת שליפת חזרות." });
        }
        res.json(repetitions);
    });
});

app.get('/api/repetitions/:id', (req, res) => {
    const { id } = req.params;
    dbOperations.getRepetitionById(id, (err, repetition) => {
        if (err) {
            console.error(`שגיאה בשליפת חזרה ${id}:`, err.message);
            return res.status(500).json({ error: "שגיאה פנימית בשרת." });
        }
        if (!repetition) {
            return res.status(404).json({ error: `חזרה עם מזהה ${id} לא נמצאה.` });
        }
        res.json(repetition);
    });
});


app.delete('/api/repetitions/:id', (req, res) => {
    const { id } = req.params;
    dbOperations.deleteRepetition(id, (err, changes) => {
        if (err) {
            console.error(`שגיאה במחיקת חזרה ${id}:`, err.message);
            return res.status(500).json({ error: "שגיאה פנימית בשרת בעת מחיקת חזרה." });
        }
        if (changes === 0) {
            return res.status(404).json({ error: `חזרה עם מזהה ${id} לא נמצאה למחיקה.` });
        }
        res.status(200).json({ message: `חזרה ${id} נמחקה בהצלחה.` });
    });
});

app.put('/api/repetitions/:id/mute', (req, res) => {
    const { id } = req.params;
    const { is_muted } = req.body;

    if (typeof is_muted !== 'boolean') {
        return res.status(400).json({ error: "ערך 'is_muted' נדרש וחייב להיות בוליאני." });
    }

    dbOperations.updateRepetitionMuteStatus(id, is_muted, (err, updatedRepetition) => {
        if (err) {
            console.error(`בעדכון השתקה עבור חזרה ${id}:`, err.message);
            return res.status(500).json({ error: "שגיאה פנימית בשרת." });
        }
        if (!updatedRepetition) {
             return res.status(404).json({ error: `חזרה עם מזהה ${id} לא נמצאה לעדכון.` });
        }
        res.json(updatedRepetition);
    });
});

app.put('/api/repetitions/:id/complete', (req, res) => {
    const { id } = req.params;
    dbOperations.markRepetitionAsCompleted(id, (err, updatedRepetition) => {
        if (err) {
            console.error(`שגיאה בסימון חזרה ${id} כהושלמה:`, err.message);
            if (err.message.includes("לא נמצאה")) return res.status(404).json({ error: err.message });
            return res.status(500).json({ error: "שגיאה פנימית בשרת." });
        }
        res.json(updatedRepetition);
    });
});

app.put('/api/repetitions/:id', (req, res) => {
    const { id } = req.params;
    const { name, content, reminder_interval_1, reminder_interval_2, reminder_interval_3, reminder_interval_4, is_muted } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (reminder_interval_1 !== undefined) updateData.reminder_interval_1 = parseInt(reminder_interval_1, 10) > 0 ? parseInt(reminder_interval_1, 10) : null;
    if (reminder_interval_2 !== undefined) updateData.reminder_interval_2 = parseInt(reminder_interval_2, 10) > 0 ? parseInt(reminder_interval_2, 10) : null;
    if (reminder_interval_3 !== undefined) updateData.reminder_interval_3 = parseInt(reminder_interval_3, 10) > 0 ? parseInt(reminder_interval_3, 10) : null;
    if (reminder_interval_4 !== undefined) updateData.reminder_interval_4 = parseInt(reminder_interval_4, 10) > 0 ? parseInt(reminder_interval_4, 10) : null;
    if (is_muted !== undefined && typeof is_muted === 'boolean') updateData.is_muted = is_muted;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "לא סופקו שדות לעדכון." });
    }
    for (let i = 1; i <= 4; i++) {
        const key = `reminder_interval_${i}`;
        if (req.body[key] !== undefined && (isNaN(parseInt(req.body[key],10)) || parseInt(req.body[key],10) < 0) && req.body[key] !== null) {
             return res.status(400).json({ error: `ערך מרווח ${i} אינו תקין.` });
        }
    }

    dbOperations.updateRepetition(id, updateData, (err, updatedRepetition) => {
        if (err) {
            console.error(`שגיאה בעדכון חזרה ${id}:`, err.message);
            return res.status(500).json({ error: "שגיאה פנימית בשרת." });
        }
        if (!updatedRepetition) {
             return res.status(404).json({ error: `חזרה עם מזהה ${id} לא נמצאה לעדכון.` });
        }
        res.json(updatedRepetition);
    });
});


// --- Questionnaire API Endpoints ---

// GET /api/questionnaires/date/:date - Fetch questionnaire for a specific date (YYYY-MM-DD)
// This replaces the old /api/questionnaires/today endpoint logic
app.get('/api/questionnaires/date/:date', async (req, res) => {
    const { date } = req.params;
    // Basic date validation (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Please use YYYY-MM-DD." });
    }
    try {
        const result = await questionnaireService.getFullQuestionnaireForDate(date);
        res.json(result);
    } catch (error) {
        console.error(`Error in GET /api/questionnaires/date/${date}:`, error);
        res.status(500).json({ error: error.message || "Failed to fetch questionnaire for the specified date." });
    }
});

// POST /api/questionnaires - Submit questionnaire answers for a specific date
app.post('/api/questionnaires', async (req, res) => {
    const { answers, date } = req.body; // Expects answers object and a date string (YYYY-MM-DD)

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Date (YYYY-MM-DD) is required for submission." });
    }
    if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ error: "Answers object is required." });
    }

    if (answers.rating_today) {
        const rating = parseInt(answers.rating_today, 10);
        if (isNaN(rating) || rating < 1 || rating > 10) {
            return res.status(400).json({ error: "דירוג חייב להיות מספר בין 1 ל-10." });
        }
    }

    try {
        // The service function expects AI question texts to be part of the answers object from frontend
        // e.g. answers.ai_q1_text and answers.ai_q2_text
        await questionnaireService.submitFullQuestionnaire(answers, date);
        res.status(201).json({ success: true, message: `Questionnaire for ${date} submitted successfully.` });
    } catch (error) {
        console.error("Error in POST /api/questionnaires:", error);
        // The DB layer now uses INSERT OR REPLACE, so 409 might not be applicable unless specific checks are added.
        // If a unique constraint is violated elsewhere, it could still happen.
        if (error.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({ error: `Questionnaire for ${date} might already exist or another constraint failed.` });
        }
        res.status(500).json({ error: error.message || "Failed to submit questionnaire." });
    }
});

// GET /api/questionnaires/week - Retrieve data for a specific week's answers
app.get('/api/questionnaires/week', (req, res) => {
    // Expects startDate and endDate in YYYY-MM-DD format from query parameters
    // If not provided, defaults to the current week based on server's date.
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        const today = new Date();
        const boundaries = questionnaireService.getWeekBoundaryDates(today);
        startDate = boundaries.weekStartDate;
        endDate = boundaries.weekEndDate;
    } else {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            return res.status(400).json({ error: "Invalid date format for startDate or endDate. Please use YYYY-MM-DD." });
        }
    }

    dbOperations.getWeeklyQuestionnaireAnswers(startDate, endDate, (err, data) => {
        if (err) {
            console.error("Error in GET /api/questionnaires/week:", err);
            return res.status(500).json({ error: "Failed to fetch weekly answers for the specified range." });
        }
        res.json({ data, weekStartDate: startDate, weekEndDate: endDate });
    });
});

// POST /api/questionnaires/summary - Trigger AI generation of the weekly summary
app.post('/api/questionnaires/summary', async (req, res) => {
    // Optional: allow specifying a date to generate summary for that week
    const { dateForWeek } = req.body; // Expects YYYY-MM-DD or undefined
    let targetDate = dateForWeek ? new Date(dateForWeek) : new Date();

    if (dateForWeek && !/^\d{4}-\d{2}-\d{2}$/.test(dateForWeek)) {
         return res.status(400).json({ error: "Invalid date format for dateForWeek. Please use YYYY-MM-DD." });
    }

    try {
        const result = await questionnaireService.generateAndSaveWeeklySummary(targetDate);
        res.json({ success: true, message: result.message, summaryId: result.summaryId, summaryData: result.summaryData });
    } catch (error) {
        console.error("Error in POST /api/questionnaires/summary:", error);
        res.status(500).json({ error: error.message || "Failed to generate or save weekly summary." });
    }
});

// GET /api/questionnaires/summary/latest - Fetch the latest weekly summary
app.get('/api/questionnaires/summary/latest', (req, res) => {
    dbOperations.getLatestWeeklySummary((err, data) => {
        if (err) {
            console.error("Error in GET /api/questionnaires/summary/latest:", err);
            return res.status(500).json({ error: "Failed to fetch the latest weekly summary." });
        }
        res.json({ data }); // data can be null if no summary exists
    });
});

// GET /api/users/me/settings/notifications - Get notification settings
app.get('/api/users/me/settings/notifications', (req, res) => {
    dbOperations.getUserNotificationSettings((err, data) => {
        if (err) {
            console.error("Error in GET /api/users/me/settings/notifications:", err);
            return res.status(500).json({ error: "Failed to fetch notification settings." });
        }
        const settings = {
            ...data,
            enable_daily_questionnaire_reminder: !!data.enable_daily_questionnaire_reminder
        };
        res.json({ data: settings });
    });
});

// PUT /api/users/me/settings/notifications - Update notification settings
app.put('/api/users/me/settings/notifications', (req, res) => {
    const { enable_daily_questionnaire_reminder } = req.body; // reminder_time is fixed
    if (typeof enable_daily_questionnaire_reminder !== 'boolean') {
        return res.status(400).json({ error: "Invalid 'enable_daily_questionnaire_reminder' value." });
    }

    dbOperations.updateUserNotificationSettings({ enable_daily_questionnaire_reminder }, (err, updatedSettings) => {
        if (err) {
            console.error("Error in PUT /api/users/me/settings/notifications:", err);
            return res.status(500).json({ error: "Failed to update notification settings." });
        }
        const settings = {
            ...updatedSettings,
            enable_daily_questionnaire_reminder: !!updatedSettings.enable_daily_questionnaire_reminder
        };
        res.json({ success: true, data: settings });
    });
});

// --- Learning Graph API Endpoints ---
// GET /api/learning-graph/ratings?range=week|month|all
app.get('/api/learning-graph/ratings', async (req, res) => {
    const { range } = req.query; // 'week', 'month', 'all'
    try {
        const data = await learningGraphService.getRatingsForGraph(range);
        res.json({ data });
    } catch (error) {
        console.error(`Error in GET /api/learning-graph/ratings (range: ${range}):`, error);
        res.status(500).json({ error: error.message || "Failed to fetch learning graph data." });
    }
});

// --- Pilpulta API Endpoint ---
app.use('/api/pilpulta', pilpultaRoutes);

// --- Smart Search API Endpoint ---
app.use('/api/smart-search', smartSearchRoutes);

// --- Text Organization with Progress API Endpoint ---
app.use('/api/text-organization', textOrganizationRoutes);

// --- File Conversion API Endpoints ---
app.post('/api/file-conversion/scan-directory', async (req, res) => {
    const { directoryPath } = req.body;
    
    if (!directoryPath) {
        return res.status(400).json({ error: 'נתיב תיקייה נדרש' });
    }

    try {
        // Check if directory exists
        await fs.access(directoryPath);
        const stats = await fs.stat(directoryPath);
        
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'הנתיב שסופק אינו תיקייה' });
        }

        const files = await fileConversionService.scanDirectoryForConvertibleFiles(directoryPath);
        res.json({ 
            files,
            totalFiles: files.length,
            supportedExtensions: fileConversionService.supportedExtensions
        });
    } catch (error) {
        console.error('Error scanning directory:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'התיקייה לא נמצאה' });
        }
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            return res.status(403).json({ error: 'אין הרשאת גישה לתיקייה' });
        }
        res.status(500).json({ error: error.message || 'שגיאה בסריקת התיקייה' });
    }
});

app.post('/api/file-conversion/convert-directory', async (req, res) => {
    const { sourceDirectory, targetDirectoryName } = req.body;
    
    if (!sourceDirectory || !targetDirectoryName) {
        return res.status(400).json({ error: 'נתיב תיקיית מקור ושם תיקיית יעד נדרשים' });
    }

    try {
        // Check if source directory exists
        await fs.access(sourceDirectory);
        const stats = await fs.stat(sourceDirectory);
        
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'תיקיית המקור אינה תיקייה תקינה' });
        }

        // Create target directory path next to source directory
        const sourceParent = path.dirname(sourceDirectory);
        const targetDirectory = path.join(sourceParent, targetDirectoryName);

        // Progress callback for real-time updates (can be enhanced with WebSockets later)
        const progressCallback = (progress) => {
            console.log('Conversion progress:', progress);
            // TODO: Implement WebSocket or Server-Sent Events for real-time progress
        };

        const results = await fileConversionService.convertDirectoryToMarkdown(
            sourceDirectory,
            targetDirectory,
            progressCallback
        );

        res.json({
            ...results,
            sourceDirectory,
            targetDirectory,
            message: `הומרו ${results.convertedFiles} קבצים והועתקו ${results.copiedFiles || 0} קבצים נוספים מתוך ${results.totalFiles} קבצים בהצלחה`
        });
    } catch (error) {
        console.error('Error converting directory:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'תיקיית המקור לא נמצאה' });
        }
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            return res.status(403).json({ error: 'אין הרשאת גישה לתיקיית המקור או לתיקיית היעד' });
        }
        res.status(500).json({ error: error.message || 'שגיאה בהמרת הקבצים' });
    }
});

app.post('/api/file-conversion/convert-single-file', async (req, res) => {
    const { filePath } = req.body;
    
    if (!filePath) {
        return res.status(400).json({ error: 'נתיב קובץ נדרש' });
    }

    try {
        // Check if file exists
        await fs.access(filePath);
        const stats = await fs.stat(filePath);
        
        if (!stats.isFile()) {
            return res.status(400).json({ error: 'הנתיב שסופק אינו קובץ' });
        }

        if (!fileConversionService.isFileSupported(filePath)) {
            return res.status(400).json({ error: 'סוג קובץ לא נתמך להמרה' });
        }

        const markdownContent = await fileConversionService.convertFileToMarkdown(filePath);
        res.json({ 
            content: markdownContent,
            originalFile: filePath,
            message: 'הקובץ הומר בהצלחה'
        });
    } catch (error) {
        console.error('Error converting file:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'הקובץ לא נמצא' });
        }
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            return res.status(403).json({ error: 'אין הרשאת גישה לקובץ' });
        }
        res.status(500).json({ error: error.message || 'שגיאה בהמרת הקובץ' });
    }
});

// New endpoint for file conversion with format selection
app.post('/api/file-conversion/convert-file-with-format', async (req, res) => {
    const { filePath, targetFormat = 'md' } = req.body;
    
    if (!filePath) {
        return res.status(400).json({ error: 'נתיב קובץ נדרש' });
    }

    if (!targetFormat) {
        return res.status(400).json({ error: 'פורמט היעד נדרש' });
    }

    try {
        // Check if file exists
        await fs.access(filePath);
        const stats = await fs.stat(filePath);
        
        if (!stats.isFile()) {
            return res.status(400).json({ error: 'הנתיב שסופק אינו קובץ' });
        }

        if (!fileConversionService.isFileSupported(filePath)) {
            return res.status(400).json({ error: 'סוג קובץ לא נתמך להמרה' });
        }

        // Convert the file content
        const convertedContent = await fileConversionService.convertFileToFormat(filePath, targetFormat);
        
        // Generate output file path (same directory as source file)
        const sourceDir = path.dirname(filePath);
        const sourceBaseName = path.basename(filePath, path.extname(filePath));
        const outputFilePath = path.join(sourceDir, `${sourceBaseName}.${targetFormat}`);
        
        // Write the converted content to the new file
        await fs.writeFile(outputFilePath, convertedContent, 'utf-8');
        
        res.json({ 
            originalFile: filePath,
            convertedFile: outputFilePath,
            targetFormat: targetFormat,
            content: convertedContent,
            message: `הקובץ הומר בהצלחה ל-${targetFormat.toUpperCase()}`
        });
    } catch (error) {
        console.error('Error converting file with format:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'הקובץ לא נמצא' });
        }
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            return res.status(403).json({ error: 'אין הרשאת גישה לקובץ' });
        }
        res.status(500).json({ error: error.message || 'שגיאה בהמרת הקובץ' });
    }
});

// --- User Data Export/Import Endpoints ---
app.get('/api/user/export-data', async (req, res) => {
    try {
        const allUserData = await userDataService.exportAllUserData();
        res.json(allUserData);
    } catch (error) {
        console.error("Error exporting user data:", error.message);
        res.status(500).json({ error: "שגיאה ביצוא נתוני משתמש." });
    }
});

app.post('/api/user/import-data', async (req, res) => {
    const importedData = req.body;
    if (!importedData || typeof importedData !== 'object' || Object.keys(importedData).length === 0) {
        return res.status(400).json({ error: "לא סופקו נתונים לייבוא או שהפורמט אינו תקין." });
    }
    try {
        await userDataService.importAllUserData(importedData);
        res.json({ message: "נתוני המשתמש יובאו בהצלחה. ייתכן שיידרש רענון של היישום." });
    } catch (error) {
        console.error("Error importing user data:", error.message);
        res.status(500).json({ error: `שגיאה בייבוא נתוני משתמש: ${error.message}` });
    }
});

// --- User Data Reset Endpoint ---
app.delete('/api/user/reset-all-data', async (req, res) => {
    dbOperations.resetAllUserData((err) => {
        if (err) {
            console.error("Error resetting all user data:", err.message);
            return res.status(500).json({ error: "שגיאה באיפוס נתוני משתמש." });
        }
        // Additionally, clear lastOpenedFolderPaths from settings as it's a common user-specific setting
        // This is now handled within resetAllUserData by clearing the 'settings' table.
        console.log("All user data has been reset successfully.");
        res.status(200).json({ message: "כל נתוני המשתמש אופסו בהצלחה." });
    });
});


// --- Scheduled Tasks ---
cron.schedule('0 5 * * 0', async () => { // '0 5 * * 0' is 5:00 AM every Sunday
    console.log('Running scheduled task: Generate Weekly Summary');
    try {
        const dateForPreviousWeek = new Date();
        dateForPreviousWeek.setDate(dateForPreviousWeek.getDate() - 1); // Use Saturday to target the week that just ended
        const result = await questionnaireService.generateAndSaveWeeklySummary(dateForPreviousWeek);
        console.log('Scheduled weekly summary generation result:', result.message);
    } catch (error) {
        console.error('Error during scheduled weekly summary generation:', error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Jerusalem"
});

cron.schedule('0 22 * * *', () => { // '0 22 * * *' is 10:00 PM every day
    console.log('Running scheduled task: Check for Daily Questionnaire Reminder');
    const todayString = questionnaireService.getFormattedDateString(new Date());

    dbOperations.getUserNotificationSettings((err, settings) => {
        if (err || !settings.enable_daily_questionnaire_reminder) {
            console.log('Reminder check: Disabled or error fetching settings.');
            return;
        }
        dbOperations.getQuestionnaireByDate(todayString, (statusErr, submittedDoc) => {
            if (statusErr) {
                console.error('Reminder check: Error fetching submission status:', statusErr);
                return;
            }
            if (!submittedDoc) {
                console.log(`REMINDER: User (ID 1) has not completed the questionnaire for ${todayString}. (Reminder time: ${settings.reminder_time})`);
                // Actual notification logic would go here (e.g., push, email)
            } else {
                console.log(`Reminder check: Questionnaire for ${todayString} already completed.`);
            }
        });
    });
}, {
    scheduled: true,
    timezone: "Asia/Jerusalem"
});



app.listen(port, () => {
    console.log(`שרת Backend מאזין בכתובת http://localhost:${port}`);
});
