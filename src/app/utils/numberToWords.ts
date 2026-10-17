export function numberToWords(number: number, language: 'ar' | 'en'): string {
  if (number === 0) return language === 'ar' ? "صفر ريال سعودي فقط لا غير" : "zero Saudi Riyals only";

  const config = {
    ar: {
      units: ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"],
      teens: ["", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"],
      tens: ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"],
      hundreds: ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"],
      thousands: ["", "ألف", "ألفان", "مليون", "مليار"],
      and: "و",
      currency: "ريال سعودي فقط لا غير",
      currencyFraction: "هللة"
    },
    en: {
      units: ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
      teens: ["", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"],
      tens: ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"],
      hundreds: "hundred",
      thousands: ["", "thousand", "million", "billion"],
      and: "and",
      currency: "Saudi Riyals only",
      currencyFraction: "halala"
    }
  };

  const lang = config[language];

  function convertLessThanThousand(num: number, isFirstPart: boolean = false): string {
    let result = "";

    // Process hundreds
    if (num >= 100) {
      const hundredsDigit = Math.floor(num / 100);
      result += lang.hundreds[hundredsDigit];
      num %= 100;
      if (num > 0) result += ` ${lang.and} `;
    }

    // Process teens
    if (num >= 11 && num <= 19) {
      result += lang.teens[num - 10];
      return result.trim();
    }

    // Process tens and units
    if (num >= 10) {
      result += lang.tens[Math.floor(num / 10)];
      num %= 10;
      if (num > 0) result += ` ${lang.and} `;
    }
    if (num > 0) {
      result += lang.units[num];
    }

    return result.trim();
  }

  function handleDecimal(decimalPart: number): string {
    if (decimalPart === 0) return "";
    return `${convertLessThanThousand(decimalPart)} ${lang.currencyFraction}`;
  }

  const integerPart = Math.floor(number);
  const decimalPart = Math.round((number - integerPart) * 100);

  let numStr = "";
  let i = 0;

  let tempIntegerPart = integerPart; // Use a mutable variable for processing
  while (tempIntegerPart > 0) {
    let part = tempIntegerPart % 1000;

    if (part > 0) {
      let partStr = convertLessThanThousand(part, i === 0);

      // Special case for thousands in Arabic
      if (language === 'ar' && part === 1 && i === 1) {
        partStr = lang.thousands[1]; // ألف
      } else if (language === 'ar' && part === 2 && i === 1) {
        partStr = lang.thousands[2]; // ألفان
      } else if (lang.thousands[i]) {
        partStr += ` ${lang.thousands[i]}`;
      }

      numStr = partStr + (numStr ? ` ${lang.and} ` + numStr : "");
    }
    tempIntegerPart = Math.floor(tempIntegerPart / 1000);
    i++;
  }

  const decimalWords = handleDecimal(decimalPart);
  const fullWords = decimalWords
    ? `${numStr} ${lang.currency} ${lang.and} ${decimalWords}`
    : `${numStr} ${lang.currency}`;

  return fullWords.trim();
}
