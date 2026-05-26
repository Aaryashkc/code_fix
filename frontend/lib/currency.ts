export function formatNPR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-NP')}`;
}

export function formatNPRShort(amount: number): string {
  if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `Rs. ${(amount / 1000).toFixed(1)}K`;
  }
  return `Rs. ${amount.toLocaleString('en-NP')}`;
}
