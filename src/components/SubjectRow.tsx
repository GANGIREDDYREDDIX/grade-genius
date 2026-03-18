import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GradeSelect from "@/components/GradeSelect";
import { Subject } from "@/lib/gpa";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface SubjectRowProps {
  subject: Subject;
  onChange: (updated: Subject) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const SubjectRow = ({ subject, onChange, onRemove, canRemove }: SubjectRowProps) => {
  const [gradeChanged, setGradeChanged] = useState(false);
  const initialGradeRef = useRef(subject.grade);

  const update = (field: keyof Subject, value: string) => {
    onChange({ ...subject, [field]: value });
  };

  const handleGradeChange = (value: string) => {
    if (value === subject.grade) return;
    onChange({ ...subject, grade: value });
    setGradeChanged(true);
  };

  useEffect(() => {
    if (!gradeChanged) return;
    const timeoutId = window.setTimeout(() => setGradeChanged(false), 620);
    return () => window.clearTimeout(timeoutId);
  }, [gradeChanged]);

  const isGradeModified = subject.grade !== initialGradeRef.current;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_40px] gap-2 items-start p-3 rounded-xl border border-border/70 bg-background/70 transition-all duration-200 hover:bg-muted/35 hover:border-primary/25">
      <Input
        placeholder="Subject name"
        value={subject.name}
        onChange={(e) => update("name", e.target.value)}
        maxLength={100}
        className="h-11 rounded-lg bg-background"
      />
      <Input
        type="number"
        placeholder="Credits"
        min={0}
        max={30}
        value={subject.credits}
        onChange={(e) => update("credits", e.target.value)}
        className="h-11 rounded-lg bg-background"
      />
      <div className="space-y-1">
        <GradeSelect
          value={subject.grade}
          onChange={handleGradeChange}
          triggerClassName={cn(isGradeModified && "grade-modified", gradeChanged && "grade-changed-flash")}
        />
        {isGradeModified && (
          <p className="text-[11px] leading-tight text-muted-foreground">
            Actual: <span className="font-medium text-foreground/80">{initialGradeRef.current || "-"}</span> → Changed: <span className="font-medium text-primary">{subject.grade || "-"}</span>
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-11 w-10 rounded-lg border border-transparent hover:border-destructive/20"
        aria-label="Remove subject"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SubjectRow;
