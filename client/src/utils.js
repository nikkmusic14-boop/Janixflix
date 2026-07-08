export const getCleanBase = (t) => {
  if (!t) return '';
  return t
    .toLowerCase()
    .replace(/dubbed/g, '')
    .replace(/dual audio/g, '')
    .replace(/multi audio/g, '')
    .replace(/hindi/g, '')
    .replace(/english/g, '')
    .replace(/telugu/g, '')
    .replace(/tamil/g, '')
    .replace(/malayalam/g, '')
    .replace(/kannada/g, '')
    .replace(/punjabi/g, '')
    .replace(/bengali/g, '')
    .replace(/japanese/g, '')
    .replace(/korean/g, '')
    .replace(/[\[\(]hin[\]\)]/g, '')
    .replace(/[\[\(]eng[\]\)]/g, '')
    .replace(/[\[\(]tel[\]\)]/g, '')
    .replace(/[\[\(]tam[\]\)]/g, '')
    .replace(/\[.*\]/g, '')
    .replace(/\(.*\)/g, '')
    .replace(/\b(19|20)\d{2}\b/g, '') // remove year
    .replace(/s\d+ep\d+/g, '')
    .replace(/s\d+/g, '')
    .replace(/season\s+\d+/g, '')
    .replace(/episode\s+\d+/g, '')
    .replace(/ep\s+\d+/g, '')
    .replace(/-download-\d+\.html$/, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getDisplayTitle = (title) => {
  if (!title) return '';
  return title
    .replace(/\s*[\[\(](?:dubbed|dual audio|multi audio|hindi|english|telugu|tamil|malayalam|kannada|punjabi|bengali|japanese|korean|hin|eng|tel|tam|south indian|dub|sub|multi)[\]\)]/gi, '')
    .replace(/\s*(?:dubbed|dual audio|multi audio|hindi|english|telugu|tamil|malayalam|kannada|punjabi|bengali|japanese|korean|south indian|dub|sub|multi)\b/gi, '')
    .replace(/\s+-\s+download-\d+\.html$/i, '')
    .replace(/\s+\[.*\]/g, '')
    .replace(/\s+\(.*\)/g, '')
    .trim();
};

export const deDuplicateMovies = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  
  for (const item of list) {
    if (!item || !item.title) continue;
    const base = getCleanBase(item.title);
    if (!seen.has(base)) {
      seen.add(base);
      result.push(item);
    }
  }
  return result;
};
