// Build a public record from an explicit allowlist instead of copying the private input object.
export function publicReceipt(record) {
  const result = { id: record.id, commitment: record.commitment, revealed: record.revealed };
  // A sealed choice must stay absent until the contract has actually revealed it.
  if (record.revealed) result.value = record.value;
  return result;
}
