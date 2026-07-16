const fs = require('fs');
const html = fs.readFileSync('C:/Users/Administrator/Documents/traework/index.html', 'utf8');

const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let index = 0;

while ((match = scriptRegex.exec(html)) !== null) {
    index++;
    const content = match[1];
    if (!content.trim()) continue;
    if (index !== 2) continue; // 只检查第2个
    
    console.log('Script #2 长度:', content.length);
    
    try {
        new Function(content);
        console.log('OK');
    } catch (e) {
        console.log('ERROR:', e.message);
        
        // 尝试找到错误位置
        const lines = content.split('\n');
        
        // 用另一种方式找错误行
        for (let i = 0; i < lines.length; i++) {
            try {
                new Function(lines.slice(0, i + 1).join('\n'));
            } catch (err) {
                console.log('\n错误首次出现在第 ' + (i + 1) + ' 行:');
                console.log((i > 0 ? i + ': ' + lines[i-1] + '\n' : '') + (i+1) + ': ' + lines[i] + ' <-- 错误');
                if (i < lines.length - 1) console.log((i+2) + ': ' + lines[i+1]);
                break;
            }
        }
    }
    break;
}
