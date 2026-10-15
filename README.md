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
  python3 -m venv .venv && source .venv/bin/activate   # macOS(Homebrew 파이썬)는 전역 pip 설치를 막으므로 가상환경 사용
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
`tools/nexon-openapi-krpc.user.js` 유저스크립트를 설치하면 항상 넥슨코리아 로그인을 쓴다.

- **크롬 (맥/윈도우)**: Tampermonkey 설치 → 확장 프로그램 관리(`chrome://extensions`)에서 Tampermonkey 의 "세부정보" → **사용자 스크립트 허용** 켜기 (구버전 크롬은 오른쪽 위 **개발자 모드** 켜기) → 스크립트의 raw 주소를 열어 설치.
- **사파리 (맥)**: App Store 의 무료 **Userscripts** 앱 설치 → 사파리 설정 → 확장 프로그램에서 켜고 openapi.nexon.com, signin.nexon.com 권한 허용 → raw 주소를 사파리에서 열고 툴바의 Userscripts 아이콘에서 설치.
