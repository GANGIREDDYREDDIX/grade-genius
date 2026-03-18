import { Semester, calculateCGPA } from "@/lib/gpa";

interface CGPADisplayProps {
  semesters: Semester[];
}

const CGPADisplay = ({ semesters }: CGPADisplayProps) => {
  const { cgpa, totalCredits, valid } = calculateCGPA(semesters);

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">GPA Calculator</h1>
          {valid && (
            <p className="text-sm text-muted-foreground">
              {totalCredits} total credits across {semesters.length} semester{semesters.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
        {valid && (
          <div className="text-right">
            <div className="text-xs font-medium text-success">CGPA</div>
            <div className="text-3xl font-bold text-success">{cgpa.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CGPADisplay;
