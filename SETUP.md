# Injective Airdrop Tool - Setup Guide

## Prerequisites

Before using this tool, you need:

1. **Keplr Wallet** - Browser extension for managing Injective wallets
2. **Test INJ Tokens** - From the testnet faucet
3. **Injective Testnet** - Added to your Keplr wallet

---

## Step 1: Install Keplr Wallet

1. Visit [Keplr Official Website](https://www.keplr.app)
2. Download the browser extension for Chrome, Firefox, or Edge
3. Complete the setup process
4. Create or import a wallet

---

## Step 2: Add Injective Testnet to Keplr

### Automatic Setup (Recommended)
1. Open the app and click "Connect Keplr Wallet"
2. Keplr will automatically suggest adding the testnet chain
3. Click "Approve" to add it

### Manual Setup
If automatic setup doesn't work:

1. Open Keplr extension
2. Click the network dropdown (top of popup)
3. Scroll down and click "Add a new chain"
4. Use these settings:
   - **Chain ID**: `injective-888`
   - **Chain Name**: Injective Testnet
   - **RPC Endpoint**: `https://testnet-rpc.injective.dev`
   - **REST Endpoint**: `https://testnet-rest.injective.dev`
   - **Staking Currency**: INJ
   - **Decimals**: 18

---

## Step 3: Get Testnet INJ Tokens

### From Faucet
1. Go to [Injective Testnet Faucet](https://testnet-faucet.injective.dev/)
2. Enter your wallet address (inj1...)
3. Request tokens (usually 10 INJ per request)
4. Wait for confirmation (typically 1-2 minutes)

### Verify Tokens
1. Open Keplr extension
2. Switch to "Injective Testnet" network
3. You should see your INJ balance

---

## Step 4: Prepare Your CSV File

Create a CSV file with two columns: `address` and `amount`

### Example CSV Format
```csv
address,amount
inj1abc123xyz789...,10.5
inj1def456uvw012...,20.0
inj1ghi789rst345...,15.25
```

### Requirements
- **Header row required**: Must have `address` and `amount` columns
- **Valid addresses**: Must start with `inj1` followed by 38-39 characters
- **Valid amounts**: Must be positive numbers (decimals OK)
- **No empty rows**: All data rows must have both address and amount

### Tips
- Export from Excel/Sheets as CSV (.csv)
- Use a text editor if manual creation needed
- Avoid extra whitespace before/after values
- Double-check address format before uploading

---

## Step 5: Use the Airdrop Tool

1. **Upload CSV**: Click "Upload CSV" and select your file
2. **Preview**: Tool shows first 5 recipients
3. **Connect Wallet**: Click "Connect Keplr Wallet"
4. **Review**: Check total recipients and amount
5. **Send**: Click "Send All Tokens" to start batch sending
6. **Monitor**: Watch progress in real-time
7. **Verify**: Check transaction hashes on block explorer

---

## Verify Transactions

### Block Explorer
1. Go to [Injective Testnet Explorer](https://testnet.explorer.injective.dev/)
2. Paste transaction hash from the table
3. View transaction details including:
   - Sender address
   - Recipient address
   - Amount sent
   - Gas used
   - Block height

### Check Recipient Balance
1. Go to [Injective Testnet Explorer](https://testnet.explorer.injective.dev/)
2. Search for the recipient address
3. View their account balance

---

## Troubleshooting

### "Keplr not installed"
- Install Keplr extension from [keplr.app](https://www.keplr.app)
- Refresh the page after installation

### "User rejected connection"
- Check Keplr notification (might be hidden behind browser tabs)
- Click "Approve" in the Keplr popup
- If popup doesn't appear, try again

### "Chain not found"
- The testnet chain must be added to Keplr first
- Follow Step 2 above (Add Injective Testnet)
- Keplr should auto-suggest when you click Connect

### "Invalid Injective address format"
- Addresses must start with `inj1`
- Check for typos or extra spaces in CSV
- Use the validation preview before sending

### "Insufficient balance"
- Request more tokens from the faucet
- Wait for previous faucet request to complete
- Check your wallet balance in Keplr

### "Transaction failed"
- Check gas limit (minimum 200000 gas)
- Verify recipient addresses are valid
- Check the block explorer for error details

---

## Features

### CSV Upload
- Drag & drop or click to select CSV file
- Validates headers (address, amount required)
- Shows first 5 rows preview
- Displays validation errors and warnings

### Wallet Connection
- One-click Keplr connection
- Shows connected address
- Secure signing with Keplr

### Batch Sending
- Send to multiple recipients at once
- Real-time progress tracking
- 1-second delay between transactions
- Continues even if individual transaction fails

### Transaction Tracking
- Live status updates (Pending → Success/Failed)
- Transaction hash display
- Copy hash to clipboard
- Gas fee estimation

### Retry Failed
- Retry button for failed transactions
- Retry all failed in one click
- Shows count of failed transactions

### Validation
- Address format validation (Injective bech32)
- Amount validation (positive numbers)
- Duplicate detection (removes duplicates)
- Empty field detection

---

## Network Details

**Testnet**: Injective 888
- **Chain ID**: injective-888
- **RPC**: https://testnet-rpc.injective.dev
- **REST**: https://testnet-rest.injective.dev
- **Explorer**: https://testnet.explorer.injective.dev/
- **Faucet**: https://testnet-faucet.injective.dev/

---

## Security Notes

1. **Private Keys**: Never enter private keys in web forms
2. **Keplr Signs**: Keplr extension handles all signing
3. **Gas Fees**: Testnet usually has no gas fees
4. **Addresses**: Always verify recipient addresses match CSV
5. **CSV Files**: Keep CSV files safe if containing real addresses

---

## Support

- **Injective Docs**: https://docs.injective.network/
- **Keplr Support**: https://help.keplr.app/
- **Block Explorer**: https://testnet.explorer.injective.dev/
- **Community**: Injective Discord or Forum

---

## Tips for Batch Sending

1. **Test First**: Send small amounts to a few test addresses first
2. **Group Amounts**: Similar amounts are easier to verify
3. **Monitor Progress**: Watch the progress bar for real-time updates
4. **Copy Hashes**: Save transaction hashes for records
5. **Check Explorer**: Verify a few transactions on block explorer
6. **Retry Failed**: Use the retry button for any failed transactions

---

Good luck with your airdrop!
