import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import CGPADisplay from "@/components/CGPADisplay";
import SemesterCard from "@/components/SemesterCard";
import { Semester, createSemester, loadSemesters, saveSemesters } from "@/lib/gpa";
import { Plus } from "lucide-react";

const Index = () => {
  const [semesters, setSemesters] = useState<Semester[]>(loadSemesters);

  useEffect(() => {
    saveSemesters(semesters);
  }, [semesters]);

  const updateSemester = (index: number, updated: Semester) => {
    const next = [...semesters];
    next[index] = updated;
    setSemesters(next);
  };

  const removeSemester = (index: number) => {
    setSemesters(semesters.filter((_, i) => i !== index));
  };

  const addSemester = () => {
    setSemesters([...semesters, createSemester(semesters.length + 1)]);
  };

  return (
    <div className="min-h-screen bg-background">
      <CGPADisplay semesters={semesters} />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {semesters.map((sem, i) => (
          <SemesterCard
            key={sem.id}
            semester={sem}
            onChange={(updated) => updateSemester(i, updated)}
            onRemove={() => removeSemester(i)}
            canRemove={semesters.length > 1}
          />
        ))}
        <Button variant="outline" onClick={addSemester} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add Semester
        </Button>
      </main>
    </div>
  );
};

export default Index;
