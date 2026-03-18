import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SubjectRow from "@/components/SubjectRow";
import { Semester, Subject, createSubject, calculateTGPA } from "@/lib/gpa";
import { Plus, RotateCcw, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface SemesterCardProps {
  semester: Semester;
  onChange: (updated: Semester) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const SemesterCard = ({ semester, onChange, onRemove, canRemove }: SemesterCardProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { tgpa, totalCredits, valid } = calculateTGPA(semester.subjects);

  const updateSubject = (index: number, updated: Subject) => {
    const subjects = [...semester.subjects];
    subjects[index] = updated;
    onChange({ ...semester, subjects });
  };

  const removeSubject = (index: number) => {
    onChange({ ...semester, subjects: semester.subjects.filter((_, i) => i !== index) });
  };

  const addSubject = () => {
    onChange({ ...semester, subjects: [...semester.subjects, createSubject()] });
  };

  const resetSemester = () => {
    onChange({ ...semester, subjects: [createSubject()] });
  };

  return (
    <Card className="border border-border/70 bg-card/90 backdrop-blur rounded-2xl shadow-[0_18px_40px_-30px_hsl(var(--primary))] transition-all duration-200">
      <CardHeader className="pb-3 pt-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={semester.name}
              onChange={(e) => onChange({ ...semester, name: e.target.value })}
              className="text-lg md:text-xl font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent max-w-[280px]"
              maxLength={50}
            />
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {valid && (
              <div className="text-right rounded-xl border border-primary/25 bg-primary/10 px-3 py-1.5">
                <div className="text-[11px] font-medium text-primary/80">TGPA Score</div>
                <div className="text-2xl leading-none font-bold text-primary">{tgpa.toFixed(2)}</div>
              </div>
            )}
            {canRemove && (
              <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl border border-transparent hover:border-destructive/20">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {valid && (
          <p className="text-sm text-muted-foreground mt-1">
            Total Credits: {totalCredits}
          </p>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-3 pb-4 pt-4">
          {/* Header labels for desktop */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_40px] gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
            <span>Subject</span>
            <span>Credits</span>
            <span>Grade</span>
            <span />
          </div>

          {semester.subjects.map((subject, i) => (
            <SubjectRow
              key={subject.id}
              subject={subject}
              onChange={(updated) => updateSubject(i, updated)}
              onRemove={() => removeSubject(i)}
              canRemove={semester.subjects.length > 1}
            />
          ))}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={addSubject} className="rounded-lg border-border/70">
              <Plus className="h-4 w-4 mr-1" /> Add Subject
            </Button>
            <Button variant="ghost" size="sm" onClick={resetSemester} className="text-muted-foreground rounded-lg border border-transparent hover:border-border/70">
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default SemesterCard;
