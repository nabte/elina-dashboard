
const fs = require('fs');
const path = require('path');

const files = [
    "index.ts",
    "agent.ts",
    "context.ts",
    "llm.ts",
    "media.ts",
    "rag.ts",
    "logic.ts",
    "evolution-client.ts",
    "tools.ts",
    "cors.ts",
    "supabase-client.ts"
];

const basePath = "h:/DESAL/ELina 26/supabase/functions/process-chat-message";

files.forEach(file => {
    try {
        const filePath = path.join(basePath, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // 1. Remove single-line comments // ... (carefully to not break URLs)
        content = content.replace(/(\/\/[^\n]*)/g, (match) => match.includes('://') ? match : '');

        // 2. Remove multi-line comments /* ... */
        content = content.replace(/\/\*[\s\S]*?\*\//g, '');

        // 3. Remove console logs
        content = content.replace(/console\.(log|warn|error|info|debug)\s*\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)\s*;?/g, '');

        // 4. Remove empty lines and trim
        content = content.split('\n').filter(l => l.trim()).join('\n');

        const outPath = path.join(basePath, 'min_' + file);
        fs.writeFileSync(outPath, content, 'utf8');

        const originalSize = fs.statSync(filePath).size;
        const newSize = fs.statSync(outPath).size;

        console.log(`Minified ${file}: ${originalSize} -> ${newSize} bytes (${Math.round((1 - newSize / originalSize) * 100)}% reduction)`);

    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});
