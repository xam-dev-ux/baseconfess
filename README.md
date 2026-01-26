# BaseConfess - Anonymous Confessions Onchain

A decentralized, anonymous confession board built on Base L2. Share your secrets safely with a community-moderated platform where privacy is the priority.

## Overview

BaseConfess allows users to share anonymous confessions without any link to their wallet address. The platform uses a simple access model: pay 1 USDC for 30 days of access to post unlimited confessions, react to others, and participate in community moderation.

### Key Features

- **True Anonymity**: Confessions are never linked to wallet addresses - not even onchain
- **Anti-Spam Protection**: USDC payment creates commitment and filters spam
- **Community Moderation**: Members vote on reports to maintain a safe space
- **Rich Interactions**: React and comment anonymously on confessions
- **Categories**: Organize confessions by topic (Love, Work, Secrets, etc.)

## How Anonymity Works

1. **Confession Storage**: The contract stores only a hash of the confession content, not the actual text
2. **No Wallet Link**: The `msg.sender` is deliberately NOT stored when posting confessions or comments
3. **Local Content**: Original content is stored locally in your browser (IndexedDB)
4. **Reactions**: While reactions are linked to wallets (to prevent spam), they're not publicly exposed

## Tech Stack

- **Smart Contracts**: Solidity 0.8.20 with OpenZeppelin
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (dark mode)
- **Web3**: ethers.js v6
- **Mini App**: Farcaster Frame SDK
- **Network**: Base L2 (mainnet)
- **Payment**: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)

## Project Structure

```
baseconfess/
├── contracts/
│   ├── BaseConfess.sol      # Main contract
│   ├── MockUSDC.sol         # Test token
│   └── test/
│       └── BaseConfess.test.js
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types/
│   │   └── context/
│   ├── public/
│   │   └── .well-known/
│   │       └── farcaster.json
│   └── vercel.json
├── scripts/
│   ├── deploy.js
│   ├── verify.js
│   └── interact.js
├── hardhat.config.js
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet
- USDC on Base (for testing/production)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/baseconfess.git
cd baseconfess

# Install root dependencies (Hardhat)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values:
# - PRIVATE_KEY: Your deployer wallet private key
# - BASESCAN_API_KEY: For contract verification
```

### Local Development

```bash
# Terminal 1: Start local Hardhat node
npm run node

# Terminal 2: Deploy to local network
npm run deploy:local

# Terminal 3: Start frontend
cd frontend
npm run dev
```

## Contract Deployment

### Deploy to Base Sepolia (Testnet)

```bash
# Deploy
npm run deploy:base-sepolia

# Verify
CONTRACT_ADDRESS=0x... npm run verify -- --network baseSepolia
```

### Deploy to Base Mainnet

```bash
# Deploy
npm run deploy:base

# Verify
CONTRACT_ADDRESS=0x... npm run verify -- --network base
```

After deployment, update `VITE_CONTRACT_ADDRESS` in your environment.

## Frontend Deployment (Vercel)

### Step 1: Initial Deploy

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Configure settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables:
   - `VITE_CONTRACT_ADDRESS`: Your deployed contract address
   - `VITE_USDC_ADDRESS`: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
6. Deploy

### Step 2: Generate Account Association

1. Go to https://www.base.dev/preview
2. Use the "Account association" tool
3. Enter your Vercel URL
4. Follow the verification steps
5. Copy the generated `header`, `payload`, and `signature`

### Step 3: Update Manifest

Edit `frontend/public/.well-known/farcaster.json`:

```json
{
  "accountAssociation": {
    "header": "YOUR_HEADER",
    "payload": "YOUR_PAYLOAD",
    "signature": "YOUR_SIGNATURE"
  },
  "frame": {
    "homeUrl": "https://your-app.vercel.app",
    "iconUrl": "https://your-app.vercel.app/logo.png",
    ...
  }
}
```

Also update all URLs in the manifest to your actual Vercel URL.

### Step 4: Redeploy

Push changes and Vercel will automatically redeploy.

### Step 5: Verify Mini App

1. Go to https://www.base.dev/preview
2. Enter your Vercel URL
3. Verify everything renders correctly
4. Test the wallet connection and USDC flow

## Contract Interaction

Use the interaction script for manual testing:

```bash
# View available commands
npx hardhat run scripts/interact.js --network base

# Check global stats
CONTRACT_ADDRESS=0x... npx hardhat run scripts/interact.js --network base stats

# Check your access status
CONTRACT_ADDRESS=0x... npx hardhat run scripts/interact.js --network base access

# Purchase access
CONTRACT_ADDRESS=0x... npx hardhat run scripts/interact.js --network base purchase

# Post a confession
CONTRACT_ADDRESS=0x... npx hardhat run scripts/interact.js --network base confess "My secret..." 2

# Read confessions
CONTRACT_ADDRESS=0x... npx hardhat run scripts/interact.js --network base read 1 10
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Gas Costs (Estimated on Base L2)

| Operation | Estimated Gas | ~Cost (at 0.001 gwei) |
|-----------|---------------|----------------------|
| Purchase Access | ~100,000 | < $0.01 |
| Post Confession | ~80,000 | < $0.01 |
| Post Comment | ~70,000 | < $0.01 |
| Add Reaction | ~50,000 | < $0.01 |
| Vote on Report | ~60,000 | < $0.01 |

*Base L2 has significantly lower gas costs than Ethereum mainnet*

## Community Guidelines

### Allowed Content
- Personal confessions and experiences
- Anonymous thoughts and feelings
- Work-related frustrations
- Relationship stories
- Life reflections

### Prohibited Content
- Illegal content (CSAM, threats, etc.)
- Doxxing or personal information
- Targeted harassment
- Spam or promotional content
- Content that violates laws

### Moderation Process

1. Any member can report content
2. Reports go to community voting
3. 10 votes needed to resolve
4. 70% approval removes content
5. Removed content shows "[Hidden by community moderation]"

## Security Considerations

- **Anonymity**: Confessions/comments never store `msg.sender`
- **Access Control**: All sensitive functions require active access
- **Anti-Spam**: Daily limits and cooldowns prevent abuse
- **Reentrancy**: Protected with OpenZeppelin's ReentrancyGuard
- **USDC Integration**: Uses SafeERC20 for safe token transfers

## Troubleshooting

### "No wallet found"
Install MetaMask or another Web3 wallet.

### "Wrong network"
The app will prompt you to switch to Base. Click accept.

### "Insufficient USDC"
You need at least 1 USDC on Base. Options:
- Swap ETH for USDC on [Uniswap](https://app.uniswap.org)
- Bridge USDC from Ethereum using [Base Bridge](https://bridge.base.org)

### "Cooldown not elapsed"
Wait for the cooldown period:
- Confessions: 5 minutes
- Comments: 1 minute
- Reports: 1 hour

### Manifest not loading
Ensure `.well-known/farcaster.json` is accessible at `https://your-url.vercel.app/.well-known/farcaster.json`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Base Documentation](https://docs.base.org)
- [Base Mini Apps Guide](https://docs.base.org/building-with-base/guides/mini-apps)
- [Farcaster Frames SDK](https://docs.farcaster.xyz/developers/frames/spec)
- [USDC on Base](https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- [Basescan](https://basescan.org)
- [BaseConfess Contract](https://basescan.org/address/0x962CbDb3aA822F72d07569D7d2f80c7630A63d6E)

---

Built with privacy in mind on Base L2.
