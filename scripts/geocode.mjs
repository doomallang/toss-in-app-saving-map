/**
 * 카카오 로컬 API로 geocode-targets.csv의 주소를 좌표로 변환합니다.
 *
 * 사용법:
 *   KAKAO_API_KEY=<REST API 키> node scripts/geocode.mjs
 *
 * API 키 발급:
 *   https://developers.kakao.com → 내 애플리케이션 → REST API 키
 *   (무료 / 300,000 req/day — 좌표 저장 허용)
 *
 * 중단 후 재실행해도 data/raw/geocodes.csv에 이미 있는 주소는 건너뜁니다.
 * 완료 후 pnpm data:build를 다시 실행하면 거리순 정렬이 활성화됩니다.
 */

import { appendFile, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const API_KEY = process.env.KAKAO_API_KEY;
const TARGETS_PATH = "data/geocode-targets.csv";
const GEOCODES_PATH = "data/raw/geocodes.csv";
const DELAY_MS = Number(process.env.GEOCODE_DELAY_MS ?? 120);

if (!API_KEY) {
  console.error("KAKAO_API_KEY 환경변수가 필요합니다.");
  console.error(
    "발급: https://developers.kakao.com → 내 애플리케이션 → REST API 키",
  );
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
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
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers = [], ...data] = rows;
  const normalizedHeaders = headers.map((h) => h.replace(/^﻿/, "").trim());
  return data.map((r) =>
    Object.fromEntries(
      normalizedHeaders.map((h, i) => [h, (r[i] ?? "").trim()]),
    ),
  );
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function geocode(query) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=1`;
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const doc = data.documents?.[0];
  if (!doc) return null;

  return { latitude: parseFloat(doc.y), longitude: parseFloat(doc.x) };
}

// geocode-targets.csv 로드
if (!existsSync(TARGETS_PATH)) {
  console.log(
    "geocode-targets.csv가 없습니다. 먼저 pnpm data:build를 실행하세요.",
  );
  process.exit(0);
}

const targets = parseCsv(await readFile(TARGETS_PATH, "utf8"));

if (targets.length === 0) {
  console.log("좌표 보강 대상이 없습니다.");
  process.exit(0);
}

// 기존 geocodes.csv 로드해서 중복 건너뛰기
const doneAddresses = new Set();

if (existsSync(GEOCODES_PATH)) {
  const existing = parseCsv(await readFile(GEOCODES_PATH, "utf8"));
  for (const row of existing) {
    const addr = (row.address ?? "").trim();
    const searchAddr = (row.searchAddress ?? "").trim();
    if (addr) doneAddresses.add(addr);
    if (searchAddr) doneAddresses.add(searchAddr);
  }
  console.log(`기존 좌표 ${existing.length}건 로드 — 중복 건너뜀`);
} else {
  await writeFile(GEOCODES_PATH, "address,searchAddress,latitude,longitude\n");
}

const pending = targets.filter(
  (t) => !doneAddresses.has(t.address) && !doneAddresses.has(t.searchAddress),
);

console.log(
  `대상 ${targets.length}건 중 ${pending.length}건 처리 시작 (${DELAY_MS}ms 간격)`,
);

let success = 0;
let notFound = 0;
let errors = 0;

for (let i = 0; i < pending.length; i++) {
  const target = pending[i];
  const query = target.searchAddress || target.address;

  try {
    const coords = await geocode(query);

    if (coords) {
      const line =
        [target.address, query, coords.latitude, coords.longitude]
          .map(csvEscape)
          .join(",") + "\n";
      await appendFile(GEOCODES_PATH, line);
      success++;
    } else {
      notFound++;
    }
  } catch (err) {
    console.error(`오류 [${query}]: ${err.message}`);
    errors++;
  }

  if ((i + 1) % 100 === 0 || i === pending.length - 1) {
    const percent = Math.round(((i + 1) / pending.length) * 100);
    console.log(
      `진행 ${percent}% (${i + 1}/${pending.length}) — 성공 ${success} / 미발견 ${notFound} / 오류 ${errors}`,
    );
  }

  if (i < pending.length - 1) {
    await sleep(DELAY_MS);
  }
}

console.log("");
console.log(`완료 — 성공 ${success} / 미발견 ${notFound} / 오류 ${errors}`);

if (success > 0) {
  console.log("다음 단계: pnpm data:build 재실행");
}
