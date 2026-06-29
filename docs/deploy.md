# 절약지도 배포 가이드

## 사전 준비

- **앱인토스 API 키** — 배포 시 입력 필요 (앱인토스 콘솔에서 발급)
- Node.js, pnpm 설치 확인

## 배포 순서

### 1. 데이터 최신화 (선택)

공공데이터를 새로 받아야 할 때만 실행합니다.

```bash
pnpm data:download   # CSV 원본 다운로드
pnpm data:build      # public/data/stores.json 생성
```

### 2. 빌드

```bash
pnpm build
```

성공 시 프로젝트 루트에 `saving-map.ait` 패키지가 생성됩니다.

### 3. 배포

```bash
pnpm exec ait deploy
k5O9r_WL0pDqdENIuXmsApWXxHCDUNnA7vutDuMhm9U
```

실행 후 API 키 입력 프롬프트가 나타납니다. 앱인토스 콘솔에서 발급한 키를 입력하세요.

---

## 배포 전 체크리스트

- `granite.config.ts`의 `appName`이 콘솔 앱 이름(`saving-map`)과 일치하는지 확인
- `brand.icon` URL(`https://raw.githubusercontent.com/doomallang/toss-in-app-saving-map/main/public/icon.png`)이 접근 가능한지 확인
  - GitHub 저장소가 public이고 `icon.png`가 push 되어 있어야 함
- `pnpm lint`, `pnpm build` 통과 여부 확인

전체 검수 항목은 [`docs/release-checklist.md`](./release-checklist.md)를 참고하세요.

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-------------|
| `A deploy is only possible from inside a workspace` | `pnpm deploy` 대신 `pnpm exec ait deploy` 사용 |
| API 키 오류 | 앱인토스 콘솔에서 키 재발급 후 입력 |
| 빌드 실패 (chunk size 경고) | 경고이므로 빌드 자체는 정상 완료. 무시해도 됨 |
| `stores.json` 없음 | `pnpm data:build` 선행 실행 필요 |
