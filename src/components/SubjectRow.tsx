import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GradeSelect from "@/components/GradeSelect";
import { Subject } from "@/lib/gpa";
import { Trash2 } from "lucide-react";

interface SubjectRowProps {
  subject: Subject;
  onChange: (updated: Subject) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const SubjectRow = ({ subject, onChange, onRemove, canRemove }: SubjectRowProps) => {
  const update = (field: keyof Subject, value: string) => {
    onChange({ ...subject, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_40px] gap-2 items-start p-3 rounded-lg bg-muted/50 transition-all duration-150">
      <Input
        placeholder="Subject name"
        value={subject.name}
        onChange={(e) => update("name", e.target.value)}
        maxLength={100}
      />
      <Input
        type="number"
        placeholder="Credits"
        min={1}
        max={30}
        value={subject.credits}
        onChange={(e) => update("credits", e.target.value)}
      />
      <GradeSelect value={subject.grade} onChange={(v) => update("grade", v)} />
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
        aria-label="Remove subject"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SubjectRow;
