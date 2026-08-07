/**
 * Slack incoming webhook 알림.
 * 환경변수 SLACK_WEBHOOK_URL 필수. 없으면 로그만 남김 (throw X).
 */
export async function sendSlack(message: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.log("[slack] no SLACK_WEBHOOK_URL, message:", message);
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[slack] send failed:", res.status, txt.slice(0, 200));
    }
  } catch (e) {
    console.error("[slack] send error:", e);
  }
}

/** blocks 스타일 리치 메시지 */
export async function sendSlackBlocks(blocks: unknown[]): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.log("[slack] no webhook, blocks:", JSON.stringify(blocks).slice(0, 200));
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    if (!res.ok) {
      console.error("[slack] blocks failed:", res.status);
    }
  } catch (e) {
    console.error("[slack] blocks error:", e);
  }
}
