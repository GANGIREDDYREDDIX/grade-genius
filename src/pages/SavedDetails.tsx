import { Button } from "@/components/ui/button";
import { calculateCGPA, calculateTGPA, GRADE_MAP, Semester } from "@/lib/gpa";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const SNAPSHOT_KEY = "gpa-calculator-snapshot";
const SNAPSHOT_HISTORY_KEY = "gpa-calculator-snapshot-history";

interface SavedSnapshotRecord {
  id: string;
  savedAt: string;
  studentName?: string;
  registrationNo?: string;
  semesters: Semester[];
}

const SavedDetails = () => {
  const [snapshots, setSnapshots] = useState<SavedSnapshotRecord[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [hasSnapshot, setHasSnapshot] = useState(true);
  const navigate = useNavigate();

  const checkNewStudent = () => {
    navigate("/");
  };

  const deleteSnapshot = (id: string) => {
    const next = snapshots.filter((snapshot) => snapshot.id !== id);
    setSnapshots(next);

    try {
      if (next.length > 0) {
        localStorage.setItem(SNAPSHOT_HISTORY_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(SNAPSHOT_HISTORY_KEY);
        localStorage.removeItem(SNAPSHOT_KEY);
      }
    } catch {
      // ignore localStorage errors
    }

    if (next.length === 0) {
      setSelectedSnapshotId(null);
      setHasSnapshot(false);
      return;
    }

    if (selectedSnapshotId === id) {
      setSelectedSnapshotId(next[0].id);
    }
  };

  useEffect(() => {
    try {
      const rawHistory = localStorage.getItem(SNAPSHOT_HISTORY_KEY);
      const parsedHistory = rawHistory ? (JSON.parse(rawHistory) as SavedSnapshotRecord[]) : [];

      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        const validHistory = parsedHistory.filter((item) => item && Array.isArray(item.semesters));
        if (validHistory.length > 0) {
          setSnapshots(validHistory);
          setSelectedSnapshotId(validHistory[0].id);
          return;
        }
      }

      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (!raw) {
        setHasSnapshot(false);
        return;
      }

      const parsed = JSON.parse(raw) as Semester[];
      if (!Array.isArray(parsed)) {
        setHasSnapshot(false);
        return;
      }

      const legacyRecord: SavedSnapshotRecord = {
        id: "legacy-snapshot",
        savedAt: new Date().toISOString(),
        semesters: parsed,
      };

      setSnapshots([legacyRecord]);
      setSelectedSnapshotId(legacyRecord.id);
    } catch {
      setHasSnapshot(false);
    }
  }, []);

  const activeSnapshot = useMemo(() => {
    if (snapshots.length === 0) return null;
    if (!selectedSnapshotId) return snapshots[0];
    return snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? snapshots[0];
  }, [snapshots, selectedSnapshotId]);

  const savedSemesters = activeSnapshot?.semesters ?? [];

  const overall = useMemo(() => calculateCGPA(savedSemesters), [savedSemesters]);

  if (!hasSnapshot) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <main className="mx-auto max-w-3xl rounded-2xl border border-border/70 bg-card p-6 text-center">
          <h1 className="text-2xl font-bold">No saved details found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please go back, enter your data, and click Save again.
          </p>
          <Button className="mt-5" onClick={() => (window.location.href = "/")}> 
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-10">
      <main className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-2xl border border-border/70 bg-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => navigate("/")} className="rounded-lg">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button variant="secondary" size="sm" onClick={checkNewStudent} className="rounded-lg">
                  Check New Student
                </Button>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Saved CGPA Details</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Snapshots saved on this browser. Review current and previous student records below.
              </p>
              {(activeSnapshot?.studentName || activeSnapshot?.registrationNo) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeSnapshot?.studentName ? `Student: ${activeSnapshot.studentName}` : "Student: -"}
                  {activeSnapshot?.registrationNo ? ` • Reg No: ${activeSnapshot.registrationNo}` : ""}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-right">
              <div className="text-xs font-medium text-primary/80">Overall CGPA</div>
              <div className="text-2xl font-bold text-primary">{overall.valid ? overall.cgpa.toFixed(2) : "--"}</div>
            </div>
          </div>

          {snapshots.length > 0 && (
            <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved Records</p>
              <div className="flex flex-wrap gap-2">
                {snapshots.map((snapshot, index) => {
                  const labelDate = new Date(snapshot.savedAt).toLocaleString();
                  const isActive = (activeSnapshot?.id ?? "") === snapshot.id;
                  const primaryLabel = snapshot.studentName || snapshot.registrationNo || `Record ${snapshots.length - index}`;

                  return (
                    <div key={snapshot.id} className="flex items-center gap-1">
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSnapshotId(snapshot.id)}
                        className="rounded-lg"
                      >
                        {primaryLabel} • {labelDate}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSnapshot(snapshot.id)}
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Delete record ${snapshots.length - index}`}
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {savedSemesters.map((semester, index) => {
          const { tgpa, totalCredits, valid } = calculateTGPA(semester.subjects);

          return (
            <section key={semester.id || `${semester.name}-${index}`} className="rounded-2xl border border-border/70 bg-card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{semester.name || `Semester ${index + 1}`}</h2>
                <div className="text-sm text-muted-foreground">
                  TGPA: <span className="font-semibold text-foreground">{valid ? tgpa.toFixed(2) : "--"}</span> • Credits: {totalCredits}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">Subject</th>
                      <th className="py-2 pr-3 font-medium">Credits</th>
                      <th className="py-2 pr-3 font-medium">Grade</th>
                      <th className="py-2 pr-0 font-medium">Point</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semester.subjects.map((subject, i) => (
                      <tr key={subject.id || `${semester.id}-${i}`} className="border-b border-border/60">
                        <td className="py-2 pr-3">{i + 1}</td>
                        <td className="py-2 pr-3">{subject.name || "-"}</td>
                        <td className="py-2 pr-3">{subject.credits || "-"}</td>
                        <td className="py-2 pr-3">{subject.grade || "-"}</td>
                        <td className="py-2 pr-0">{GRADE_MAP[subject.grade] ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <footer className="pt-1 text-center text-xs text-muted-foreground">
          Disclaimer: This project is an independent unofficial tool and is not affiliated with, endorsed by, or operated by Lovely Professional University (LPU).
        </footer>
      </main>
    </div>
  );
};

export default SavedDetails;
