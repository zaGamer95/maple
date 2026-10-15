// ==UserScript==
// @name         NEXON Open API: 해외에서 한국(넥슨코리아) 로그인 고정
// @namespace    https://github.com/zaGamer95/maple
// @version      1.2
// @description  해외 IP에서 openapi.nexon.com 로그인이 글로벌/SEA로 넘어가는 문제를 막고 넥슨코리아 로그인을 쓰게 한다
// @match        https://openapi.nexon.com/*
// @match        https://signin.nexon.com/*
// @run-at       document-start
// @grant        none
// @inject-into  page
// ==/UserScript==

// 넥슨 로그인 SDK는 ".../platform/selector?ifplatform=KR:krpc&SG:arena_sea&…&arena_west" 요청으로
// 접속 국가에 맞는 로그인 플랫폼을 받아온다. 이 요청의 ifplatform 을 "krpc"(넥슨코리아)로 바꿔
// 국가와 상관없이 한국 로그인을 쓰게 한다.
// @inject-into page: 사파리 Userscripts 앱은 기본이 격리 실행이라 페이지 안에서 실행해야 SDK 요청을 바꿀 수 있다.
(function () {
  'use strict';
  const rewrite = (url) =>
    typeof url === 'string' ? url.replace(/(\/platform\/selector[\w-]*\?ifplatform=)[^&]*/, '$1krpc') : url;

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string') input = rewrite(input);
    else if (input instanceof Request && rewrite(input.url) !== input.url) input = new Request(rewrite(input.url), input);
    return origFetch.call(this, input, init);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    return origOpen.call(this, method, rewrite(String(url)), ...rest);
  };
})();
