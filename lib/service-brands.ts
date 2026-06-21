export interface ServiceBrand {
  name:  string
  short: string
  color: string
  text:  string
}

const BRANDS: [string, ServiceBrand][] = [
  ['uber eats',   { name: 'Uber Eats',    short: 'Ü',   color: '#06C167', text: '#fff' }],
  ['prime video', { name: 'Prime Video',  short: '▶',   color: '#00A8E0', text: '#fff' }],
  ['mercado pago',{ name: 'Mercado Pago', short: 'MP',  color: '#009EE3', text: '#fff' }],
  ['globoplay',   { name: 'Globoplay',    short: 'G',   color: '#003A8C', text: '#fff' }],
  ['paramount',   { name: 'Paramount+',   short: 'P+',  color: '#0064FF', text: '#fff' }],
  ['crunchyroll', { name: 'Crunchyroll',  short: 'CR',  color: '#F47521', text: '#fff' }],
  ['chatgpt',     { name: 'ChatGPT',      short: 'AI',  color: '#10A37F', text: '#fff' }],
  ['microsoft',   { name: 'Microsoft',    short: 'M',   color: '#00A4EF', text: '#fff' }],
  ['linkedin',    { name: 'LinkedIn',     short: 'in',  color: '#0A66C2', text: '#fff' }],
  ['coursera',    { name: 'Coursera',     short: 'C',   color: '#0056D2', text: '#fff' }],
  ['hotmart',     { name: 'Hotmart',      short: 'H',   color: '#FF4B26', text: '#fff' }],
  ['youtube',     { name: 'YouTube',      short: '▶',   color: '#FF0000', text: '#fff' }],
  ['spotify',     { name: 'Spotify',      short: '♫',   color: '#1DB954', text: '#000' }],
  ['netflix',     { name: 'Netflix',      short: 'N',   color: '#E50914', text: '#fff' }],
  ['disney',      { name: 'Disney+',      short: 'D+',  color: '#113CCF', text: '#fff' }],
  ['amazon',      { name: 'Amazon',       short: 'a',   color: '#FF9900', text: '#000' }],
  ['twitch',      { name: 'Twitch',       short: '▶',   color: '#9146FF', text: '#fff' }],
  ['openai',      { name: 'OpenAI',       short: 'AI',  color: '#10A37F', text: '#fff' }],
  ['github',      { name: 'GitHub',       short: '<>',  color: '#24292E', text: '#fff' }],
  ['discord',     { name: 'Discord',      short: 'D',   color: '#5865F2', text: '#fff' }],
  ['notion',      { name: 'Notion',       short: 'N',   color: '#111111', text: '#fff' }],
  ['figma',       { name: 'Figma',        short: 'F',   color: '#F24E1E', text: '#fff' }],
  ['adobe',       { name: 'Adobe',        short: 'Ai',  color: '#FF0000', text: '#fff' }],
  ['canva',       { name: 'Canva',        short: 'C',   color: '#00C4CC', text: '#fff' }],
  ['slack',       { name: 'Slack',        short: '#',   color: '#4A154B', text: '#fff' }],
  ['steam',       { name: 'Steam',        short: 'S',   color: '#1B2838', text: '#c6d4df' }],
  ['nubank',      { name: 'Nubank',       short: 'Nu',  color: '#820AD1', text: '#fff' }],
  ['apple',       { name: 'Apple',        short: 'A',   color: '#555555', text: '#fff' }],
  ['rappi',       { name: 'Rappi',        short: 'R',   color: '#FF441F', text: '#fff' }],
  ['ifood',       { name: 'iFood',        short: 'iF',  color: '#EA1D2C', text: '#fff' }],
  ['uber',        { name: 'Uber',         short: 'U',   color: '#000000', text: '#fff' }],
  ['hbo',         { name: 'HBO Max',      short: 'HBO', color: '#5822B4', text: '#fff' }],
  ['max',         { name: 'Max',          short: 'M',   color: '#5822B4', text: '#fff' }],
  ['deezer',      { name: 'Deezer',       short: 'Dz',  color: '#FF0092', text: '#fff' }],
  ['google',      { name: 'Google',       short: 'G',   color: '#4285F4', text: '#fff' }],
  ['dropbox',     { name: 'Dropbox',      short: '⬡',   color: '#0061FF', text: '#fff' }],
  ['udemy',       { name: 'Udemy',        short: 'U',   color: '#EC5252', text: '#fff' }],
]

export function getServiceBrand(name?: string | null): ServiceBrand | null {
  if (!name) return null
  const lower = name.toLowerCase()
  for (const [key, brand] of BRANDS) {
    if (lower.includes(key)) return brand
  }
  return null
}

const QUICK_BILL_KEYS = [
  'netflix', 'spotify', 'disney', 'globoplay', 'prime video',
  'hbo', 'youtube', 'crunchyroll', 'paramount',
  'apple', 'microsoft', 'google', 'chatgpt',
  'adobe', 'canva', 'notion', 'github', 'figma',
  'discord', 'deezer', 'steam', 'twitch',
  'dropbox', 'linkedin', 'coursera', 'udemy',
]

export const QUICK_BILL_SERVICES = QUICK_BILL_KEYS.map((key) => {
  const found = BRANDS.find(([k]) => k === key)
  return found ? { key, label: found[1].name, brand: found[1] } : null
}).filter(Boolean) as Array<{ key: string; label: string; brand: ServiceBrand }>
