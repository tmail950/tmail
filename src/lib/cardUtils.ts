export type GeneratedCard = {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  type: string;
};

export const cardUtils = {
  generateLuhn(prefix: string, length: number): string {
    let card = prefix;
    while (card.length < length - 1) {
      card += Math.floor(Math.random() * 10);
    }

    // Calculate check digit
    let sum = 0;
    let shouldDouble = true;
    for (let i = card.length - 1; i >= 0; i--) {
      let digit = parseInt(card.charAt(i));
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return card + checkDigit;
  },

  generateRandomCard(bin: string = ""): GeneratedCard {
    // Standard BINs if none provided
    const visaBins = ["4539", "4556", "4916", "4532", "4929", "4024", "4485", "4716", "4226"];
    const masterBins = ["51", "52", "53", "54", "55"];
    
    let prefix = bin.replace(/[^0-9xX]/g, '');
    let type = "unknown";

    if (!prefix) {
      const isVisa = Math.random() > 0.5;
      prefix = isVisa 
        ? visaBins[Math.floor(Math.random() * visaBins.length)]
        : masterBins[Math.floor(Math.random() * masterBins.length)];
    }

    // Handle "x" or "X" in BIN (e.g. 453xxx)
    let processedPrefix = "";
    for (const char of prefix) {
      if (char === 'x' || char === 'X') {
        processedPrefix += Math.floor(Math.random() * 10).toString();
      } else {
        processedPrefix += char;
      }
    }

    // Determine type for UI display
    if (processedPrefix.startsWith('4')) type = "Visa";
    else if (/^5[1-5]/.test(processedPrefix)) type = "MasterCard";
    else if (processedPrefix.startsWith('34') || processedPrefix.startsWith('37')) type = "Amex";
    else type = "Credit";

    const number = this.generateLuhn(processedPrefix, 16);
    
    // Dates
    const now = new Date();
    const futureYear = now.getFullYear() + Math.floor(Math.random() * 5) + 1;
    const month = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
    
    // CVV
    const cvv = Math.floor(Math.random() * 900 + 100).toString();

    return {
      number,
      expiryMonth: month,
      expiryYear: futureYear.toString().slice(-2),
      cvv,
      type
    };
  }
};
