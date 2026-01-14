const fs = require('fs');

const svgContent = fs.readFileSync('tamplate.svg', 'utf8');

// Regex helpers to find tags with specific attributes
// This is not a full SVG parser but enough to find <circle ... fill="white"> etc.

function findElements(tag, attr, value) {
    const regex = new RegExp(`<${tag}[^>]*${attr}=["']${value}["'][^>]*>`, 'gi');
    return svgContent.match(regex) || [];
}

function findWhiteCircles() {
    console.log("--- Searching for Circles ---");
    // Look for <circle ... >
    const circles = svgContent.match(/<circle[^>]*>/gi) || [];
    circles.forEach(c => {
        console.log("Found Circle:", c);
    });
}

function findWhiteFills() {
    console.log("\n--- Searching for White Fills ---");
    // Look for anything with fill="#ffffff" or fill="white"
    const white = svgContent.match(/<[^>]+fill=["'](?:#ffffff|white)["'][^>]*>/gi) || [];
    white.forEach(e => {
        // limit output length
        console.log("Found White Element:", e.substring(0, 200));
    });
}

function findLegacyPlaceholders() {
    console.log("\n--- Searching for Legacy Placeholders ---");
    const colored = svgContent.match(/<[^>]+fill=["'](?:#00ff00|green|#ff0000|red)["'][^>]*>/gi) || [];
    colored.forEach(e => {
        console.log("Found Colored Element:", e.substring(0, 200));
    });
}

function findClipPaths() {
    console.log("\n--- Searching for ClipPath IDs ---");
    // Just find ids of clipPaths
    let match;
    const regex = /<clipPath[^>]*id=["']([^"']+)["'][^>]*>/gi;
    while ((match = regex.exec(svgContent)) !== null) {
        console.log("ClipPath ID:", match[1]);
        // Try to peek content? It's hard with regex on a single line if nested.
        // We'll rely on identifying the mask/clip by ID if we see a candidate.
    }
}

findWhiteCircles();
findWhiteFills();
findLegacyPlaceholders();
findClipPaths();
