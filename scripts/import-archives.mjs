/**
 * One-time importer: scrape sermon and study recording metadata
 * from the live Northfield Bible Church Website Tonight pages.
 * Handles malformed closing tags (<a/> instead of </a>).
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "src", "data");

const PAGES = {
  sermons: "https://northfieldbiblechurch.org/Sermon_Archives.html",
  doctrines: "https://northfieldbiblechurch.org/Doctrines_Class.html",
  wednesday: "https://northfieldbiblechurch.org/Wednesday_Study.html",
};

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "NorthfieldBibleChurchRebuild/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

function toIso(year, month, day) {
  if (!year || !month || !day || month > 12 || day > 31 || year < 1990 || year > 2100) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function parseDateFromText(text) {
  let m = text.match(/(\d{1,2})-(\d{1,2})-(\d{4})\b/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const iso = toIso(year, month, day);
    if (iso) return { year, month, day, iso, raw: m[0] };
  }

  // MM-DD-YY
  m = text.match(/\b(\d{1,2})-(\d{1,2})-(\d{2})\b/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = 2000 + Number(m[3]);
    const iso = toIso(year, month, day);
    if (iso) return { year, month, day, iso, raw: m[0] };
  }

  // Month name with optional ordinal typos (th/tn/nd/rd/st)
  m = text.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th|tn)?(?:,)?\s+(\d{4})/i,
  );
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    const day = Number(m[2]);
    const year = Number(m[3]);
    const iso = toIso(year, month, day);
    if (iso) return { year, month, day, iso, raw: m[0] };
  }

  return null;
}

function parseDateFromUrl(href) {
  // /mp3/2026/11-15-2026.mp3
  let m = href.match(/\/(20\d{2})\/(\d{1,2})-(\d{1,2})-\1\.(?:mp3|wav|pdf)/i);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const iso = toIso(year, month, day);
    if (iso) return { year, month, day, iso, raw: m[0] };
  }

  // /mp3/2021/01-24-20s.mp3 (MM-DD with truncated year suffix)
  m = href.match(/\/(20\d{2})\/(\d{1,2})-(\d{1,2})-\d{2}[a-z]*\.(?:mp3|wav|pdf)/i);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const iso = toIso(year, month, day);
    if (iso) return { year, month, day, iso, raw: m[0] };
  }

  // DOCTRINE/WED/SUN folders with YYMMDD
  m = href.match(/\/(?:DOCTRINE|WED|SUN\d*)\/(\d{2})(\d{2})(\d{2})-\d+\.(?:mp3|wav)/i);
  if (m) {
    const year = 2000 + Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const iso = toIso(year, month, day);
    if (iso) return { year, month, day, iso, raw: `${m[1]}${m[2]}${m[3]}` };
  }

  // /2022/09-04-22-220904-090855.WAV (MM-DD-YY-...)
  m = href.match(/\/(20\d{2})\/(\d{1,2})-(\d{1,2})-(\d{2})-/i);
  if (m) {
    const folderYear = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const yy = Number(m[4]);
    const yearFromYy = 2000 + yy;
    const year = folderYear === yearFromYy ? folderYear : yearFromYy;
    const iso = toIso(year, month, day);
    if (iso) return { year, month, day, iso, raw: m[0] };
  }

  // 29Jan23.WAV / redo05Feb23.WAV
  m = href.match(/(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)(\d{2})\.(?:mp3|wav)/i);
  if (m) {
    const day = Number(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    const year = 2000 + Number(m[3]);
    const iso = toIso(year, month, day);
    if (iso) return { year, month, day, iso, raw: m[0] };
  }

  // Any folder + YYMMDD in filename
  m = href.match(/\/(20\d{2})\/(?:[^/?#]+\/)*(\d{2})(\d{2})(\d{2})-/i);
  if (m) {
    const folderYear = Number(m[1]);
    const year = 2000 + Number(m[2]);
    const month = Number(m[3]);
    const day = Number(m[4]);
    if (Math.abs(folderYear - year) <= 1) {
      const iso = toIso(year, month, day);
      if (iso) return { year, month, day, iso, raw: `${m[2]}${m[3]}${m[4]}` };
    }
  }

  return null;
}

function extractAnchors(html, base) {
  const anchors = [];
  // Match opening <a ...> through either </a> or the broken <a/> used on this site
  const re = /<a\b([^>]*)>([\s\S]*?)(?:<\/a>|<a\s*\/>)/gi;
  let match;
  while ((match = re.exec(html))) {
    const attrs = match[1];
    const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
    if (!hrefMatch) continue;
    const href = absoluteUrl(hrefMatch[1], base);
    const text = decodeEntities(match[2].replace(/<[^>]+>/g, ""));
    anchors.push({ href, text });
  }
  return anchors;
}

function isNav(href) {
  return /Home_Page|Up_Coming|Fellowship|Sermon_Archives|Contact|Studys|Doctrines|Wednesday/i.test(
    href,
  );
}

function isMedia(href) {
  return /\.(mp3|wav|pdf)(?:\?|$)/i.test(href);
}

function isVideo(href) {
  return /youtu\.be\/|youtube\.com\/(?:watch|shorts|embed)/i.test(href);
}

function cleanTitle(text, dateRaw) {
  let t = text
    .replace(/^[\-\u2013\u2014\s]+/, "")
    .replace(/[\-\u2013\u2014\s]+$/, "")
    .replace(/\s*-\s*Video\s*$/i, "")
    .replace(/\s+Video\s*$/i, "")
    .trim();
  if (dateRaw) {
    t = t.replace(dateRaw, "").replace(/^[\-\u2013\u2014\s]+/, "").trim();
  }
  t = t.replace(/^\d{1,2}-\d{1,2}-\d{4}\s*/, "").trim();
  t = t.replace(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,)?\s+\d{4}\s*-?\s*/i,
    "",
  ).trim();
  return t;
}

function parseSermons(html) {
  const anchors = extractAnchors(html, PAGES.sermons);
  const sermons = [];
  let current = null;

  for (const link of anchors) {
    if (isNav(link.href)) continue;
    if (/youtube\.com\/(?:channel|c\/|@)/i.test(link.href)) continue;

    if (isMedia(link.href)) {
      const date = parseDateFromText(link.text) || parseDateFromUrl(link.href);
      const title =
        cleanTitle(link.text, date?.raw) ||
        (date ? `Message from ${date.iso}` : "Untitled message");
      const isPdf = /\.pdf(?:\?|$)/i.test(link.href);
      current = {
        date: date?.iso || null,
        year: date?.year || null,
        title,
        audioUrl: isPdf ? null : link.href,
        videoUrl: null,
        pdfUrl: isPdf ? link.href : null,
      };
      sermons.push(current);
      continue;
    }

    if (isVideo(link.href) && current) {
      current.videoUrl = link.href;
    }
  }

  const seen = new Set();
  return sermons.filter((s) => {
    const key = `${s.date}|${s.title}|${s.audioUrl}|${s.videoUrl}|${s.pdfUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseStudyList(html, base, kind) {
  const anchors = extractAnchors(html, base);
  const items = [];

  for (const link of anchors) {
    if (!isMedia(link.href)) continue;
    const date = parseDateFromText(link.text) || parseDateFromUrl(link.href);
    let title = cleanTitle(link.text, date?.raw);

    const topicMatch = link.text.match(/-\s*(.+)$/);
    if (topicMatch) {
      const topic = decodeEntities(topicMatch[1]).replace(/\s*Video\s*$/i, "").trim();
      if (topic && !/^\d/.test(topic)) title = topic;
    }

    // "Sunday April 9tn 2023 How To Pray..." → keep the topical remainder
    title = title
      .replace(/^Sunday\s+/i, "")
      .replace(
        /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th|tn)?(?:,)?\s+\d{4}\s*/i,
        "",
      )
      .trim();

    if (
      !title ||
      title === kind ||
      /^[\d\-]+$/.test(title) ||
      /^(st|nd|rd|th|tn)\b/i.test(title)
    ) {
      title = date ? `${kind} — ${date.iso}` : kind;
    }

    items.push({
      date: date?.iso || null,
      year: date?.year || null,
      title,
      audioUrl: link.href,
      kind,
    });
  }

  const seen = new Set();
  return items.filter((s) => {
    const key = `${s.date}|${s.audioUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByDateDesc(a, b) {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

async function main() {
  await mkdir(DATA, { recursive: true });

  console.log("Fetching Sermon Archives...");
  const sermonHtml = await fetchHtml(PAGES.sermons);
  const sermons = parseSermons(sermonHtml).sort(sortByDateDesc);
  await writeFile(join(DATA, "sermons.json"), JSON.stringify(sermons, null, 2));
  const withVideo = sermons.filter((s) => s.videoUrl).length;
  console.log(`Wrote ${sermons.length} sermons (${withVideo} with video)`);

  console.log("Fetching Doctrines Class...");
  const doctrinesHtml = await fetchHtml(PAGES.doctrines);
  const doctrines = parseStudyList(doctrinesHtml, PAGES.doctrines, "Doctrines Class").sort(
    sortByDateDesc,
  );

  console.log("Fetching Wednesday Study...");
  const wednesdayHtml = await fetchHtml(PAGES.wednesday);
  const wednesday = parseStudyList(wednesdayHtml, PAGES.wednesday, "Wednesday Study").sort(
    sortByDateDesc,
  );

  await writeFile(join(DATA, "studies.json"), JSON.stringify({ doctrines, wednesday }, null, 2));
  console.log(`Wrote ${doctrines.length} doctrines + ${wednesday.length} wednesday studies`);

  console.log("Latest sermon:", sermons[0]?.date, sermons[0]?.title, sermons[0]?.videoUrl);
  console.log("Latest doctrine:", doctrines[0]?.date, doctrines[0]?.title);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
