# 절약지도

공공데이터 기반 절약처 탐색 앱인토스 미니앱입니다.  
주변의 착한가격업소와 생활비 절약처를 빠르게 찾고, 카테고리/지역/검색/저장 기능으로 다시 확인할 수 있습니다.

## 한눈에 보기

- 플랫폼: Apps in Toss WebView
- 프론트엔드: Vite + React + TypeScript
- UI: TDS Mobile + Lucide Icons
- 지도: Leaflet
- 데이터: 공공데이터 CSV → 정적 JSON 변환
- 백엔드: 없음
- 저장: Apps in Toss Storage 우선, 실패 시 `localStorage`
- 위치: Apps in Toss 위치 API 우선, 실패 시 브라우저 Geolocation

## 주요 기능

- 현재 위치 기준 가까운 절약처 정렬
- 지역 선택, 카테고리 필터, 검색어 탐색
- 업종별 아이콘/지도 마커 구분
- 즐겨찾기 저장
- 상세 시트에서 주소, 거리, 전화, 외부 길찾기 제공

## 현재 데이터 상태

최신 생성 기준:

- 지역: 전국
- 착한가격업소: 12,117개
- 온누리 가맹점: 1,000개
- 전체 절약처: 13,111개
- 좌표 보강 완료: 11,996개
- 좌표 미보강: 120개

좌표가 없는 일부 업소는 지도 핀/거리 계산이 제한될 수 있습니다.

## 실행

```bash
pnpm dev
```

기본 개발 서버는 `5173` 포트에서 열립니다.

## 스크립트

```bash
pnpm dev
pnpm data:download
pnpm data:build
pnpm data:geocode
pnpm lint
pnpm format
pnpm build
pnpm deploy
```

## 데이터 파이프라인

1. 공공데이터 원본 CSV 다운로드
2. 앱에서 쓰기 쉬운 형태로 정제
3. 좌표 보강 파일과 병합
4. `public/data/stores.json` 생성

### 데이터 갱신

```bash
pnpm data:download
pnpm data:build
```

현재 `data:build`는 전국 기준으로 생성되도록 설정되어 있습니다.

### 좌표 보강

좌표 누락 업소는 아래 파일로 추출됩니다.

- [data/geocode-targets.csv](/Users/aton/project/doomole/app-in-toss-project-1/data/geocode-targets.csv:1)

보강 좌표 파일은 아래 경로를 사용합니다.

- `data/raw/geocodes.csv`

관련 스크립트:

```bash
pnpm data:geocode
```

자세한 원천 데이터 설명은 [data/raw/README.md](/Users/aton/project/doomole/app-in-toss-project-1/data/raw/README.md:1) 를 확인하세요.

## 프로젝트 구조

```text
src/
  App.tsx                  메인 앱 UI
  components/MapPreview.tsx 지도 렌더링
  storeVisuals.ts          업종별 아이콘/마커 판별
  data/stores.ts           타입과 샘플 구조

scripts/
  download-public-data.mjs 원본 CSV 다운로드
  build-stores.mjs         앱용 JSON 생성
  geocode.mjs              좌표 보강

public/data/stores.json    앱에서 실제 로드하는 데이터
support.html               고객센터 페이지
privacy.html               개인정보처리방침 페이지
```

## 검증

```bash
pnpm format
pnpm lint
pnpm build
```

`pnpm build`가 성공하면 `saving-map.ait` 패키지가 생성됩니다.

## 앱인토스 배포

```bash
pnpm build
pnpm deploy
```

배포 전 체크:

- `granite.config.ts`의 `appName`이 콘솔 앱 이름과 일치하는지 확인
- 콘솔에 아이콘이 정상 등록되어 있는지 확인
- 위치 권한 사유 문구가 검수 설명과 일치하는지 확인
- 고객센터 URL과 개인정보처리방침 URL 준비

검수 제출용 문구와 점검 항목은 [docs/release-checklist.md](/Users/aton/project/doomole/app-in-toss-project-1/docs/release-checklist.md:1) 에 정리되어 있습니다.

## GitHub Pages 문서 페이지

이 프로젝트에는 앱인토스 콘솔에 넣을 정적 페이지가 포함되어 있습니다.

- [support.html](/Users/aton/project/doomole/app-in-toss-project-1/support.html:1)
- [privacy.html](/Users/aton/project/doomole/app-in-toss-project-1/privacy.html:1)

GitHub Pages를 `main` 브랜치 `root` 기준으로 활성화하면 아래 형태의 URL로 접근할 수 있습니다.

```text
https://<github-username>.github.io/<repo>/support.html
https://<github-username>.github.io/<repo>/privacy.html
```

## 참고 링크

- [앱인토스 콘솔](https://apps-in-toss.toss.im/)
- [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)
- [앱인토스 샌드박스 테스트](https://developers-apps-in-toss.toss.im/development/test/sandbox.md)
- [비게임 앱 체크리스트](https://developers-apps-in-toss.toss.im/checklist/app-nongame.md)
