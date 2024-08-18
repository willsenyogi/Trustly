const crypto = require('crypto');

function generateAccountNumber(length = 10) {
    let accountNumber;
    do {
        accountNumber = generateRandomNumber(length);
    } while (accountNumberExists(accountNumber));
    return accountNumber;
}

function generateCardNumber(length = 16) {
    let cardNumber;
    do {
        cardNumber = generateRandomDigits(length - 1);
        cardNumber += calculateLuhnCheckDigit(cardNumber);
    } while (cardNumberExists(cardNumber));
    return cardNumber;
}

function generateRandomNumber(length) {
    const bytes = crypto.randomBytes(length);
    let number = BigInt('0x' + bytes.toString('hex')).toString().padStart(length, '0');
    number = number.slice(0, length); // Ensure the length is correct
    return number;
}

function generateRandomDigits(length) {
    return generateRandomNumber(length);
}

function calculateLuhnCheckDigit(number) {
    let sum = 0;
    let shouldDouble = true;
    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number.charAt(i), 10);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (10 - (sum % 10)) % 10;
}

function accountNumberExists(number) {
    return false;
}

function cardNumberExists(number) {
    return false;
}

module.exports = { generateAccountNumber, generateCardNumber };
