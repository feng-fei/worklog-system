const fs = require('fs');
const html = fs.readFileSync('C:/Users/Administrator/Documents/traework/index.html', 'utf8');

// 找到最后一个script标签的内容
const lastScriptStart = html.lastIndexOf('<script>');
const lastScriptEnd = html.lastIndexOf('</script>');

if (lastScriptStart > 0 && lastScriptEnd > lastScriptStart) {
    const scriptContent = html.substring(lastScriptStart + 8, lastScriptEnd);
    console.log('最后一个script标签长度:', scriptContent.length, '字符');
    
    try {
        new Function(scriptContent);
        console.log('✅ 最后一个script标签语法正确');
    } catch (e) {
        console.log('❌ 语法错误:', e.message);
        
        // 尝试找到错误行
        const lines = scriptContent.split('\n');
        const match = e.message.match(/line (\d+)/i);
        if (match) {
            const lineNum = parseInt(match[1]);
            console.log(`\n错误行 (${lineNum}):`);
            for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 2); i++) {
                console.log(`${i + 1}: ${lines[i]}`);
            }
        }
    }
} else {
    console.log('未找到最后一个script标签');
}
