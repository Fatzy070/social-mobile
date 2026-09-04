export const extractUrls = (text: string): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  return text.match(urlRegex) || [];
};

export const parseTextWithLinks = (text: string): Array<{ text: string; isUrl: boolean; url?: string }> => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts: Array<{ text: string; isUrl: boolean; url?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isUrl: false,
      });
    }

    const matchedUrl = match[0];
    const fullUrl = matchedUrl.startsWith('http') ? matchedUrl : `https://${matchedUrl}`;

    parts.push({
      text: matchedUrl,
      isUrl: true,
      url: fullUrl,
    });

    lastIndex = match.index + matchedUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isUrl: false,
    });
  }

  return parts;
};
