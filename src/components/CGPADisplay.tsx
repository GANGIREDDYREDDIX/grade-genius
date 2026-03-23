import { Semester, calculateCGPA, calculateTGPA } from "@/lib/gpa";
import ThemeToggle from "@/components/ThemeToggle";
import { BarChart3, GraduationCap, Layers3, Sigma } from "lucide-react";

interface CGPADisplayProps {
  semesters: Semester[];
  baselineSemesters?: Semester[];
}

const CGPADisplay = ({ semesters, baselineSemesters = [] }: CGPADisplayProps) => {
  const { cgpa, totalCredits, valid } = calculateCGPA(semesters);
  const { cgpa: baselineCgpa, valid: baselineValid } = calculateCGPA(baselineSemesters);
  const activeSemesters = semesters.filter((semester) => calculateTGPA(semester.subjects).valid).length;
  const completion = semesters.length ? Math.round((activeSemesters / semesters.length) * 100) : 0;

  const baselineGradeBySubjectId = new Map<string, string>();
  for (const semester of baselineSemesters) {
    for (const subject of semester.subjects) {
      baselineGradeBySubjectId.set(subject.id, subject.grade);
    }
  }

  let changedGradeCount = 0;
  for (const semester of semesters) {
    for (const subject of semester.subjects) {
      const baselineGrade = baselineGradeBySubjectId.get(subject.id);
      if (baselineGrade !== undefined && baselineGrade !== subject.grade) {
        changedGradeCount += 1;
      }
    }
  }

  const showActualVsNewCgpa = baselineValid && valid && changedGradeCount > 0;

  return (
    <header className="relative z-20">
      <div className="max-w-6xl mx-auto px-4 pt-6 md:pt-8">
        <div className="animate-fade-up rounded-3xl border border-border/70 bg-card/85 backdrop-blur-xl shadow-[0_18px_48px_-28px_hsl(var(--primary))] p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                GPA Command Center
              </p>
              <h1 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">Grade Genius</h1>
              <p className="mt-1 text-sm text-muted-foreground">A redesigned workspace to plan subjects, credits, and track CGPA in real time.</p>
            </div>

            <ThemeToggle />
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Layers3 className="h-3.5 w-3.5" /> Semesters</div>
              <div className="mt-1 text-xl font-bold">{activeSemesters}/{semesters.length}</div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sigma className="h-3.5 w-3.5" /> Credits</div>
              <div className="mt-1 text-xl font-bold">{valid ? totalCredits : 0}</div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="h-3.5 w-3.5" /> Completion</div>
              <div className="mt-1 text-xl font-bold">{completion}%</div>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3">
              <div className="flex items-center gap-2 text-xs text-primary/80"><GraduationCap className="h-3.5 w-3.5" /> CGPA</div>
              <div className="mt-1 text-xl font-bold text-primary">{valid ? cgpa.toFixed(2) : "--"}</div>
              {showActualVsNewCgpa && (
                <p className="mt-1 text-[11px] leading-tight text-primary/85">
                  Actual: <span className="font-semibold">{baselineCgpa.toFixed(2)}</span> → New: <span className="font-semibold">{cgpa.toFixed(2)}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 h-2 rounded-full bg-secondary/80 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default CGPADisplay;
