import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');

console.log('[postbuild-copy] Starting...');

const foldersToCopy = [
    'css',
    'js/i18n'
];

// Files to copy to dist root
const filesToCopy = [
    'build-info.js'
];

if (!existsSync(distDir)) {
    console.error('[postbuild-copy] dist directory not found. Did the Vite build succeed?');
    process.exit(1);
}

for (const relativePath of foldersToCopy) {
    console.log(`[postbuild-copy] Processing: ${relativePath}`);
    const sourcePath = join(projectRoot, relativePath);
    const targetPath = join(distDir, relativePath);

    if (!existsSync(sourcePath)) {
        console.warn(`[postbuild-copy] Skip "${relativePath}" – source path not found.`);
        continue;
    }

    try {
        // Use xcopy on Windows to handle paths with special characters
        const xcopyCommand = `xcopy "${sourcePath}" "${targetPath}" /E /I /Y`;
        console.log(`[postbuild-copy] Executing: ${xcopyCommand}`);
        execSync(xcopyCommand, { stdio: 'inherit' });
        console.log(`[postbuild-copy] Successfully copied ${relativePath}`);
    } catch (error) {
        console.error(`[postbuild-copy] Failed to copy ${relativePath}:`, error.message);
        process.exitCode = 1;
    }
}

// Generate build info file
try {
    const buildTime = new Date();
    const buildInfo = {
        timestamp: buildTime.toISOString(),
        date: buildTime.toLocaleDateString('sv-SE'),
        time: buildTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    };
    
    const buildInfoContent = `// Auto-generated build info
window.BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)};
`;
    
    const buildInfoPath = join(distDir, 'build-info.js');
    writeFileSync(buildInfoPath, buildInfoContent, 'utf8');
    console.log('[postbuild-copy] Generated build-info.js');
    
    // Add build-info.js to files to copy for future builds
    if (!filesToCopy.includes('build-info.js')) {
        filesToCopy.push('build-info.js');
    }
} catch (error) {
    console.error('[postbuild-copy] Failed to generate build-info.js:', error.message);
}

console.log('[postbuild-copy] Completed successfully');
