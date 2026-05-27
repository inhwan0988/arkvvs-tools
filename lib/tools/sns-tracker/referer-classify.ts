/**
 * referer URL + UA 기반으로 트래픽 출처(Platform) 자동 감지.
 * 클릭 추적 시 사용 — 사용자가 같은 단축 URL을 여러 SNS에 붙여도 자동으로 분리 집계.
 */

import type { Platform } from "./types";

const REFERER_RULES: Array<{ pattern: RegExp; platform: Platform }> = [
  // Instagram (인앱 브라우저는 l.instagram.com 거침)
  { pattern: /(?:^|\.)instagram\.com$/i, platform: "instagram" },
  { pattern: /(?:^|\.)l\.instagram\.com$/i, platform: "instagram" },
  // X / Twitter
  { pattern: /(?:^|\.)t\.co$/i, platform: "x" },
  { pattern: /(?:^|\.)twitter\.com$/i, platform: "x" },
  { pattern: /(?:^|\.)x\.com$/i, platform: "x" },
  // YouTube
  { pattern: /(?:^|\.)youtube\.com$/i, platform: "youtube" },
  { pattern: /(?:^|\.)youtu\.be$/i, platform: "youtube" },
  { pattern: /(?:^|\.)m\.youtube\.com$/i, platform: "youtube" },
  // TikTok
  { pattern: /(?:^|\.)tiktok\.com$/i, platform: "tiktok" },
  // Facebook
  { pattern: /(?:^|\.)facebook\.com$/i, platform: "facebook" },
  { pattern: /(?:^|\.)m\.facebook\.com$/i, platform: "facebook" },
  { pattern: /(?:^|\.)fb\.com$/i, platform: "facebook" },
  { pattern: /(?:^|\.)l\.facebook\.com$/i, platform: "facebook" },
  // Threads
  { pattern: /(?:^|\.)threads\.(?:net|com)$/i, platform: "threads" },
  // Naver Blog
  { pattern: /(?:^|\.)blog\.naver\.com$/i, platform: "naver_blog" },
  { pattern: /(?:^|\.)m\.blog\.naver\.com$/i, platform: "naver_blog" },
];

/**
 * UA에 인앱 브라우저 마커가 있으면 referer가 없어도 platform 추정 가능.
 * Instagram, FB, TikTok 등은 자체 인앱 webview 사용.
 */
const UA_RULES: Array<{ pattern: RegExp; platform: Platform }> = [
  { pattern: /Instagram/i, platform: "instagram" },
  { pattern: /FB(?:AV|AN|IOS)/i, platform: "facebook" },
  { pattern: /Threads/i, platform: "threads" },
  { pattern: /TikTok|Bytedance|musical_ly/i, platform: "tiktok" },
  { pattern: /Twitter(?:Bot|Android|iOS)?/i, platform: "x" },
  { pattern: /KAKAOTALK/i, platform: "etc" }, // 카카오톡 in-app → etc
  { pattern: /Line\//i, platform: "etc" },
];

export function classifyTrafficSource(
  referer: string | null | undefined,
  ua: string | null | undefined,
): Platform | null {
  // 1) referer 호스트 기반
  if (referer) {
    try {
      const u = new URL(referer);
      for (const rule of REFERER_RULES) {
        if (rule.pattern.test(u.hostname)) return rule.platform;
      }
    } catch {}
  }
  // 2) UA fallback (인앱 브라우저는 referer 없는 경우 많음)
  if (ua) {
    for (const rule of UA_RULES) {
      if (rule.pattern.test(ua)) return rule.platform;
    }
  }
  return null;
}
