import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADES, GRADE_MAP } from "@/lib/gpa";

interface GradeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const GradeSelect = ({ value, onChange }: GradeSelectProps) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full min-w-[100px]">
      <SelectValue placeholder="Grade" />
    </SelectTrigger>
    <SelectContent>
      {GRADES.map((g) => (
        <SelectItem key={g} value={g}>
          {g} ({GRADE_MAP[g]})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default GradeSelect;
