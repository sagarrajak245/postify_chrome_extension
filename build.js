import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getGoogleClientIdFromEnv() {
    try {
        const envPath = resolve(__dirname, '.env');
        const envContent = readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^VITE_GOOGLE_CLIENT_ID=(.*)$/m);
        if (match) {
            return match[1].trim();
        }
        throw new Error('VITE_GOOGLE_CLIENT_ID not found in .env');
    } catch (e) {
        throw new Error('Failed to read .env file: ' + e.message);
    }
}

async function buildExtension() {
    console.log('Building Chrome extension...');

    try {
        // Build the extension
        await build();

        // Copy manifest and assets
        const distDir = resolve(__dirname, 'dist');
        const publicDir = resolve(__dirname, 'public');

        // Inject Google Client ID into manifest.json
        const manifestRaw = readFileSync('manifest.json', 'utf-8');
        const clientId = getGoogleClientIdFromEnv();
        const manifestPatched = manifestRaw.replace('__GOOGLE_CLIENT_ID__', clientId);
        writeFileSync(join(distDir, 'manifest.json'), manifestPatched, 'utf-8');

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