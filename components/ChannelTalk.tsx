"use client";

import Script from "next/script";

const PLUGIN_KEY = "ac6caaf8-04f2-41a7-9741-7d8b907c8d94";

interface Props {
  /** 로그인 사용자 정보 — 익명이면 undefined */
  profile?: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
}

/**
 * 채널톡 위젯 — 로그인 사용자는 자동으로 식별되어 운영자가 누구의 문의인지 바로 파악 가능.
 * 익명(비로그인)도 부팅됨.
 */
export default function ChannelTalk({ profile }: Props) {
  const bootArg = profile
    ? `{
        "pluginKey": "${PLUGIN_KEY}",
        "memberId": "${profile.id}",
        "profile": {
          "name": ${JSON.stringify(profile.name ?? "")},
          "email": ${JSON.stringify(profile.email ?? "")}
        }
      }`
    : `{ "pluginKey": "${PLUGIN_KEY}" }`;

  return (
    <Script
      id="channel-talk-boot"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
(function(){var w=window;if(w.ChannelIO){return w.console.error("ChannelIO script included twice.");}var ch=function(){ch.c(arguments);};ch.q=[];ch.c=function(args){ch.q.push(args);};w.ChannelIO=ch;function l(){if(w.ChannelIOInitialized){return;}w.ChannelIOInitialized=true;var s=document.createElement("script");s.type="text/javascript";s.async=true;s.src="https://cdn.channel.io/plugin/ch-plugin-web.js";var x=document.getElementsByTagName("script")[0];if(x.parentNode){x.parentNode.insertBefore(s,x);}}if(document.readyState==="complete"){l();}else{w.addEventListener("DOMContentLoaded",l);w.addEventListener("load",l);}})();
ChannelIO('boot', ${bootArg});
`,
      }}
    />
  );
}
