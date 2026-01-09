const samples = [
    `🇧🇪 Belgium - London

▶️ Regular 
- 21.01.2026 - 08:30, 12:00
- 22.01.2026 - 09:30, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30`,

    `🇩🇪 Germany - London

▶️ Regular 
- 13.01.2026 - 08:30`,

    `Other - Sample - Test
▶️ Prime Time
- 01.01.2026`
];

function parseMessage(text) {
    const result = {
        country: 'Unknown',
        center: 'Unknown',
        isPrime: false,
        dates: []
    };

    // 1. Extract Country and Center
    // Matches: Optional Flag (surrogate pairs or non-word chars) + Country Name + " - " + Center Name
    // ex: "🇧🇪 Belgium - London" -> Country: Belgium, Center: London
    // We use a simpler approach: match word chars followed by " - "
    const headerRegex = /(?:^|\n)(?:[^\w\s].*?)?\s*([A-Za-z\s]+?)\s*-\s*([A-Za-z\s]+)(?:\n|$)/;
    const headerMatch = text.match(headerRegex);

    if (headerMatch) {
        result.country = headerMatch[1].trim();
        result.center = headerMatch[2].trim();
    }

    // 2. Extract Type (Regular/Prime)
    const typeRegex = /▶️\s*(Regular|Prime|Platinum)/i;
    const typeMatch = text.match(typeRegex);
    if (typeMatch) {
        result.isPrime = typeMatch[1].toLowerCase().includes('prime');
    }

    // 3. (Optional) Extract Dates for verification
    const dateRegex = /(\d{2}\.\d{2}\.\d{4})/g;
    const dateMatches = text.match(dateRegex);
    if (dateMatches) {
        result.dates = dateMatches;
    }

    return result;
}

samples.forEach((msg, i) => {
    console.log(`--- Message ${i + 1} ---`);
    console.log(parseMessage(msg));
});
