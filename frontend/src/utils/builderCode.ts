import { Attribution } from 'ox/erc8021';
import { JsonRpcSigner, type TransactionRequest, type TransactionResponse } from 'ethers';

// Builder Code from base.dev
const BUILDER_CODE = 'bc_ut4gkcr1';

// Generate the data suffix for attribution
export const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BUILDER_CODE],
});

/**
 * Custom signer that automatically appends Builder Code to all transactions
 * This enables attribution tracking on Base according to ERC-8021
 */
export class BuilderCodeSigner extends JsonRpcSigner {
  /**
   * Override sendTransaction to append builder code to calldata
   */
  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    // Append builder code suffix to transaction data
    const modifiedTx = { ...tx };

    if (modifiedTx.data) {
      // Append the suffix to existing data
      modifiedTx.data = modifiedTx.data + DATA_SUFFIX.slice(2); // Remove '0x' prefix from suffix
    } else {
      // If no data, just add the suffix
      modifiedTx.data = DATA_SUFFIX;
    }

    return super.sendTransaction(modifiedTx);
  }
}
