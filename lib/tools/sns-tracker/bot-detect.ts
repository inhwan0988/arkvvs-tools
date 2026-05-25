/**
 * 단순 bot detector (UA 기반).
 * 정확도보다 빠른 필터링 우선.
 */
const BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /facebookexternalhit/i,
  /WhatsApp/i,
  /TelegramBot/i,
  /KakaoTalk-Scrap/i,
  /LinkedInBot/i,
  /Discordbot/i,
  /PinterestBot/i,
  /python-requests/i,
  /curl\//i,
  /wget\//i,
  /HeadlessChrome/i,
  /Lighthouse/i,
  /node-fetch/i,
  /axios\//i,
];

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true; // UA 없으면 bot 취급 (보수적)
  return BOT_PATTERNS.some((re) => re.test(ua));
}
