const htmlContent = '<div data-type="moodboard" data-payload="' + encodeURIComponent('<img src="https://example.com/img.jpg" onerror="this.onerror=null; this.src=\'https://thumb.com/thumb.jpg\';" class="mb-image">') + '"></div>';

let images = [];
const extractImagesFromHtml = (html) => {
  const imgRegex = /<img[^>]+>/g;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/);
    const fallbackMatch = imgTag.match(/this\.src=["']([^"']+)["']/);
    if (srcMatch) {
      images.push({ src: srcMatch[1], fallback: fallbackMatch ? fallbackMatch[1] : null });
    }
  }
};

const payloadRegex = /data-payload=(["'])(.*?)\1/g;
let payloadMatch;
while ((payloadMatch = payloadRegex.exec(htmlContent)) !== null) {
  const rawPayload = payloadMatch[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  const decodedPayload = decodeURIComponent(rawPayload);
  console.log("Decoded payload:", decodedPayload);
  extractImagesFromHtml(decodedPayload);
}

console.log("Images extracted:", images);
