export const GRADE_MAP: Record<string, number | null> = {
  "O": 10,
  "A+": 9,
  "A": 8,
  "B+": 7,
  "B": 6,
  "C": 5,
  "D": 4,
  "G": 0,
  "E": 0,
  "F": 0,
  "I": null,
  "M": null,
  "R": null,
  "S": null,
  "U": null,
};

export const GRADES = Object.keys(GRADE_MAP);

export interface Subject {
  id: string;
  name: string;
  credits: string;
  grade: string;
}

export interface Semester {
  id: string;
  name: string;
  subjects: Subject[];
}

export function createSubject(): Subject {
  return { id: crypto.randomUUID(), name: "", credits: "", grade: "" };
}

export function createSemester(index: number): Semester {
  return {
    id: crypto.randomUUID(),
    name: `Semester ${index}`,
    subjects: [createSubject()],
  };
}

export function calculateTGPA(subjects: Subject[]): { tgpa: number; totalCredits: number; valid: boolean } {
  let totalWeighted = 0;
  let totalCredits = 0;

  for (const s of subjects) {
    const credits = parseFloat(s.credits);
    const gradePoint = GRADE_MAP[s.grade];
    if (!s.name.trim() || isNaN(credits) || credits < 0 || gradePoint === undefined || gradePoint === null) continue;
    totalWeighted += credits * gradePoint;
    totalCredits += credits;
  }

  return {
    tgpa: totalCredits > 0 ? totalWeighted / totalCredits : 0,
    totalCredits,
    valid: totalCredits > 0,
  };
}

export function calculateCGPA(semesters: Semester[]): { cgpa: number; totalCredits: number; valid: boolean } {
  let totalWeighted = 0;
  let totalCredits = 0;

  for (const sem of semesters) {
    for (const s of sem.subjects) {
      const credits = parseFloat(s.credits);
      const gradePoint = GRADE_MAP[s.grade];
      if (!s.name.trim() || isNaN(credits) || credits < 0 || gradePoint === undefined || gradePoint === null) continue;
      totalWeighted += credits * gradePoint;
      totalCredits += credits;
    }
  }

  return {
    cgpa: totalCredits > 0 ? totalWeighted / totalCredits : 0,
    totalCredits,
    valid: totalCredits > 0,
  };
}

const STORAGE_KEY = "gpa-calculator-data";

export function loadSemesters(): Semester[] {
  // Always start fresh on page load/refresh.
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return [createSemester(1)];
}

export function saveSemesters(_semesters: Semester[]) {
  // Intentionally disabled: do not persist data between refreshes.
}
