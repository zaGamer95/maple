# 자그3 일러스트 생성 프롬프트

캐릭터 페이지 상단(본캐 영역)에 넣을 일러스트용. 같은 프롬프트로 ChatGPT·Gemini에서 뽑아 비교한다.

## 참고 이미지 (같이 첨부)
- `zag3-ref-stand.png` — 기본 서 있는 모습 (4배 확대)
- `zag3-ref-weapon.png` — 무기를 세운 모습 (4배 확대)
- `zag3-ref-face.png` — 얼굴·헤어 장식 (8배 확대)

## 코디 정보 (넥슨 API, 2026-10-22 기준, 드레스업 외형)

| 부위 | 아이템 | 그림에서 살릴 특징 |
|---|---|---|
| 헤어 | 보라색 안개 어비스 헤어 | 은백색 단발 보브, 안쪽·끝에 연보라 그라데이션 |
| 얼굴 | 심연 얼굴 (파란색) | 짙은 사파이어 블루 눈 |
| 모자 | 심연의 계율 | 오른쪽 머리에 작은 남색 크리스탈 왕관 장식 |
| 얼굴장식 | 스타 글리터 | 볼 근처 작은 별 반짝임 |
| 눈장식 | 티어 스텔라 | 눈 아래 눈물 모양 크리스탈 |
| 귀고리 | 셀레스티얼 인이어 | 별·달 모티프 이어커프 |
| 상의 | 금단의 계약 | 남색·검정 롱코트, 높은 깃, 은색 장식, 흰 셔츠에 보라 넥타이 |
| 신발 | 금단의 궤적 | 검정 부츠, 보라 포인트 |
| 장갑 | 실버 스타 리슬릿 | 은색 별 손목 장식 |
| 망토 | 혼돈의 결계 | 어두운 결계·오라가 뒤로 퍼지는 느낌 |
| 무기 | 카오스 크레센트 | 거대한 초승달 낫: 검은 톱니 날, 보라 빛, 긴 자루 끝에 체인 장식 |

## 프롬프트 (영어, 그대로 붙여넣기)

```
Create a high-quality anime-style character illustration based on the attached MapleStory pixel sprites.
The sprites are chibi, but draw her with natural, elegant proportions (about 7 heads tall, slender adult young woman) — NOT chibi, NOT super-deformed, NOT pixel art.

Character: Angelic Buster from MapleStory in her dark "abyss" dress-up look. Cool, elegant and slightly mysterious, beautiful but not cutesy.

Hair: shoulder-length silvery-white bob with soft lavender gradient on the underside and tips, wispy bangs. A small dark navy crystal crown ornament on the right side of her head, and a small round violet ornament near her right ear.
Face: deep sapphire-blue eyes, calm confident expression, a tiny teardrop-shaped crystal under one eye, faint star glitter near the cheek, star-and-moon ear cuffs.
Outfit: a fitted midnight-navy and black long coat with a high collar, silver trim, buckles and small chains; white blouse with a violet necktie underneath; short dark skirt; black knee-high boots with violet accents; silver star-shaped wristlets. A dark translucent cape-like aura flows behind her like a magic barrier.
Weapon: she holds an oversized crescent scythe diagonally — jagged black blade with crystalline edges, glowing violet energy and tiny silver star sparks, long slim black shaft with a small hanging chain charm at the end.

Composition: three-quarter view, knee-up or full body, dynamic but graceful pose with the scythe sweeping behind her. Portrait orientation, 3:4.
Background: dark starry void / ruined gothic hall with soft violet light, kept simple so the character stands out.
Color palette: midnight navy, black, silver and violet glow. Keep pink to a minimum — only a very subtle lavender tint in the hair.
Style: clean line art, polished cel shading with soft glow and rim light, detailed fabric and metal, game key-art quality.
Avoid: chibi, SD proportions, pixel art, pastel pink dominant colors, text, logos, watermark, extra fingers.
```

## 한국어 요약 (도구가 한국어를 더 잘 따를 때)

```
첨부한 메이플스토리 도트 캐릭터를 바탕으로 고퀄리티 애니메이션 풍 일러스트를 그려줘.
도트는 SD지만 그림은 7등신 정도의 늘씬한 성인 비율로. SD·도트풍 금지.
은백색 단발 보브(안쪽만 은은한 연보라), 사파이어 블루 눈, 오른쪽 머리에 작은 남색 크리스탈 왕관, 눈 아래 눈물 크리스탈.
남색·검정 롱코트(높은 깃, 은색 장식), 흰 셔츠와 보라 넥타이, 검정 부츠, 은색 별 팔찌, 뒤로 퍼지는 어두운 결계 같은 망토.
보라빛이 감도는 거대한 검은 초승달 낫을 사선으로 든 우아하고 멋진 포즈. 세로 3:4.
배경은 별이 보이는 어두운 공간이나 보랏빛 고딕 폐허, 단순하게.
색은 남색·검정·은색·보라 위주, 핑크는 최소한으로. 귀엽기보다 멋있고 예쁘게.
```

## 도구별 메모
- **ChatGPT**: 참고 이미지 3장을 첨부하고 영어 프롬프트를 붙여넣기. 마음에 드는 결과가 나오면 "같은 캐릭터로 표정만 ~" 식으로 수정 요청.
- **Gemini**: 참고 이미지를 첨부하고 같은 프롬프트. 비율 지시를 무시하면 "portrait 3:4" 를 한 번 더 요청.
- **Claude**: 이미지(그림) 생성 기능은 없다. SVG·HTML로 그린 그림은 만들 수 있지만 일러스트 품질 비교 대상은 아니다.

## 사이트에 넣는 방법
결과 이미지를 보내 주면 3:4 비율·긴 변 약 1200px의 WebP로 줄여 `public/illustrations/` 에 저장하고 `src/data/illustrations.json` 에 등록한다.
여러 장을 등록하면 캐릭터 페이지에서 버튼으로 바꿔 볼 수 있다 (예: GPT / Gemini).
