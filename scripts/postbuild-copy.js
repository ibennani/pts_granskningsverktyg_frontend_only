import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');

const foldersToCopy = [
    'css',
    'js/i18n'
];

if (!existsSync(distDir)) {
    console.error('[postbuild-copy] dist directory not found. Did the Vite build succeed?');
    process.exit(1);
}

for (const relativePath of foldersToCopy) {
    const sourcePath = join(projectRoot, relativePath);
    const targetPath = join(distDir, relativePath);

    if (!existsSync(sourcePath)) {
        console.warn(`[postbuild-copy] Skip "${relativePath}" – source path not found.`);
        continue;
    }

    try {
        rmSync(targetPath, { recursive: true, force: true });
        cpSync(sourcePath, targetPath, { recursive: true });
        console.log(`[postbuild-copy] Copied ${relativePath} -> ${targetPath}`);
    } catch (error) {
        console.error(`[postbuild-copy] Failed to copy ${relativePath}:`, error);
        process.exitCode = 1;
    }
}
