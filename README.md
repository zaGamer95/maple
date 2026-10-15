# 메이플 캐릭터 관리

구글 시트로 관리하던 메이플스토리 캐릭터·장비·구매 기록을 웹으로 옮긴 개인용 페이지. 설계는 [docs/DESIGN.md](docs/DESIGN.md) 참고.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 타입 검사 + 빌드 (dist/)
```

## 데이터

모든 데이터는 `src/data/*.json` 에 있다.

- **웹에서 수정**: 캐릭터 상세 → 편집. 수정 내용은 이 브라우저에만 저장되고, 상단 배너의 **JSON 내보내기**로 받은 `characters.json` 을 `src/data/` 에 덮어써 커밋하면 공유 링크에도 반영된다.
- **시트에서 다시 가져오기**: 구글 시트를 xlsx 로 내려받은 뒤

  ```bash
  pip install openpyxl
  python scripts/import_sheet.py 시트.xlsx
  ```

  주의: `src/data` 의 JSON 을 시트 내용으로 덮어쓴다.

## 공유 (GitHub Pages)

`main` 브랜치에 푸시하면 `.github/workflows/pages.yml` 이 빌드해서 배포한다.
처음 한 번은 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿔야 한다.
배포 주소: `https://zagamer95.github.io/maple/`

## 해외에서 NEXON Open API 로그인 (한국 계정)

openapi.nexon.com 은 접속 국가로 로그인 플랫폼을 골라서, 해외 IP에서는 한국 계정이어도 글로벌/SEA 로그인으로 넘어간다.
`tools/nexon-openapi-krpc.user.js` 유저스크립트를 Tampermonkey 등에 설치하면 항상 넥슨코리아 로그인을 쓴다.
