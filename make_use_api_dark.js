const fs = require('fs');

const detailPage = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/agents/[id]/page.tsx';
const listPage = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/agents/page.tsx';
const marketPage = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/marketplace/page.tsx';

function makeDark(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Background color
    content = content.replace(/bg-\[#140d08\]/g, 'bg-[#0a0a0c]');
    content = content.replace(/bg-\[#120b07\]/g, 'bg-[#0a0a0c]');
    
    // Background image
    content = content.replace(/bg-\[url\('\/background\/.*?'\)\]/g, "bg-[url('/background/slide33.png')]");
    
    // Opacity
    content = content.replace(/opacity-10/g, 'opacity-15');
    content = content.replace(/opacity-20/g, 'opacity-15');
    
    fs.writeFileSync(file, content);
}

makeDark(detailPage);
makeDark(listPage);
makeDark(marketPage);
