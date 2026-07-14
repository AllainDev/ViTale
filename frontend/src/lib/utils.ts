export function formatPrice(priceStr: string | number | undefined | null): string {
  if (!priceStr) return '-';
  const str = priceStr.toString();
  // Extract all digits from the string
  const digits = str.replace(/\D/g, '');
  if (!digits) return str; // fallback if no digits

  const numericValue = parseInt(digits, 10);
  
  // Format with dot separators (Vietnamese style)
  const formatted = numericValue.toLocaleString('vi-VN');
  
  // We notice some products were entered as '850k', let's fix it by assuming 850 means 850,000 if it was '850k'
  // But wait, if someone typed '850k', \D removes 'k', so digits is '850'. 
  // Then we format '850' as '850 ₫'. That's wrong, it should be 850,000.
  let finalValue = numericValue;
  if (str.toLowerCase().includes('k')) {
    finalValue *= 1000;
  }

  return finalValue.toLocaleString('vi-VN') + ' ₫';
}
