const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');