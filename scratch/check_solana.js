const { Connection, PublicKey } = require('@solana/web3.js');

async function checkProgram() {
    const rpc = 'https://api.testnet.solana.com';
    const programId = '6tpsQxcZaHaj8zJsRv5tHWCpeQ2HT7bBrxC3y4MCaRCi';
    const conn = new Connection(rpc, 'confirmed');
    
    console.log(`Checking Program ${programId} on ${rpc}...`);
    
    try {
        const info = await conn.getAccountInfo(new PublicKey(programId));
        if (info) {
            console.log('Program Found!');
            console.log('Owner:', info.owner.toString());
            console.log('Executable:', info.executable);
        } else {
            console.log('PROGRAM NOT FOUND! This is why you get the error.');
        }
    } catch (e) {
        console.error('Error fetching program info:', e.message);
    }
}

checkProgram();
