# 공공데이터 원본

이 폴더에는 앱용 JSON을 만들기 위한 원본 CSV를 둡니다.

## 원천 데이터

- 행정안전부\_착한가격업소 현황: https://www.data.go.kr/data/3045247/fileData.do
- 소상공인시장진흥공단\_전국 온누리상품권 가맹점 현황: https://www.data.go.kr/data/3060079/fileData.do

## 사용 방법

```bash
pnpm data:download
pnpm data:build
```

기본 변환 지역은 검토용 스크린샷 기준인 `강남구`입니다. 다른 지역으로 만들 때는 이렇게 실행합니다.

```bash
pnpm data:build
DATA_REGION=서울 pnpm data:build
DATA_REGION=부산 pnpm data:build
DATA_REGION=전국 MAX_GOOD_PRICE=2000 MAX_ONNURI=500 pnpm data:build
```

## 좌표 보강

현재 전국 단위 착한가격업소 CSV는 주소는 있지만 위도/경도는 없습니다.
온누리상품권 CSV는 현행 파일 기준으로 상세 주소가 아니라 광역 소재지 중심입니다.

`pnpm data:build`를 실행하면 좌표가 없는 업소를 `data/geocode-targets.csv`로 내보냅니다.
정확한 거리순 정렬이 필요하면 이 파일의 `searchAddress`를 기준으로 좌표를 보강한 뒤
`data/raw/geocodes.csv`를 아래 형식으로 추가하세요.

```csv
address,searchAddress,latitude,longitude
서울특별시 종로구 대학로5길 5 (연건동),서울특별시 종로구 대학로5길 5,37.5791,127.0019
```

주의: 국토교통부/VWorld 지오코더 API는 무료지만 응답 좌표 저장 제한이 안내되어 있습니다.
대량 좌표 저장이 필요하면 주소정보누리집의 위치정보 요약DB처럼 저장/활용이 허용되는 원천을 사용하세요.
