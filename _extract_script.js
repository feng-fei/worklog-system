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
    
    fs.writeFileSync('C:/Users/Administrator/Documents/traework/_temp_script2.js', content);
    console.log('已写入临时文件，长度:', content.length);
    break;
}
