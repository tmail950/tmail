export type GeneratedCard = {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  type: string;
};

export const cardUtils = {
  generateLuhn(prefix: string, length: number): string {
    // Ensure prefix is not already too long (must leave room for check digit)
    let card = prefix.slice(0, length - 1);
    
    // Fill up to length - 1
    while (card.length < length - 1) {
      card += Math.floor(Math.random() * 10).toString();
    }

    // Calculate check digit (Luhn Algorithm)
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

  generateRandomCard(bin: string = "", forceMonth?: string, forceYear?: string, forceCvv?: string): GeneratedCard {
    const visaBins = ["4539", "4556", "4916", "4532", "4929", "4024", "4485", "4716", "4226"];
    const masterBins = ["51", "52", "53", "54", "55"];
    
    let prefixInput = bin.replace(/[^0-9xX]/g, '');
    
    // 1. Resolve random placeholders 'x' or 'X'
    let processedPrefix = "";
    if (!prefixInput) {
      const isVisa = Math.random() > 0.5;
      prefixInput = isVisa 
        ? visaBins[Math.floor(Math.random() * visaBins.length)]
        : masterBins[Math.floor(Math.random() * masterBins.length)];
    }

    for (const char of prefixInput) {
      if (char === 'x' || char === 'X') {
        processedPrefix += Math.floor(Math.random() * 10).toString();
      } else {
        processedPrefix += char;
      }
    }

    // 2. Identify Type & Target Specs
    let type = "Credit";
    let targetLength = 16;
    let cvvLength = 3;

    // AMEX: Starts with 34/37, 15 digits, 4-digit CID
    if (processedPrefix.startsWith('34') || processedPrefix.startsWith('37')) {
      type = "Amex";
      targetLength = 15;
      cvvLength = 4;
    } 
    // VISA: Starts with 4, 16 digits
    else if (processedPrefix.startsWith('4')) {
      type = "Visa";
      targetLength = 16;
    }
    // MASTERCARD: 51-55 or 2221-2720
    else if (/^5[1-5]/.test(processedPrefix) || (/^222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720/.test(processedPrefix))) {
      type = "MasterCard";
      targetLength = 16;
    }
    // DISCOVER: 6011, 622126-622925, 644-649, 65
    else if (/^(6011|622|64[4-9]|65)/.test(processedPrefix)) {
      type = "Discover";
      targetLength = 16;
    }
    // UNIONPAY: 62
    else if (processedPrefix.startsWith('62')) {
      type = "UnionPay";
      targetLength = 16;
    }

    // 3. Generate Valid Number
    const number = this.generateLuhn(processedPrefix, targetLength);
    
    // 4. Generate Dates
    const now = new Date();
    const futureYear = now.getFullYear() + Math.floor(Math.random() * 5) + 1;
    const year = forceYear || futureYear.toString().slice(-2);
    const month = forceMonth || (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
    
    // 5. Generate CVV
    let cvv = forceCvv || "";
    if (!forceCvv) {
      if (cvvLength === 4) {
        cvv = Math.floor(Math.random() * 9000 + 1000).toString();
      } else {
        cvv = Math.floor(Math.random() * 900 + 100).toString();
      }
    }

    return {
      number,
      expiryMonth: month,
      expiryYear: year,
      cvv,
      type
    };
  }
};
