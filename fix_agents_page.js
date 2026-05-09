const fs = require('fs');
const file = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/agents/page.tsx';
let content = fs.readFileSync(file, 'utf8');
const modalCode = `
      {forkingAgent && (
        <ForkModal
          agent={forkingAgent}
          onClose={() => setForkingAgent(null)}
          onSuccess={(tx) => {
            setSuccessTx(tx);
            setForkingAgent(null);
            setForkMessage('Forked successfully! Tx: ' + tx.slice(0, 8) + '...');
            window.location.reload();
          }}
        />
      )}`;

content = content.replace('    </div>\n  );\n}', modalCode + '    </div>\n  );\n}');
fs.writeFileSync(file, content);
