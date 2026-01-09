
// Utility to parse Telegram messages and extract metadata
// Matches: Optional Flag + Country Name + " - " + Center Name
const headerRegex = /(?:^|\n)(?:[^\w\s].*?)?\s*([A-Za-z\s]+?)\s*-\s*([A-Za-z\s]+)(?:\n|$)/;
const typeRegex = /▶️\s*(Regular|Prime)/i;

export function parseMessage(text) {
    const result = {
        country: 'Unknown',
        center: 'Unknown',
        isPrime: false
    };

    if (!text) return result;

    const headerMatch = text.match(headerRegex);
    if (headerMatch) {
        result.country = headerMatch[1].trim();
        result.center = headerMatch[2].trim();
    }

    const typeMatch = text.match(typeRegex);
    if (typeMatch && typeMatch[1].toLowerCase().includes('prime')) {
        result.isPrime = true;
    }

    return result;
}
