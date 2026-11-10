# 자그3 변신 전·후 배너 프롬프트

캐릭터 페이지 상단 배너용. 왼쪽 = 변신 전(일반 모드), 오른쪽 = 변신 후(드레스 업 모드).
엔젤릭버스터의 "평범한 소녀 → 무대 위 변신" 테마를 살린다.

## 참고 이미지 (같이 첨부)
- `zag3-ref-normal.png` — 변신 전 (일반 모드, 2026-11-10)
- `zag3-ref-stand.png`, `zag3-ref-face.png` — 변신 후 (드레스 업 모드)
- 이미 만든 일러스트(`public/illustrations/zag3-gemini.webp`)를 같이 주면 오른쪽 인물의 얼굴·코디를 맞추기 쉽다

## 코디 정보 (넥슨 API)

| | 변신 전 · 일반 모드 | 변신 후 · 드레스 업 모드 |
|---|---|---|
| 헤어 | 보라색 슈퍼스타 헤어: 연보라 롱 트윈테일, 끝에 하늘색 브릿지 | 보라색 안개 어비스 헤어: 은백색 단발, 안쪽 연보라 |
| 눈 | 슈퍼스타 얼굴 (초록) | 심연 얼굴 (파랑), 눈 아래 눈물 크리스탈 |
| 모자 | 빨간 캡 모자 (흰 로고) | 남색 크리스탈 왕관 장식 |
| 옷 | 작은 해달 셔츠 (베이지 셔츠), 콘서트 라인업 신발 (흰 스니커즈), 꿈의 콘서트 망토 | 금단의 계약 (남색·검정 롱코트, 보라 넥타이), 금단의 궤적 부츠, 혼돈의 결계 망토 |
| 무기 | 카오스 크레센트 (검은 초승달 낫, 보라 빛) — 두 모드 공통 | 같음 |

## 프롬프트 (영어)

```
Create a wide anime-style key-art banner (21:9) of the same girl before and after a magical transformation, based on the attached MapleStory sprites. Natural, slender proportions (about 7 heads tall), NOT chibi, NOT pixel art.

LEFT HALF — before transformation (casual idol-girl look):
long pastel-lavender twin tails with light-blue streaks at the tips, bright green eyes, cheerful confident smile, a red baseball cap with a small white logo (no readable brand text), an oversized cream-beige shirt, white sneakers, a light concert-style cape. She lightly rests a large black crescent scythe with violet glow on her shoulder. Warm, bright background: soft stage lights, pastel sparkles, a hint of a concert stage.

RIGHT HALF — after transformation (dark "abyss" look):
the same girl, now with a shoulder-length silvery-white bob with a soft lavender underlayer, deep sapphire-blue eyes, a tiny teardrop crystal under one eye, a small dark navy crystal crown on the right side of her head, a fitted midnight-navy and black long coat with silver trim and chains, white blouse with violet necktie, black knee-high boots, a translucent dark cape-like aura. She holds the same oversized crescent scythe diagonally, glowing violet. Cool, dark background: starry void and gothic ruins with violet light.

CENTER: a transformation seam — swirling ribbons of light, stars and violet energy blending warm stage light on the left into the dark abyss on the right. Both figures face slightly toward the center.

Style: clean line art, polished cel shading with glow and rim light, game key-art quality, consistent face between both sides.
Avoid: chibi, SD, pixel art, readable logos or text, watermark, extra fingers, two different-looking girls.
```

## 한국어 요약

```
첨부한 메이플스토리 도트를 바탕으로, 같은 소녀의 변신 전·후를 좌우로 나눈 21:9 가로 배너 일러스트를 그려줘. 7등신 비율, SD·도트 금지.
왼쪽(변신 전): 연보라 롱 트윈테일(끝에 하늘색), 초록 눈, 밝은 미소, 흰 로고의 빨간 캡 모자(글자 없이), 오버핏 베이지 셔츠, 흰 스니커즈, 가벼운 콘서트 망토. 보라빛 검은 초승달 낫을 어깨에 걸침. 따뜻한 무대 조명과 파스텔 반짝이 배경.
오른쪽(변신 후): 같은 소녀, 은백색 단발(안쪽 연보라), 사파이어 블루 눈, 눈 아래 눈물 크리스탈, 오른쪽 머리에 남색 크리스탈 왕관, 남색·검정 롱코트(은색 장식, 체인), 흰 셔츠와 보라 넥타이, 검정 부츠, 어두운 결계 같은 망토. 같은 낫을 사선으로 듦. 별빛 어둠과 보랏빛 고딕 폐허 배경.
가운데: 리본 같은 빛과 별, 보라 에너지가 소용돌이치며 따뜻한 무대 빛에서 어두운 심연으로 넘어가는 변신의 경계. 두 사람은 가운데를 향해 살짝 몸을 돌림.
두 쪽 얼굴이 같은 사람으로 보이게. 글자·로고·워터마크 금지.
```

## 사이트에 넣는 방법
결과 이미지를 보내 주면 가로 배너 크기로 줄여 `public/illustrations/` 에 저장하고, 캐릭터 페이지 상단 배너로 연결한다.
