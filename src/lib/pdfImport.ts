import { GRADES, Semester, Subject } from "@/lib/gpa";

type PdfJsModule = typeof import("pdfjs-dist");
let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

async function getPdfJsModule(): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjsLib;
    });
  }

  return pdfJsModulePromise;
}

const GRADE_SET = new Set(GRADES.map((grade) => grade.toUpperCase()));
const TERM_HEADER_REGEX = /(?:term|semester)\s*[:\-]?\s*([ivxlcdm]+|\d{1,2})/i;
const SUBJECT_ROW_REGEX = /^\s*(?:\d+\s+)?(.+?)\s+(\d+(?:\.\d+)?)\s+([A-Z][+-]?)\s*$/;
const SUBJECT_ROW_WITH_CODE_REGEX = /^\s*(?:\d+\s+)?([A-Z]{2,}\d{2,}[A-Z]?\s*::\s*.+?)\s+(\d+(?:\.\d+)?)\s+([A-Z][+-]?)\s*$/;
const SKIP_LINE_REGEX = /(sgpa|cgpa|gpa|result|total|credits|grade points?|grand total|percentage|s\.no\.?|course\s+credit\s+grade)/i;
const NOISE_LINE_REGEX = /(\/Type\b|\/Page\b|\/MediaBox\b|\/ProcSet\b|\/Font\b|\/Catalog\b|\/Resources\b|\bobj\b|\bendobj\b|<<|>>)/i;
const NON_SUBJECT_NAME_REGEX = /(important\s+instructions|through\s+this\s+interface|click\s+here|dear\s+student|apply\s+for|certificate\s+issue|mode\s+of\s+collection|defaulter\s+details|student\s+information|ums\s+navigation|no\s+records\s+to\s+display)/i;

interface PositionedText {
  text: string;
  x: number;
  y: number;
}

export interface StudentDetails {
  studentName?: string;
  registrationNo?: string;
  studentNameConfidence?: "high" | "medium" | "low" | "none";
  registrationNoConfidence?: "high" | "medium" | "low" | "none";
  studentNamePage?: number;
  registrationNoPage?: number;
}

export interface ParsedImportData {
  semesters: Semester[];
  studentDetails: StudentDetails;
}

function romanToInt(value: string): number | null {
  const roman = value.toUpperCase();
  const map: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };

  let total = 0;
  let prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const current = map[roman[i]];
    if (!current) return null;
    if (current < prev) {
      total -= current;
    } else {
      total += current;
      prev = current;
    }
  }

  return total > 0 ? total : null;
}

function parseTermNumber(raw: string): number | null {
  const normalized = raw.trim();
  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }
  return romanToInt(normalized);
}

function normalizeToken(token: string): string {
  return token.replace(/[(),:;\[\]]/g, "").trim().toUpperCase();
}

function normalizeSubjectName(raw: string): string {
  let subject = raw.replace(/\s+/g, " ").trim();

  if (subject.includes("::")) {
    const [, ...rest] = subject.split("::");
    const nameOnly = rest.join("::").trim();
    if (nameOnly) subject = nameOnly;
  }

  subject = subject.replace(/^\d+[.)-]?\s+/, "").trim();
  subject = subject.replace(/[:\-\s]+$/, "").trim();

  return subject;
}

function isLikelySubjectName(name: string): boolean {
  const normalized = normalizeSubjectName(name);
  if (!normalized) return false;
  if (normalized.length < 3 || normalized.length > 90) return false;
  if (NON_SUBJECT_NAME_REGEX.test(normalized)) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 10) return false;
  if (!/[A-Za-z]/.test(normalized)) return false;
  if (/\b(select|submit|download|dashboard|logout)\b/i.test(normalized)) return false;

  return true;
}

function isTranscriptLikeSemesters(semesters: Semester[]): boolean {
  const subjects = semesters.flatMap((semester) => semester.subjects);
  if (subjects.length < 2) return false;

  let validNames = 0;
  let validCredits = 0;

  for (const subject of subjects) {
    if (isLikelySubjectName(subject.name)) validNames += 1;

    const credits = Number(subject.credits);
    if (!Number.isNaN(credits) && credits > 0 && credits <= 6) {
      validCredits += 1;
    }
  }

  const nameRatio = validNames / subjects.length;
  const creditRatio = validCredits / subjects.length;

  return nameRatio >= 0.7 && creditRatio >= 0.7;
}

function parseSubjectFromLine(line: string): Subject | null {
  const trimmed = line.trim();
  if (!trimmed || SKIP_LINE_REGEX.test(trimmed) || NOISE_LINE_REGEX.test(trimmed)) {
    return null;
  }

  const rowMatch = trimmed.match(SUBJECT_ROW_WITH_CODE_REGEX) ?? trimmed.match(SUBJECT_ROW_REGEX);
  if (!rowMatch) {
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length < 4) return null;

    let gradeIndex = -1;
    let grade = "";

    for (let i = tokens.length - 1; i >= 0; i--) {
      const candidate = normalizeToken(tokens[i]);
      if (GRADE_SET.has(candidate)) {
        gradeIndex = i;
        grade = candidate;
        break;
      }
    }

    if (gradeIndex <= 1) return null;

    let creditIndex = -1;
    for (let i = gradeIndex - 1; i >= 0; i--) {
      const candidate = tokens[i].replace(/[,]/g, "");
      const credits = Number(candidate);
      if (!Number.isNaN(credits) && credits > 0 && credits <= 30) {
        creditIndex = i;
        break;
      }
    }

    if (creditIndex <= 0) return null;

    const rawName = tokens.slice(0, creditIndex).join(" ");
    const name = normalizeSubjectName(rawName);
    const credits = tokens[creditIndex].replace(/[,]/g, "");

    if (!name || !isLikelySubjectName(name)) return null;

    return {
      id: crypto.randomUUID(),
      name,
      credits,
      grade,
    };
  }

  const [, rawName, rawCredits, rawGrade] = rowMatch;
  const grade = normalizeToken(rawGrade);
  const creditsNumber = Number(rawCredits);
  const name = normalizeSubjectName(rawName);

  if (!GRADE_SET.has(grade) || !name || !isLikelySubjectName(name) || Number.isNaN(creditsNumber) || creditsNumber <= 0 || creditsNumber > 30) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    name,
    credits: rawCredits,
    grade,
  };
}

function getLinesFromEol(content: { items: Array<{ str?: string; hasEOL?: boolean }> }): string[] {
  let text = "";

  for (const item of content.items) {
    if (!("str" in item)) continue;
    const chunk = item.str?.trim();
    if (chunk) {
      text += `${chunk} `;
    }

    if ("hasEOL" in item && item.hasEOL) {
      text += "\n";
    }
  }

  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function getLinesFromPage(items: PositionedText[]): string[] {
  const grouped = new Map<number, PositionedText[]>();

  for (const item of items) {
    if (!item.text.trim()) continue;
    const yKey = Math.round(item.y * 2) / 2;
    const existing = grouped.get(yKey) ?? [];
    existing.push(item);
    grouped.set(yKey, existing);
  }

  return [...grouped.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, lineItems]) =>
      lineItems
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function scoreLineSet(lines: string[]): number {
  let subjectRows = 0;
  let termHeaders = 0;

  for (const line of lines) {
    if (TERM_HEADER_REGEX.test(line)) termHeaders += 1;
    if (parseSubjectFromLine(line)) subjectRows += 1;
  }

  return subjectRows * 10 + termHeaders * 25;
}

function cleanupStudentValue(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[|]+/g, " ").trim();
}

function extractRowsFromHtmlDocument(doc: Document): string[][] {
  const rows: string[][] = [];
  const trNodes = Array.from(doc.querySelectorAll("tr"));

  for (const tr of trNodes) {
    const cells = Array.from(tr.querySelectorAll("th, td"))
      .map((cell) => cleanupStudentValue(cell.textContent || ""))
      .filter(Boolean);

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

function parseSubjectFromColumns(cells: string[]): Subject | null {
  if (cells.length < 2) return null;

  const normalized = cells
    .map((cell) => cell.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((cell) => !SKIP_LINE_REGEX.test(cell) && !NOISE_LINE_REGEX.test(cell));

  if (normalized.length < 2) return null;

  let gradeIndex = -1;
  let grade = "";
  for (let i = normalized.length - 1; i >= 0; i--) {
    const candidate = normalizeToken(normalized[i]);
    if (GRADE_SET.has(candidate)) {
      gradeIndex = i;
      grade = candidate;
      break;
    }
  }

  if (gradeIndex <= 0) return null;

  let creditIndex = -1;
  for (let i = gradeIndex - 1; i >= 0; i--) {
    const maybeCredit = normalized[i].replace(/,/g, "").trim();
    const creditValue = Number(maybeCredit);
    if (!Number.isNaN(creditValue) && creditValue > 0 && creditValue <= 30) {
      creditIndex = i;
      break;
    }
  }

  if (creditIndex <= 0) return null;

  const subjectParts = normalized.slice(0, creditIndex).filter((part) => !/^\d+[.)-]?$/.test(part));
  if (subjectParts.length === 0) return null;

  const name = normalizeSubjectName(subjectParts.join(" "));
  if (!name || !isLikelySubjectName(name)) return null;

  return {
    id: crypto.randomUUID(),
    name,
    credits: normalized[creditIndex].replace(/,/g, "").trim(),
    grade,
  };
}

function buildSemestersFromRows(rows: string[][]): Semester[] {
  const semesterMap = new Map<string, Semester>();
  const seenBySemester = new Map<string, Set<string>>();
  let activeSemesterName = "Semester 1";

  const ensureSemester = (name: string): Semester => {
    const existing = semesterMap.get(name);
    if (existing) return existing;

    const created: Semester = {
      id: crypto.randomUUID(),
      name,
      subjects: [],
    };

    semesterMap.set(name, created);
    seenBySemester.set(name, new Set());
    return created;
  };

  ensureSemester(activeSemesterName);

  for (const row of rows) {
    const rowText = row.join(" ");
    const termMatch = rowText.match(TERM_HEADER_REGEX);
    if (termMatch) {
      const termNumber = parseTermNumber(termMatch[1]);
      activeSemesterName = `Semester ${termNumber ?? semesterMap.size + 1}`;
      ensureSemester(activeSemesterName);
      continue;
    }

    const subjectFromColumns = parseSubjectFromColumns(row);
    const subject = subjectFromColumns ?? parseSubjectFromLine(rowText);
    if (!subject) continue;

    const semester = ensureSemester(activeSemesterName);
    const dedupeKey = `${subject.name}|${subject.credits}|${subject.grade}`;
    const seen = seenBySemester.get(activeSemesterName);
    if (!seen?.has(dedupeKey)) {
      semester.subjects.push(subject);
      seen?.add(dedupeKey);
    }
  }

  return [...semesterMap.values()]
    .filter((semester) => semester.subjects.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function detectUnsupportedAspxPage(text: string): string | null {
  const normalized = text.toLowerCase();

  const unsupportedPageSignals = [
    "certificate requests",
    "application for academic certificate",
    "frmexternalcertificates.aspx",
    "ums navigation",
    "important instructions",
    "certificate issue details",
    "change of mode of collection",
  ];

  const hasUnsupportedSignals = unsupportedPageSignals.filter((signal) => normalized.includes(signal)).length >= 2;

  if (!hasUnsupportedSignals) {
    return null;
  }

  return "This ASPX file is not a transcript marksheet. Please open/download your Academic Result or Provisional Academic Transcript document (PDF/ASPX with subject, credits, and grades) and upload that file.";
}

function confidenceRank(value: "high" | "medium" | "low" | "none" | undefined): number {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

function isLikelyStudentName(value: string): boolean {
  const cleaned = cleanupStudentValue(value);
  if (cleaned.length < 4 || cleaned.length > 90) return false;
  if (!/[A-Za-z]/.test(cleaned)) return false;
  if (/\d{3,}/.test(cleaned)) return false;
  if (NOISE_LINE_REGEX.test(cleaned)) return false;
  return true;
}

export function extractStudentDetailsFromText(text: string): StudentDetails {
  const normalized = text.replace(/\r/g, "\n");
  const lines = normalized
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const registrationRegexes = [
    /(?:registration\s*(?:number|no\.?|id)?|reg\s*(?:number|no\.?)?|university\s*roll\s*(?:number|no\.?)?|roll\s*(?:number|no\.?)?|uid)\s*[:\-]\s*([A-Z0-9\-\/]{5,})/i,
    /(?:registration\s*(?:number|no\.?)?|reg\s*(?:number|no\.?)?)\s+([A-Z0-9\-\/]{5,})/i,
  ];

  const nameRegexes = [
    /(?:student\s*name|name\s*of\s*student|candidate\s*name|name)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{2,})/i,
    /(?:student\s*name|name\s*of\s*student|candidate\s*name)\s+([A-Za-z][A-Za-z .'-]{2,})/i,
  ];

  let registrationNo: string | undefined;
  let registrationNoConfidence: "high" | "medium" | "low" | "none" = "none";
  for (const line of lines) {
    for (let i = 0; i < registrationRegexes.length; i++) {
      const regex = registrationRegexes[i];
      const match = line.match(regex);
      if (match?.[1]) {
        registrationNo = cleanupStudentValue(match[1]).toUpperCase();
        registrationNoConfidence = i === 0 ? "high" : "medium";
        break;
      }
    }
    if (registrationNo) break;
  }

  let studentName: string | undefined;
  let studentNameConfidence: "high" | "medium" | "low" | "none" = "none";
  for (const line of lines) {
    for (let i = 0; i < nameRegexes.length; i++) {
      const regex = nameRegexes[i];
      const match = line.match(regex);
      if (match?.[1]) {
        const candidate = cleanupStudentValue(match[1]);
        if (isLikelyStudentName(candidate)) {
          studentName = candidate;
          studentNameConfidence = i === 0 ? "high" : "medium";
          break;
        }
      }
    }
    if (studentName) break;
  }

  return {
    studentName,
    registrationNo,
    studentNameConfidence,
    registrationNoConfidence,
  };
}

function buildSemestersFromLines(lines: string[]): Semester[] {
  const semesterMap = new Map<string, Semester>();
  const seenRowsBySemester = new Map<string, Set<string>>();
  let activeSemesterName = "Semester 1";

  const ensureSemester = (name: string): Semester => {
    const existing = semesterMap.get(name);
    if (existing) return existing;
    const created: Semester = { id: crypto.randomUUID(), name, subjects: [] };
    semesterMap.set(name, created);
    seenRowsBySemester.set(name, new Set());
    return created;
  };

  ensureSemester(activeSemesterName);

  for (const line of lines) {
    const termMatch = line.match(TERM_HEADER_REGEX);
    if (termMatch) {
      const termNumber = parseTermNumber(termMatch[1]);
      activeSemesterName = `Semester ${termNumber ?? semesterMap.size + 1}`;
      ensureSemester(activeSemesterName);
      continue;
    }

    const subject = parseSubjectFromLine(line);
    if (!subject) continue;

    const semester = ensureSemester(activeSemesterName);
    const dedupeKey = `${subject.name}|${subject.credits}|${subject.grade}`;
    const seen = seenRowsBySemester.get(activeSemesterName);
    if (!seen?.has(dedupeKey)) {
      semester.subjects.push(subject);
      seen?.add(dedupeKey);
    }
  }

  return [...semesterMap.values()]
    .filter((semester) => semester.subjects.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((semester, index) => ({
      ...semester,
      name: semester.name || `Semester ${index + 1}`,
    }));
}

export function extractSemestersFromText(text: string): Semester[] {
  const normalizedLines = text
    .split(/\r?\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const semesters = buildSemestersFromLines(normalizedLines);
  if (semesters.length === 0) {
    throw new Error("No subjects with credits and grades could be extracted from this file.");
  }

  return semesters;
}

async function extractLinesFromPdf(file: File): Promise<string[]> {
  const pages = await extractPageLinesFromPdf(file);
  return pages.flat();
}

async function extractPageLinesFromPdf(file: File): Promise<string[][]> {
  const pdfjsLib = await getPdfJsModule();
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pageLines: string[][] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const positionedItems = content.items
      .filter((item): item is { str: string; transform: number[] } => "str" in item)
      .map((item) => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
      }));

    const coordinateLines = getLinesFromPage(positionedItems);
    const eolLines = getLinesFromEol(content);

    const coordinateScore = scoreLineSet(coordinateLines);
    const eolScore = scoreLineSet(eolLines);
    const lines = coordinateScore >= eolScore ? coordinateLines : eolLines;

    pageLines.push(lines);
  }

  return pageLines;
}

async function isPdfFile(file: File): Promise<boolean> {
  const header = await file.slice(0, 8).text();
  return header.startsWith("%PDF-");
}

async function extractTextFromAspxLike(file: File): Promise<string> {
  const raw = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");

  doc.querySelectorAll("script, style, noscript").forEach((node) => node.remove());

  return (
    doc.body?.innerText ||
    doc.body?.textContent ||
    doc.documentElement?.textContent ||
    raw
  );
}

async function extractAspxContent(file: File): Promise<{ text: string; rows: string[][] }> {
  const raw = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");

  doc.querySelectorAll("script, style, noscript").forEach((node) => node.remove());

  const rows = extractRowsFromHtmlDocument(doc);
  const text = (
    doc.body?.innerText ||
    doc.body?.textContent ||
    doc.documentElement?.textContent ||
    raw
  );

  return { text, rows };
}

async function extractTextFromScannedImage(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    const result = await worker.recognize(file);
    return result.data?.text ?? "";
  } finally {
    await worker.terminate();
  }
}

export async function extractImportDataFromPdf(file: File): Promise<ParsedImportData> {
  const pageLineSets = await extractPageLinesFromPdf(file);
  const lines = pageLineSets.flat();
  const semesters = buildSemestersFromLines(lines);

  if (semesters.length === 0) {
    throw new Error("No subjects with credits and grades could be extracted from this PDF.");
  }

  const studentDetails: StudentDetails = {
    studentNameConfidence: "none",
    registrationNoConfidence: "none",
  };

  for (let i = 0; i < pageLineSets.length; i++) {
    const pageDetails = extractStudentDetailsFromText(pageLineSets[i].join("\n"));

    if (
      pageDetails.studentName &&
      confidenceRank(pageDetails.studentNameConfidence) > confidenceRank(studentDetails.studentNameConfidence)
    ) {
      studentDetails.studentName = pageDetails.studentName;
      studentDetails.studentNameConfidence = pageDetails.studentNameConfidence;
      studentDetails.studentNamePage = i + 1;
    }

    if (
      pageDetails.registrationNo &&
      confidenceRank(pageDetails.registrationNoConfidence) > confidenceRank(studentDetails.registrationNoConfidence)
    ) {
      studentDetails.registrationNo = pageDetails.registrationNo;
      studentDetails.registrationNoConfidence = pageDetails.registrationNoConfidence;
      studentDetails.registrationNoPage = i + 1;
    }
  }

  if (!studentDetails.studentName || !studentDetails.registrationNo) {
    const fallback = extractStudentDetailsFromText(lines.join("\n"));

    if (!studentDetails.studentName && fallback.studentName) {
      studentDetails.studentName = fallback.studentName;
      studentDetails.studentNameConfidence = fallback.studentNameConfidence;
    }
    if (!studentDetails.registrationNo && fallback.registrationNo) {
      studentDetails.registrationNo = fallback.registrationNo;
      studentDetails.registrationNoConfidence = fallback.registrationNoConfidence;
    }
  }

  return { semesters, studentDetails };
}

export async function extractSemestersFromAspx(file: File): Promise<Semester[]> {
  if (await isPdfFile(file)) {
    return extractSemestersFromPdf(file);
  }

  const { text, rows } = await extractAspxContent(file);
  const fromRows = buildSemestersFromRows(rows);
  if (fromRows.length > 0 && isTranscriptLikeSemesters(fromRows)) return fromRows;

  let fromText: Semester[] = [];
  try {
    fromText = extractSemestersFromText(text);
  } catch {
    const unsupportedMessage = detectUnsupportedAspxPage(text);
    if (unsupportedMessage) {
      throw new Error(unsupportedMessage);
    }
    throw new Error("No valid transcript rows found in this ASPX file. Please upload the Academic Result/Transcript file.");
  }

  if (isTranscriptLikeSemesters(fromText)) return fromText;

  const unsupportedMessage = detectUnsupportedAspxPage(text);
  if (unsupportedMessage) {
    throw new Error(unsupportedMessage);
  }

  throw new Error("No valid transcript rows found in this ASPX file. Please upload the Academic Result/Transcript file.");
}

export async function extractImportDataFromAspx(file: File): Promise<ParsedImportData> {
  if (await isPdfFile(file)) {
    return extractImportDataFromPdf(file);
  }

  const { text, rows } = await extractAspxContent(file);
  const fromRows = buildSemestersFromRows(rows);
  let fromText: Semester[] = [];
  if (fromRows.length === 0) {
    try {
      fromText = extractSemestersFromText(text);
    } catch {
      const unsupportedMessage = detectUnsupportedAspxPage(text);
      if (unsupportedMessage) {
        throw new Error(unsupportedMessage);
      }
      throw new Error("No valid transcript rows found in this ASPX file. Please upload the Academic Result/Transcript file.");
    }
  }

  const candidateSemesters = fromRows.length > 0 ? fromRows : fromText;

  if (!isTranscriptLikeSemesters(candidateSemesters)) {
    const unsupportedMessage = detectUnsupportedAspxPage(text);
    if (unsupportedMessage) {
      throw new Error(unsupportedMessage);
    }
    throw new Error("No valid transcript rows found in this ASPX file. Please upload the Academic Result/Transcript file.");
  }

  const semesters = candidateSemesters;

  const studentDetails = extractStudentDetailsFromText(text);
  return { semesters, studentDetails };
}

export async function extractSemestersFromScannedImage(file: File): Promise<Semester[]> {
  const text = await extractTextFromScannedImage(file);
  return extractSemestersFromText(text);
}

export async function extractImportDataFromScannedImage(file: File): Promise<ParsedImportData> {
  const text = await extractTextFromScannedImage(file);
  const semesters = extractSemestersFromText(text);
  const studentDetails = extractStudentDetailsFromText(text);
  return { semesters, studentDetails };
}

export async function extractSemestersFromPdf(file: File): Promise<Semester[]> {
  const allLines = await extractLinesFromPdf(file);

  const semesters = buildSemestersFromLines(allLines);

  if (semesters.length === 0) {
    throw new Error("No subjects with credits and grades could be extracted from this PDF.");
  }

  return semesters;
}