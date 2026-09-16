/** Extracts a percentage from a free-text tax label like "GST 5%" and returns it as a decimal
    rate (0.05). Falls back to 0 when the label has no parseable number. */
export function parseTaxRate(salesTax: string): number {
  const match = salesTax.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) / 100 : 0;
}
