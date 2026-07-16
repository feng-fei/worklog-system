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
    
    // 二分法查找错误
    const lines = content.split('\n');
    let low = 0;
    let high = lines.length - 1;
    let errorLine = -1;
    
    // 先确认整体有错误
    try {
        new Function(content);
        console.log('没有错误');
        break;
    } catch (e) {
        console.log('确认有错误:', e.message);
    }
    
    // 用不同的方式 - 从后往前删除，找到第一个能通过的位置
    for (let i = lines.length - 1; i >= 0; i -= 50) {
        const testCode = lines.slice(0, Math.max(1, i)).join('\n');
        try {
            new Function(testCode);
        } catch (e) {
            errorLine = i;
            console.log('错误在 ' + i + ' 行之前');
        }
    }
    
    if (errorLine > 0) {
        console.log('\n错误附近的代码:');
        for (let i = Math.max(0, errorLine - 20); i < Math.min(lines.length, errorLine + 5); i++) {
            console.log((i + 1) + ': ' + lines[i]);
        }
    }
    
    break;
}
