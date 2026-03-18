import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADES, GRADE_MAP } from "@/lib/gpa";
import { cn } from "@/lib/utils";

interface GradeSelectProps {
  value: string;
  onChange: (value: string) => void;
  triggerClassName?: string;
}

const GradeSelect = ({ value, onChange, triggerClassName }: GradeSelectProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger
      className={cn(
        "w-full min-w-[100px] h-11 rounded-lg bg-background transition-colors duration-300",
        triggerClassName,
      )}
    >
      <SelectValue placeholder="Grade" />
    </SelectTrigger>
    <SelectContent>
      {GRADES.map((g) => (
        <SelectItem key={g} value={g}>
          {g} ({GRADE_MAP[g] ?? "-"})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default GradeSelect;
