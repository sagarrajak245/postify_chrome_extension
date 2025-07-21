import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildExtension() {
    console.log('Building Chrome extension...');

    try {
        // Build the extension
        await build();

        // Copy manifest and assets
        const distDir = resolve(__dirname, 'dist');
        const publicDir = resolve(__dirname, 'public');

        // Copy manifest.json
        copyFileSync('manifest.json', join(distDir, 'manifest.json'));

        // Copy public assets
        if (statSync(publicDir).isDirectory()) {
            copyDirectory(publicDir, distDir);
        }

        console.log('✅ Extension built successfully!');
        console.log('📁 Output directory: dist/');
        console.log('🚀 Ready for Chrome Web Store submission!');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

function copyDirectory(src, dest) {
    mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    }
}

buildExtension(); 