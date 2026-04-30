export type StoreCategory = "food" | "market" | "life" | "mobility";

export type Store = {
  id: string;
  name: string;
  category: StoreCategory;
  categoryLabel: string;
  address: string;
  distanceMeters?: number;
  latitude?: number;
  longitude?: number;
  benefitTitle: string;
  benefitDescription: string;
  priceLabel: string;
  onnuri: "digital" | "paper" | "none";
  source: "착한가격업소" | "온누리 가맹점" | "혜택";
  color: "green" | "blue" | "amber" | "slate";
  sourceMeta?: {
    sido?: string;
    sigungu?: string;
    phone?: string;
    geocodeQuery?: string;
    marketName?: string;
    regionName?: string;
    paper?: string;
    digital?: string;
  };
};

export const sampleStores: Store[] = [
  {
    id: "yeoksam-kimbap",
    name: "역삼 든든김밥",
    category: "food",
    categoryLabel: "식비",
    address: "서울 강남구 테헤란로 21길",
    distanceMeters: 280,
    latitude: 37.4992,
    longitude: 127.0354,
    benefitTitle: "김밥 3,500원",
    benefitDescription: "착한가격업소 등록 메뉴",
    priceLabel: "만원 이하",
    onnuri: "none",
    source: "착한가격업소",
    color: "green",
  },
  {
    id: "gangnam-banchan",
    name: "강남시장 반찬가게",
    category: "market",
    categoryLabel: "장보기",
    address: "서울 강남구 논현로 85길",
    distanceMeters: 430,
    latitude: 37.5008,
    longitude: 127.0381,
    benefitTitle: "디지털 온누리 가능",
    benefitDescription: "반찬, 즉석식품, 건어물",
    priceLabel: "온누리",
    onnuri: "digital",
    source: "온누리 가맹점",
    color: "amber",
  },
  {
    id: "station-laundry",
    name: "역삼역 셀프세탁",
    category: "life",
    categoryLabel: "생활",
    address: "서울 강남구 역삼로 12길",
    distanceMeters: 620,
    latitude: 37.4977,
    longitude: 127.0335,
    benefitTitle: "세탁 10% 할인",
    benefitDescription: "평일 낮 시간대 생활비 혜택",
    priceLabel: "생활비",
    onnuri: "none",
    source: "혜택",
    color: "blue",
  },
  {
    id: "teheran-noodle",
    name: "테헤란 칼국수",
    category: "food",
    categoryLabel: "식비",
    address: "서울 강남구 테헤란로 26길",
    distanceMeters: 760,
    latitude: 37.5012,
    longitude: 127.0331,
    benefitTitle: "칼국수 6,500원",
    benefitDescription: "점심 혼밥 인기 메뉴",
    priceLabel: "만원 이하",
    onnuri: "none",
    source: "착한가격업소",
    color: "green",
  },
  {
    id: "local-butcher",
    name: "강남 정육직판장",
    category: "market",
    categoryLabel: "장보기",
    address: "서울 강남구 봉은사로 18길",
    distanceMeters: 940,
    latitude: 37.5025,
    longitude: 127.0369,
    benefitTitle: "온누리상품권 가능",
    benefitDescription: "정육, 양념육, 간편식",
    priceLabel: "온누리",
    onnuri: "paper",
    source: "온누리 가맹점",
    color: "amber",
  },
  {
    id: "bike-repair",
    name: "역삼 자전거수리",
    category: "mobility",
    categoryLabel: "교통",
    address: "서울 강남구 도곡로 7길",
    distanceMeters: 1180,
    latitude: 37.4961,
    longitude: 127.0378,
    benefitTitle: "기본 점검 5,000원",
    benefitDescription: "근거리 이동비 절약",
    priceLabel: "교통비",
    onnuri: "none",
    source: "혜택",
    color: "slate",
  },
];
