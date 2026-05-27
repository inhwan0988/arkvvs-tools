/**
 * Meta (Facebook + Instagram + Threads) 게시 helper.
 * 모든 함수는 access_token + 외부 id를 받아 게시 후 result 반환.
 */

export interface PostResult {
  ok: boolean;
  post_id?: string;
  url?: string;
  error?: string;
}

/**
 * Facebook Page에 텍스트 또는 이미지 게시.
 *  - text only: POST /{page_id}/feed
 *  - photo:     POST /{page_id}/photos
 *  - video:     POST /{page_id}/videos
 */
export async function postToFacebookPage(opts: {
  pageId: string;
  pageAccessToken: string;
  caption: string;
  imageUrl?: string;
}): Promise<PostResult> {
  try {
    const fd = new URLSearchParams();
    fd.set("access_token", opts.pageAccessToken);

    let endpoint: string;
    if (opts.imageUrl) {
      endpoint = `https://graph.facebook.com/v22.0/${opts.pageId}/photos`;
      fd.set("url", opts.imageUrl);
      fd.set("caption", opts.caption || "");
    } else {
      endpoint = `https://graph.facebook.com/v22.0/${opts.pageId}/feed`;
      fd.set("message", opts.caption);
    }

    const res = await fetch(endpoint, { method: "POST", body: fd });
    const data = (await res.json()) as { id?: string; post_id?: string; error?: { message: string } };
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    const id = data.post_id ?? data.id ?? "";
    return {
      ok: true,
      post_id: id,
      url: id ? `https://facebook.com/${id}` : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "오류" };
  }
}

/**
 * Instagram Business Account에 이미지 1개 게시.
 *  - 1단계: POST /{ig_user_id}/media (image_url + caption) → media container id
 *  - 2단계: POST /{ig_user_id}/media_publish (creation_id) → ig media id
 *
 * 캐러셀/Reel은 별도. 일단 single image만.
 */
export async function postToInstagram(opts: {
  igUserId: string;
  pageAccessToken: string; // IG 게시는 연결된 FB Page token
  caption: string;
  imageUrl: string;
}): Promise<PostResult> {
  try {
    // 1) container 생성
    const containerUrl = new URL(
      `https://graph.facebook.com/v22.0/${opts.igUserId}/media`,
    );
    containerUrl.searchParams.set("access_token", opts.pageAccessToken);
    containerUrl.searchParams.set("image_url", opts.imageUrl);
    if (opts.caption) containerUrl.searchParams.set("caption", opts.caption);
    const cRes = await fetch(containerUrl.toString(), { method: "POST" });
    const cData = (await cRes.json()) as { id?: string; error?: { message: string } };
    if (!cRes.ok || !cData.id) {
      return { ok: false, error: cData.error?.message ?? `container ${cRes.status}` };
    }

    // 2) publish
    const pubUrl = new URL(
      `https://graph.facebook.com/v22.0/${opts.igUserId}/media_publish`,
    );
    pubUrl.searchParams.set("access_token", opts.pageAccessToken);
    pubUrl.searchParams.set("creation_id", cData.id);
    const pRes = await fetch(pubUrl.toString(), { method: "POST" });
    const pData = (await pRes.json()) as { id?: string; error?: { message: string } };
    if (!pRes.ok || !pData.id) {
      return { ok: false, error: pData.error?.message ?? `publish ${pRes.status}` };
    }
    return {
      ok: true,
      post_id: pData.id,
      url: `https://www.instagram.com/p/${pData.id}/`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "오류" };
  }
}

/**
 * Threads 게시 — text only 또는 image.
 *  - 1단계: POST /{threads_user_id}/threads (media_type=TEXT|IMAGE, text)
 *  - 2단계: POST /{threads_user_id}/threads_publish (creation_id)
 *
 * Threads는 별도 Graph API endpoint (graph.threads.net).
 */
export async function postToThreads(opts: {
  threadsUserId: string;
  accessToken: string;
  text: string;
  imageUrl?: string;
}): Promise<PostResult> {
  try {
    const params = new URLSearchParams();
    params.set("access_token", opts.accessToken);
    params.set("text", opts.text);
    if (opts.imageUrl) {
      params.set("media_type", "IMAGE");
      params.set("image_url", opts.imageUrl);
    } else {
      params.set("media_type", "TEXT");
    }

    const cRes = await fetch(
      `https://graph.threads.net/v1.0/${opts.threadsUserId}/threads`,
      { method: "POST", body: params },
    );
    const cData = (await cRes.json()) as { id?: string; error?: { message: string } };
    if (!cRes.ok || !cData.id) {
      return { ok: false, error: cData.error?.message ?? `container ${cRes.status}` };
    }

    const pub = new URLSearchParams();
    pub.set("access_token", opts.accessToken);
    pub.set("creation_id", cData.id);
    const pRes = await fetch(
      `https://graph.threads.net/v1.0/${opts.threadsUserId}/threads_publish`,
      { method: "POST", body: pub },
    );
    const pData = (await pRes.json()) as { id?: string; error?: { message: string } };
    if (!pRes.ok || !pData.id) {
      return { ok: false, error: pData.error?.message ?? `publish ${pRes.status}` };
    }
    return {
      ok: true,
      post_id: pData.id,
      url: `https://www.threads.net/post/${pData.id}`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "오류" };
  }
}
