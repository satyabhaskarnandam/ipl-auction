/**
 * Format amount in Crores to display as Lakh (L) if less than 1 Cr
 * @param {number} crAmount - Amount in Crores
 * @returns {string} - Formatted string with L or Cr
 */
export const formatAmount = (crAmount) => {
  const amount = Number(crAmount);
  if (!Number.isFinite(amount) || amount === 0) return "0.00L";

  if (amount < 1) {
    // Convert to Lakh (1 Cr = 100 Lakh, so multiply by 100)
    const lakh = amount * 100;
    return `${lakh.toFixed(2)}L`;
  }

  // Return as Cr with proper decimal formatting
  return `${amount.toFixed(2)} Cr`;
};
