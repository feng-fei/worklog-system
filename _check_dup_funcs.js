const fs = require('fs');
const content = fs.readFileSync('C:/Users/Administrator/Documents/traework/_temp_script2.js', 'utf8');
const lines = content.split('\n');

const funcNames = {};
for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^function (\w+)\s*\(/);
    if (match) {
        const name = match[1];
        if (!funcNames[name]) funcNames[name] = [];
        funcNames[name].push(i + 1);
    }
}

console.log('重复的函数:');
for (const name in funcNames) {
    if (funcNames[name].length > 1) {
        console.log(`  ${name}: ${funcNames[name].join(', ')} 行`);
    }
}

console.log('\n所有函数:');
for (const name in funcNames) {
    console.log(`  ${name}: ${funcNames[name].length}次定义`);
}
