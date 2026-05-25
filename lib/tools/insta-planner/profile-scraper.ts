import { runActorSync } from "./apify-client";
import type { ReelResult } from "./types";

/**
 * Apify Instagram Profile Scraper raw 응답 형식.
 * (실제 필드는 더 많지만 사용하는 것만 정의)
 */
type ApifyProfileItem = {
  username: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  isPrivate?: boolean;
  isVerified?: boolean;
  profilePicUrl?: string;
  latestPosts?: ApifyPost[];
};

type ApifyPost = {
  type?: string;            // "Image" | "Video" | "Sidecar"
  shortCode?: string;
  caption?: string;
  url?: string;
  displayUrl?: string;
  videoUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
  videoDuration?: number;
  timestamp?: string;
  hashtags?: string[];
  musicInfo?: { music_canonical_id?: string; song_name?: string; artist_name?: string };
};

/**
 * 인스타 채널 1개 또는 여러 개를 fetch + 인기 포스트 추출.
 *
 * Apify 'apify/instagram-profile-scraper'는 username 배열을 받아
 * 각 프로필의 정보 + 최근 포스트를 반환.
 *
 * @param usernames 인스타 username 배열 (예: ["arkstudio_kr", "another_user"])
 * @param postsPerProfile 각 채널에서 fetch할 최근 포스트 개수 (default 12)
 */
export async function fetchProfilesWithPosts(
  usernames: string[],
  postsPerProfile: number = 12,
): Promise<ReelResult[]> {
  if (usernames.length === 0) return [];

  const items = await runActorSync<ApifyProfileItem>(
    "apify/instagram-profile-scraper",
    {
      usernames,
      resultsLimit: postsPerProfile,
      // 추가 옵션 (필요시): addParentData, enhanceUserSearchWithFacebookPage 등
    },
    120, // 여러 채널 fetch는 길어질 수 있음
  );

  // 각 채널의 latestPosts를 ReelResult로 변환
  const results: ReelResult[] = [];
  for (const profile of items) {
    if (!profile.username) continue;
    const followers = profile.followersCount ?? 0;
    const posts = profile.latestPosts ?? [];
    for (const post of posts) {
      if (!post.shortCode) continue;
      const views = post.videoViewCount ?? 0;
      const likes = post.likesCount ?? 0;
      const comments = post.commentsCount ?? 0;
      // IVS: 영상이면 조회수/팔로워, 이미지면 좋아요/팔로워
      const denominator = followers > 0 ? followers : 1;
      const numerator = views > 0 ? views : likes;
      const ivs = numerator / denominator;
      // 참여율: (좋아요 + 댓글) / (조회수 또는 팔로워)
      const engagementBase = views > 0 ? views : followers;
      const engagementRate =
        engagementBase > 0 ? ((likes + comments) / engagementBase) * 100 : 0;

      const type =
        post.type === "Video"
          ? "reel"
          : post.type === "Sidecar"
            ? "carousel"
            : "post";

      results.push({
        shortcode: post.shortCode,
        url: post.url ?? `https://www.instagram.com/p/${post.shortCode}/`,
        type,
        caption: post.caption ?? "",
        thumbnail: post.displayUrl ?? "",
        ownerUsername: profile.username,
        ownerFullName: profile.fullName ?? "",
        ownerFollowers: followers,
        publishedAt: post.timestamp ?? "",
        viewCount: views,
        likeCount: likes,
        commentCount: comments,
        ivs: Math.round(ivs * 100) / 100,
        engagementRate: Math.round(engagementRate * 100) / 100,
        score: Math.round(ivs * (1 + engagementRate / 10) * 100) / 100,
        hasMusic: !!post.musicInfo?.song_name,
        musicTitle: post.musicInfo?.song_name,
        musicArtist: post.musicInfo?.artist_name,
      });
    }
  }

  return results;
}

/**
 * 본인 채널 정보 + 분석용 메타데이터만 추출 (포스트 적게).
 */
export async function fetchSingleProfile(
  username: string,
  postsLimit: number = 6,
): Promise<{
  username: string;
  fullName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  recentPosts: ApifyPost[];
} | null> {
  const items = await runActorSync<ApifyProfileItem>(
    "apify/instagram-profile-scraper",
    { usernames: [username], resultsLimit: postsLimit },
    60,
  );
  const p = items[0];
  if (!p) return null;
  return {
    username: p.username,
    fullName: p.fullName ?? "",
    bio: p.biography ?? "",
    followerCount: p.followersCount ?? 0,
    followingCount: p.followsCount ?? 0,
    postCount: p.postsCount ?? 0,
    recentPosts: p.latestPosts ?? [],
  };
}
