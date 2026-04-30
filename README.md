# 절약지도

앱인토스 WebView로 배포하는 생활비 절약처 탐색 미니앱입니다.
공공데이터를 앱 배포 전에 정적 JSON으로 변환하고, 앱에서는 위치 권한과 로컬 저장소만 사용합니다.

## 현재 구성

- 프레임워크: Vite + React + TypeScript
- 앱인토스: `@apps-in-toss/web-framework`, TDS Mobile
- 데이터: `public/data/stores.json` 정적 로딩
- 저장: 앱인토스 Storage 우선, 실패 시 `localStorage`
- 위치: 앱인토스 위치 API 우선, 실패 시 브라우저 Geolocation
- 백엔드: 없음

## 실행

```bash
pnpm dev
```

기본 개발 서버는 Vite `5173` 포트로 열립니다.

## 데이터 갱신

```bash
pnpm data:download
pnpm data:build
```

현재 기본 변환 지역은 `강남구`입니다. 다른 지역으로 만들 때는 `DATA_REGION`을 지정합니다.

```bash
DATA_REGION=서울 pnpm data:build
DATA_REGION=전국 MAX_GOOD_PRICE=2000 MAX_ONNURI=500 pnpm data:build
```

현재 생성 데이터 상태:

- 지역: 전국
- 착한가격업소: 12,117개
- 온누리상품권 가맹점: 1,000개
- 좌표 보강: 11,996개 (91%)
- 미보강: 120개

좌표가 없는 주소는 `data/geocode-targets.csv`로 추출됩니다. 좌표 저장이 허용되는 원천으로 보강한 뒤
`data/raw/geocodes.csv`를 추가하면 앱에서 실제 거리순 표시가 가능합니다.

자세한 원천 데이터와 좌표 보강 주의사항은 [data/raw/README.md](data/raw/README.md)를 확인하세요.

## 검증

```bash
pnpm format
pnpm lint
pnpm build
```

`pnpm build`는 `saving-map.ait` 패키지를 생성합니다.

## 배포

```bash
pnpm build
pnpm deploy
```

배포 전에 아래 항목을 확인하세요.

- `granite.config.ts`의 `appName`이 앱인토스 콘솔에 등록한 앱 이름과 같은지 확인
- `brand.icon`에 실제 접근 가능한 정사각형 아이콘 URL 입력
- 위치 권한 사유가 콘솔/검수 문구와 일치하는지 확인
- 고객센터, 개인정보처리방침 URL이 콘솔 요구사항을 충족하는지 확인

검수 제출용 문구와 테스트 항목은 [docs/release-checklist.md](docs/release-checklist.md)에 정리되어 있습니다.

## 참고 링크

- [앱인토스 콘솔](https://apps-in-toss.toss.im/)
- [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)
- [앱인토스 샌드박스 테스트](https://developers-apps-in-toss.toss.im/development/test/sandbox.md)
- [비게임 앱 체크리스트](https://developers-apps-in-toss.toss.im/checklist/app-nongame.md)
