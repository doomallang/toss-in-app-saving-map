import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

const GOOD_PRICE_PATH = "data/raw/good-price.csv";
const ONNURI_PATH = "data/raw/onnuri.csv";
const GEOCODES_PATH = "data/raw/geocodes.csv";
const GEOCODE_TARGETS_PATH = "data/geocode-targets.csv";
const OUTPUT_PATH = "public/data/stores.json";

const region = process.env.DATA_REGION ?? "강남구";
const maxGoodPrice = Number(process.env.MAX_GOOD_PRICE ?? 1200);
const maxOnnuri = Number(process.env.MAX_ONNURI ?? 20000);

function decodeCsv(buffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  const brokenChars = (utf8.match(/�/g) ?? []).length;

  if (brokenChars > 3) {
    return new TextDecoder("euc-kr").decode(buffer);
  }

  return utf8;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(field);

      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }

      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows;
  const normalizedHeaders = headers.map((header) =>
    header.replace(/^\uFEFF/, "").trim(),
  );

  return dataRows.map((dataRow) => {
    return Object.fromEntries(
      normalizedHeaders.map((header, index) => [
        header,
        (dataRow[index] ?? "").trim(),
      ]),
    );
  });
}

async function readCsv(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }

  const buffer = await readFile(filePath);
  return parseCsv(decodeCsv(buffer));
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] != null && row[key].trim().length > 0) {
      return row[key].trim();
    }
  }

  return "";
}

const REGION_ABBREV = {
  경상남: "경남",
  경상북: "경북",
  전라남: "전남",
  전라북: "전북",
  충청남: "충남",
  충청북: "충북",
};

function normalizeRegionName(value) {
  const raw = value
    .replace(/특별시|광역시|특별자치시|특별자치도|자치도|도/g, "")
    .replace(/\s/g, "");
  return REGION_ABBREV[raw] ?? raw;
}

function matchesRegion(row, keys) {
  if (region.trim().length === 0 || region === "전국") {
    return true;
  }

  const normalizedRegion = normalizeRegionName(region);
  return keys.some((key) =>
    normalizeRegionName(row[key] ?? "").includes(normalizedRegion),
  );
}

function makeId(source, name, address) {
  const raw = `${source}-${name}-${address}`;
  let hash = 0;

  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash * 31 + raw.charCodeAt(index)) >>> 0;
  }

  return `${source}-${hash.toString(36)}`;
}

function parsePrice(value) {
  const normalized = value.replace(/,/g, "");
  const match = normalized.match(/\d+/);
  return match == null ? undefined : Number(match[0]);
}

function formatPrice(value) {
  const price = parsePrice(value);

  if (price == null || Number.isNaN(price)) {
    return value;
  }

  return `${price.toLocaleString()}원`;
}

function normalizeAddressForGeocoding(value) {
  return value
    .replace(/\([^)]*동\)/g, " ")
    .replace(/\([^)]*읍\)/g, " ")
    .replace(/\([^)]*면\)/g, " ")
    .replace(/\([^)]*리\)/g, " ")
    .replace(/[,，].*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function getCategoryByBusinessType(value) {
  if (/이용|미용|세탁|목욕|숙박|사진|비요식|서비스/.test(value)) {
    return {
      category: "life",
      categoryLabel: "생활",
      color: "blue",
    };
  }

  if (/자동차|자전거|교통/.test(value)) {
    return {
      category: "mobility",
      categoryLabel: "교통",
      color: "slate",
    };
  }

  return {
    category: "food",
    categoryLabel: "식비",
    color: "green",
  };
}

function getCategoryByItems(value) {
  if (/정육|축산|수산|농산|청과|반찬|식품|마트|슈퍼|쌀|과일|채소/.test(value)) {
    return {
      category: "market",
      categoryLabel: "장보기",
      color: "amber",
    };
  }

  if (/음식|분식|김밥|떡|빵|커피|카페|치킨|족발|국수|반찬/.test(value)) {
    return {
      category: "food",
      categoryLabel: "식비",
      color: "green",
    };
  }

  return {
    category: "market",
    categoryLabel: "장보기",
    color: "amber",
  };
}

function buildGoodPriceStores(rows, geocodes) {
  return rows
    .filter((row) => matchesRegion(row, ["시도", "시군", "주소"]))
    .slice(0, maxGoodPrice)
    .map((row) => {
      const name = pick(row, ["업소명"]);
      const address = pick(row, ["주소"]);
      const businessType = pick(row, ["업종"]);
      const menuName = pick(row, ["메뉴1", "품목1", "주요품목"]);
      const menuPrice = pick(row, ["가격1"]);
      const category = getCategoryByBusinessType(businessType);
      const geocode =
        geocodes.get(address) ??
        geocodes.get(normalizeAddressForGeocoding(address));
      const numericPrice = parsePrice(menuPrice);

      return {
        id: makeId("good-price", name, address),
        name,
        ...category,
        address,
        latitude: geocode?.latitude,
        longitude: geocode?.longitude,
        benefitTitle:
          menuName.length > 0 && menuPrice.length > 0
            ? `${menuName} ${formatPrice(menuPrice)}`
            : "착한가격 메뉴 제공",
        benefitDescription:
          businessType.length > 0 ? businessType : "착한가격업소",
        priceLabel:
          numericPrice != null && numericPrice <= 10000
            ? "만원 이하"
            : category.categoryLabel,
        onnuri: "none",
        source: "착한가격업소",
        sourceMeta: {
          sido: pick(row, ["시도"]),
          sigungu: pick(row, ["시군"]),
          phone: pick(row, ["연락처"]),
          geocodeQuery: normalizeAddressForGeocoding(address),
        },
      };
    })
    .filter((store) => store.name.length > 0 && store.address.length > 0);
}

function buildOnnuriStores(rows) {
  return rows
    .filter((row) => matchesRegion(row, ["소재지", "소속 시장명(또는 상점가)"]))
    .slice(0, maxOnnuri)
    .map((row) => {
      const name = pick(row, ["가맹점명"]);
      const marketName = pick(row, ["소속 시장명(또는 상점가)"]);
      const regionName = pick(row, ["소재지"]);
      const items = pick(row, ["취급품목"]);
      const digital = pick(row, ["디지털형 가맹 여부"]);
      const paper = pick(row, ["지류형 가맹 여부"]);
      const category = getCategoryByItems(items);
      const onnuri =
        digital === "Y" ? "digital" : paper === "Y" ? "paper" : "none";

      return {
        id: makeId("onnuri", name, `${marketName}-${regionName}`),
        name,
        ...category,
        address:
          marketName.length > 0 ? `${regionName} · ${marketName}` : regionName,
        benefitTitle:
          digital === "Y" ? "디지털 온누리 가능" : "온누리상품권 가능",
        benefitDescription: items.length > 0 ? items : "온누리상품권 가맹점",
        priceLabel: "온누리",
        onnuri,
        source: "온누리 가맹점",
        sourceMeta: {
          marketName,
          regionName,
          paper,
          digital,
        },
      };
    })
    .filter((store) => store.name.length > 0 && store.onnuri !== "none");
}

async function readGeocodes() {
  // geocodes.csv는 항상 UTF-8로 저장되므로 decodeCsv 우회
  if (!existsSync(GEOCODES_PATH)) return new Map();
  const text = (await readFile(GEOCODES_PATH)).toString("utf-8");
  const rows = parseCsv(text);
  const geocodes = new Map();

  for (const row of rows) {
    const address = pick(row, ["address", "주소"]);
    const latitude = Number(pick(row, ["latitude", "lat", "위도"]));
    const longitude = Number(pick(row, ["longitude", "lng", "경도"]));
    const searchAddress = pick(row, ["searchAddress", "검색주소", "query"]);

    if (
      address.length > 0 &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      geocodes.set(address, { latitude, longitude });

      if (searchAddress.length > 0) {
        geocodes.set(searchAddress, { latitude, longitude });
      }
    }
  }

  return geocodes;
}

function dedupeStores(stores) {
  const seen = new Set();

  return stores.filter((store) => {
    const key = `${store.source}-${store.name}-${store.address}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function hasStoreCoordinates(store) {
  return Number.isFinite(store.latitude) && Number.isFinite(store.longitude);
}

async function writeGeocodeTargets(stores) {
  const rows = stores
    .filter((store) => store.source === "착한가격업소")
    .filter((store) => !hasStoreCoordinates(store))
    .map((store) => ({
      id: store.id,
      name: store.name,
      address: store.address,
      searchAddress: normalizeAddressForGeocoding(store.address),
      source: store.source,
    }));

  const csv = [
    "id,name,address,searchAddress,source",
    ...rows.map((row) =>
      [row.id, row.name, row.address, row.searchAddress, row.source]
        .map(csvEscape)
        .join(","),
    ),
  ].join("\n");

  await mkdir(path.dirname(GEOCODE_TARGETS_PATH), { recursive: true });
  await writeFile(GEOCODE_TARGETS_PATH, `${csv}\n`);

  return rows.length;
}

function getStoreRegion(store) {
  const source =
    store.sourceMeta?.sido ??
    store.sourceMeta?.regionName ??
    store.address.split(/\s+/)[0] ??
    "";
  return normalizeRegionName(source) || "기타";
}

const [goodPriceRows, onnuriRows, geocodes] = await Promise.all([
  readCsv(GOOD_PRICE_PATH),
  readCsv(ONNURI_PATH),
  readGeocodes(),
]);

const goodPriceStores = buildGoodPriceStores(goodPriceRows, geocodes);
const onnuriStores = buildOnnuriStores(onnuriRows);
const stores = dedupeStores([...goodPriceStores, ...onnuriStores]);
const geocodeTargetCount = await writeGeocodeTargets(stores);
const generatedAt = new Date().toISOString();

// Full stores.json (전국)
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(
  OUTPUT_PATH,
  JSON.stringify(
    {
      generatedAt,
      region,
      counts: {
        goodPrice: goodPriceStores.length,
        onnuri: onnuriStores.length,
        total: stores.length,
        geocoded: stores.filter(hasStoreCoordinates).length,
        geocodeTargets: geocodeTargetCount,
      },
      stores,
    },
    null,
    2,
  ),
);

// Per-region files: public/data/regions/{region}.json
const byRegion = new Map();
for (const store of stores) {
  const r = getStoreRegion(store);
  if (!byRegion.has(r)) byRegion.set(r, []);
  byRegion.get(r).push(store);
}

const REGIONS_DIR = path.join(path.dirname(OUTPUT_PATH), "regions");
await mkdir(REGIONS_DIR, { recursive: true });

const regionEntries = [];
for (const [regionName, regionStores] of byRegion.entries()) {
  const regionPath = path.join(REGIONS_DIR, `${regionName}.json`);
  await writeFile(
    regionPath,
    JSON.stringify({ generatedAt, region: regionName, stores: regionStores }, null, 2),
  );
  regionEntries.push({ name: regionName, count: regionStores.length });
}

// Index file: public/data/stores-index.json
const indexPath = path.join(path.dirname(OUTPUT_PATH), "stores-index.json");
await writeFile(
  indexPath,
  JSON.stringify(
    {
      generatedAt,
      total: stores.length,
      regions: regionEntries.sort((a, b) => b.count - a.count),
    },
    null,
    2,
  ),
);

console.log(`region=${region}`);
console.log(`goodPrice=${goodPriceStores.length}`);
console.log(`onnuri=${onnuriStores.length}`);
console.log(`total=${stores.length}`);
console.log(`geocodeTargets=${geocodeTargetCount}`);
console.log(`output=${OUTPUT_PATH}`);
console.log(`regions=${byRegion.size} files → ${REGIONS_DIR}`);
