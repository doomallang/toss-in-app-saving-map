import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sources = [
  {
    name: "행정안전부 착한가격업소",
    pageUrl: "https://www.data.go.kr/data/3045247/fileData.do",
    outputPath: "data/raw/good-price.csv",
  },
  {
    name: "소상공인시장진흥공단 온누리상품권 가맹점",
    pageUrl: "https://www.data.go.kr/data/3060079/fileData.do",
    outputPath: "data/raw/onnuri.csv",
  },
];

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${url} 요청 실패: ${response.status}`);
  }

  return await response.text();
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${url} 다운로드 실패: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  return buffer.byteLength;
}

function extractContentUrl(html) {
  const match = html.match(/"contentUrl"\s*:\s*"([^"]+)"/);

  if (match == null) {
    throw new Error("공공데이터포털 페이지에서 contentUrl을 찾지 못했어요.");
  }

  return match[1].replaceAll("\\/", "/");
}

for (const source of sources) {
  const html = await fetchText(source.pageUrl);
  const contentUrl = extractContentUrl(html);
  const byteLength = await downloadFile(contentUrl, source.outputPath);

  console.log(
    `${source.name}: ${source.outputPath} 저장 (${byteLength.toLocaleString()} bytes)`,
  );
}
