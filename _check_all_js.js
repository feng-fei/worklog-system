const fs = require('fs');
const html = fs.readFileSync('C:/Users/Administrator/Documents/traework/index.html', 'utf8');

const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let index = 0;

while ((match = scriptRegex.exec(html)) !== null) {
    index++;
    const content = match[1];
    if (!content.trim()) continue;
    
    console.log('\n=== Script #' + index + ' (长度: ' + content.length + ') ===');
    
    try {
        new Function(content);
        console.log('OK');
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}
