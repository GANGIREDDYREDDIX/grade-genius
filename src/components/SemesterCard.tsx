import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="transition-all duration-150">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={semester.name}
              onChange={(e) => onChange({ ...semester, name: e.target.value })}
              className="text-lg font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent max-w-[200px]"
              maxLength={50}
            />
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {valid && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">TGPA</div>
                <div className="text-xl font-bold text-primary">{tgpa.toFixed(2)}</div>
              </div>
            )}
            {canRemove && (
              <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {valid && (
          <p className="text-sm text-muted-foreground">
            Total Credits: {totalCredits}
          </p>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-2">
          {/* Header labels for desktop */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_40px] gap-2 px-3 text-xs font-medium text-muted-foreground">
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
            <Button variant="outline" size="sm" onClick={addSubject}>
              <Plus className="h-4 w-4 mr-1" /> Add Subject
            </Button>
            <Button variant="ghost" size="sm" onClick={resetSemester} className="text-muted-foreground">
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default SemesterCard;
