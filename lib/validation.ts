/**
 * Validates an Injective address format
 * Injective addresses start with 'inj' and are bech32 encoded
 */
export const isValidInjectiveAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }

  const trimmed = address.trim();

  // Check format: must start with 'inj' and be ~42-44 characters (bech32)
  const injectivePattern = /^inj1[a-z0-9]{38,39}$/;
  return injectivePattern.test(trimmed);
};

/**
 * Validates an amount is a valid number and positive
 */
export const isValidAmount = (amount: string | number): boolean => {
  try {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(num) && num > 0;
  } catch {
    return false;
  }
};

/**
 * Removes duplicate addresses from a list, keeping the first occurrence
 */
export const deduplicateAddresses = <T extends { address: string }>(
  items: T[]
): { deduplicated: T[]; duplicates: string[] } => {
  const seen = new Set<string>();
  const deduplicated: T[] = [];
  const duplicates: string[] = [];

  items.forEach((item) => {
    const address = item.address.trim().toLowerCase();
    if (seen.has(address)) {
      if (!duplicates.includes(address)) {
        duplicates.push(address);
      }
    } else {
      seen.add(address);
      deduplicated.push(item);
    }
  });

  return { deduplicated, duplicates };
};

/**
 * Estimates gas fees for a transaction
 * Basic estimation: 200000 gas * gas price
 */
export const estimateGasFee = (
  gasPrice: number = 0.000000025, // Default Injective gas price
  gasLimit: number = 200000
): string => {
  const fee = gasPrice * gasLimit;
  return fee.toFixed(10);
};

/**
 * Formats address for display (shows first and last 8 chars)
 */
export const formatAddress = (address: string): string => {
  if (!address || address.length < 16) {
    return address;
  }
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
};

/**
 * Validates and cleans CSV data
 */
export interface ValidatedCSVData {
  valid: Array<{ address: string; amount: string }>;
  invalid: Array<{ row: number; address: string; amount: string; error: string }>;
  duplicates: string[];
}

export const validateCSVData = (
  rows: Array<{ address: string; amount: string }>
): ValidatedCSVData => {
  const valid: Array<{ address: string; amount: string }> = [];
  const invalid: Array<{ row: number; address: string; amount: string; error: string }> = [];
  const duplicateSet = new Set<string>();

  rows.forEach((row, index) => {
    const address = row.address?.trim() || '';
    const amount = row.amount?.trim() || '';

    let error = '';

    // Validate address
    if (!address) {
      error = 'Empty address';
    } else if (!isValidInjectiveAddress(address)) {
      error = 'Invalid Injective address format';
    }

    // Validate amount
    if (!amount) {
      error = error ? `${error}; Empty amount` : 'Empty amount';
    } else if (!isValidAmount(amount)) {
      error = error ? `${error}; Invalid amount` : 'Invalid amount (must be positive number)';
    }

    if (error) {
      invalid.push({
        row: index + 1,
        address,
        amount,
        error,
      });
    } else {
      // Check for duplicates
      const normalizedAddress = address.toLowerCase();
      if (duplicateSet.has(normalizedAddress)) {
        invalid.push({
          row: index + 1,
          address,
          amount,
          error: 'Duplicate address (first occurrence will be used)',
        });
      } else {
        duplicateSet.add(normalizedAddress);
        valid.push({ address, amount });
      }
    }
  });

  return {
    valid,
    invalid,
    duplicates: Array.from(duplicateSet),
  };
};
