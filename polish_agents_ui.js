const fs = require('fs');

const agentsPage = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/agents/page.tsx';
const detailPage = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/agents/[id]/page.tsx';

function polish(file, isDetail = false) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Header
    content = content.replace('Imperium Agents', 'Legion of Praetorians');
    content = content.replace('AI agent execution console', 'Praetorian execution console');
    content = content.replace('User wallet', 'Wallet of the Legion');
    content = content.replace('Developers Toolkit', 'Toolkit of the Architects');
    content = content.replace('How To Use CLI', 'Manual of the Centurion');
    
    // Backgrounds
    content = content.replace(/bg-\[#140d08\]/g, 'bg-[#120b07]');
    content = content.replace(/bg-white\/\[0\.03\]/g, 'bg-white/[0.04]');
    
    // Typography
    content = content.replace(/font-syne text-4xl/g, 'font-cinzel text-4xl');
    content = content.replace(/font-syne text-3xl/g, 'font-cinzel text-3xl');
    content = content.replace(/font-syne text-2xl/g, 'font-cinzel text-2xl');
    content = content.replace(/font-syne text-xl/g, 'font-cinzel text-xl');
    content = content.replace(/font-syne/g, 'font-cinzel');
    
    // Accents
    content = content.replace(/text-\[#00FFE5\]/g, 'text-[#d4af37]');
    content = content.replace(/bg-\[#00FFE5\]/g, 'bg-[#d4af37]');
    content = content.replace(/hover:bg-\[#0ef2dc\]/g, 'hover:bg-[#c69b2f]');
    content = content.replace(/border-\[rgba\(0,255,229,0\.2\)\]/g, 'border-[rgba(212,175,55,0.3)]');
    
    fs.writeFileSync(file, content);
}

polish(agentsPage);
polish(detailPage, true);
