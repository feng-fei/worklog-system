const fs = require('fs');
const html = fs.readFileSync('C:/Users/Administrator/Documents/traework/index.html', 'utf8');

const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let index = 0;

while ((match = scriptRegex.exec(html)) !== null) {
    index++;
    const content = match[1];
    if (!content.trim()) continue;
    if (index !== 2) continue;
    
    try {
        new Function(content);
        console.log('OK');
    } catch (e) {
        console.log('错误:', e.message);
        console.log('错误栈:', e.stack);
    }
    break;
}
