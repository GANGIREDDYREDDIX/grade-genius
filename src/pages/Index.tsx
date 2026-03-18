import { ChangeEvent, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CGPADisplay from "@/components/CGPADisplay";
import SemesterCard from "@/components/SemesterCard";
import { FeedbackModal } from "@/components/FeedbackModal";
import { calculateCGPA, calculateTGPA, GRADE_MAP, Semester, createSemester, loadSemesters, saveSemesters } from "@/lib/gpa";
import { extractImportDataFromAspx, extractImportDataFromPdf, extractImportDataFromScannedImage } from "@/lib/pdfImport";
import { FileSpreadsheet, FileText, FileUp, Plus, Save, Sparkles, Rocket, Wand2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
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

const Index = () => {
  const [semesters, setSemesters] = useState<Semester[]>(loadSemesters);
  const [isImporting, setIsImporting] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const mergeSemesters = (base: Semester[], incoming: Semester[]): Semester[] => {
    const merged = new Map<string, Semester>();
    const seenBySemester = new Map<string, Set<string>>();

    const putSemester = (semester: Semester) => {
      const key = (semester.name || "").trim() || `Semester ${merged.size + 1}`;
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, {
          id: semester.id || crypto.randomUUID(),
          name: key,
          subjects: [],
        });
        seenBySemester.set(key, new Set());
      }

      const target = merged.get(key)!;
      const seen = seenBySemester.get(key)!;

      for (const subject of semester.subjects) {
        const dedupeKey = `${subject.name}|${subject.credits}|${subject.grade}`;
        if (seen.has(dedupeKey)) continue;

        target.subjects.push({
          ...subject,
          id: subject.id || crypto.randomUUID(),
        });
        seen.add(dedupeKey);
      }
    };

    for (const semester of base) putSemester(semester);
    for (const semester of incoming) putSemester(semester);

    return [...merged.values()]
      .filter((semester) => semester.subjects.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  };

  const getImportFileType = async (file: File): Promise<"pdf" | "aspx" | "image" | null> => {
    const name = file.name.toLowerCase();

    // Some portals download transcript PDFs with .aspx extension.
    // Detect by file signature to avoid parsing PDF bytes as text/HTML.
    const header = await file.slice(0, 8).text();
    if (header.startsWith("%PDF-")) return "pdf";

    if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
    if (
      name.endsWith(".aspx") ||
      name.endsWith(".html") ||
      name.endsWith(".htm") ||
      file.type.includes("html") ||
      file.type.includes("xml") ||
      file.type.includes("text")
    ) {
      return "aspx";
    }
    if (file.type.startsWith("image/")) return "image";
    return null;
  };

  const handlePdfUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const fileTypes = await Promise.all(files.map((file) => getImportFileType(file)));
    if (fileTypes.some((type) => !type)) {
      toast.error("Please upload PDF, ASPX/HTML, or scanned image files.");
      event.target.value = "";
      return;
    }

    const types = fileTypes as Array<"pdf" | "aspx" | "image">;
    const hasNonImage = types.some((type) => type !== "image");
    if (files.length > 1 && hasNonImage) {
      toast.error("For PDF/ASPX, upload only one file. Multiple upload is allowed only for images/PNG.");
      event.target.value = "";
      return;
    }

    try {
      setIsImporting(true);
      let parsedSemesters: Semester[] = [];
      let detectedStudentName = "";
      let detectedRegistrationNo = "";

      if (types[0] === "pdf") {
        const imported = await extractImportDataFromPdf(files[0]);
        parsedSemesters = imported.semesters;
        detectedStudentName = imported.studentDetails.studentName || "";
        detectedRegistrationNo = imported.studentDetails.registrationNo || "";
      } else if (types[0] === "aspx") {
        const imported = await extractImportDataFromAspx(files[0]);
        parsedSemesters = imported.semesters;
        detectedStudentName = imported.studentDetails.studentName || "";
        detectedRegistrationNo = imported.studentDetails.registrationNo || "";
      } else {
        for (const imageFile of files) {
          const imported = await extractImportDataFromScannedImage(imageFile);
          parsedSemesters = mergeSemesters(parsedSemesters, imported.semesters);

          if (!detectedStudentName && imported.studentDetails.studentName) {
            detectedStudentName = imported.studentDetails.studentName;
          }
          if (!detectedRegistrationNo && imported.studentDetails.registrationNo) {
            detectedRegistrationNo = imported.studentDetails.registrationNo;
          }
        }
      }

      setSemesters(parsedSemesters);
      if (detectedStudentName) setStudentName(detectedStudentName);
      if (detectedRegistrationNo) setRegistrationNo(detectedRegistrationNo);

      const sourceLabel = types[0] === "image" ? (files.length > 1 ? "IMAGES" : "IMAGE") : types[0].toUpperCase();
      const autofillDetails = [
        detectedStudentName ? "Name" : "",
        detectedRegistrationNo ? "Reg No" : "",
      ].filter(Boolean);
      const autofillText = autofillDetails.length > 0 ? ` Auto-filled: ${autofillDetails.join(" + ")}.` : "";

      toast.success(`Imported ${parsedSemesters.length} semester${parsedSemesters.length > 1 ? "s" : ""} from ${sourceLabel}.${autofillText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to parse the uploaded document.";
      toast.error(message);
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const saveSnapshot = () => {
    try {
      const record: SavedSnapshotRecord = {
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        studentName: studentName.trim() || undefined,
        registrationNo: registrationNo.trim() || undefined,
        semesters,
      };

      const rawHistory = localStorage.getItem(SNAPSHOT_HISTORY_KEY);
      const parsedHistory = rawHistory ? (JSON.parse(rawHistory) as SavedSnapshotRecord[]) : [];
      const safeHistory = Array.isArray(parsedHistory) ? parsedHistory : [];
      const nextHistory = [record, ...safeHistory].slice(0, 50);

      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(semesters));
      localStorage.setItem(SNAPSHOT_HISTORY_KEY, JSON.stringify(nextHistory));
      toast.success("Progress saved locally.");
      navigate("/saved-details");
    } catch {
      toast.error("Unable to save right now.");
    }
  };

  const startForNewStudent = () => {
    try {
      localStorage.removeItem(SNAPSHOT_KEY);
    } catch {
      // ignore localStorage errors
    }
    setSemesters([createSemester(1)]);
    setStudentName("");
    setRegistrationNo("");
    toast.success("Ready for new student.");
  };

  const downloadExcel = () => {
    try {
      const rows: Array<Record<string, string | number>> = [];

      semesters.forEach((semester) => {
        semester.subjects.forEach((subject) => {
          const credits = Number(subject.credits || 0);
          const gradePoint = GRADE_MAP[subject.grade];
          rows.push({
            Semester: semester.name,
            Subject: subject.name,
            Credits: Number.isFinite(credits) ? credits : 0,
            Grade: subject.grade,
            "Grade Point": gradePoint ?? "-",
          });
        });
      });

      const summary = semesters.map((semester) => {
        const { tgpa, totalCredits, valid } = calculateTGPA(semester.subjects);
        return {
          Semester: semester.name,
          TGPA: valid ? Number(tgpa.toFixed(2)) : "--",
          Credits: totalCredits,
        };
      });

      const { cgpa, totalCredits, valid } = calculateCGPA(semesters);
      const safeStudentName = studentName.trim() || "-";
      const safeRegistrationNo = registrationNo.trim() || "-";

      summary.unshift(
        {
          Semester: "Student Name",
          TGPA: safeStudentName,
          Credits: "",
        },
        {
          Semester: "Registration No",
          TGPA: safeRegistrationNo,
          Credits: "",
        },
      );

      summary.push({
        Semester: "Overall CGPA",
        TGPA: valid ? Number(cgpa.toFixed(2)) : "--",
        Credits: totalCredits,
      });
      summary.push({
        Semester: "Disclaimer",
        TGPA: "This is an independent unofficial GPA/CGPA calculator.",
        Credits: "Not affiliated with, endorsed by, or operated by LPU.",
      });

      const disclaimerRows = [
        {
          Disclaimer: `Student Name: ${safeStudentName}`,
        },
        {
          Disclaimer: `Registration No: ${safeRegistrationNo}`,
        },
        {
          Disclaimer:
            "This project/report is an independent unofficial tool and is not affiliated with, endorsed by, or operated by Lovely Professional University (LPU).",
        },
        {
          Disclaimer: "Please verify all results with official university records.",
        },
      ];

      const workbook = XLSX.utils.book_new();
      const dataSheet = XLSX.utils.json_to_sheet(rows);
      const summarySheet = XLSX.utils.json_to_sheet(summary);
      const disclaimerSheet = XLSX.utils.json_to_sheet(disclaimerRows);
      XLSX.utils.book_append_sheet(workbook, dataSheet, "Subjects");
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, disclaimerSheet, "Disclaimer");

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `lpu-cgpa-data-${timestamp}.xlsx`);
      toast.success("Excel download started.");
    } catch {
      toast.error("Unable to download Excel file.");
    }
  };

  const downloadPdf = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const palette = {
        title: [15, 23, 42] as [number, number, number],
        accent: [14, 116, 144] as [number, number, number],
        headBg: [15, 118, 110] as [number, number, number],
        semHeadBg: [236, 253, 245] as [number, number, number],
        semHeadText: [6, 78, 59] as [number, number, number],
        bodyText: [31, 41, 55] as [number, number, number],
        border: [209, 213, 219] as [number, number, number],
      };

      const { cgpa, totalCredits, valid } = calculateCGPA(semesters);
      const safeStudentName = studentName.trim() || "-";
      const safeRegistrationNo = registrationNo.trim() || "-";
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...palette.title);
      doc.setFontSize(24);
      doc.text("LPU CGPA Report", margin, 52);

      doc.setDrawColor(...palette.accent);
      doc.setLineWidth(1.2);
      doc.line(margin, 60, pageWidth - margin, 60);

      doc.setTextColor(...palette.bodyText);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 70);
      doc.text("Created by Vishnu Vardha Reddy Gangireddy", pageWidth - margin, 70, { align: "right" });
      doc.text(`Student: ${safeStudentName}`, margin, 84);
      doc.text(`Registration No: ${safeRegistrationNo}`, margin, 96);

      const disclaimerText =
        "Disclaimer: This is an independent unofficial GPA/CGPA calculator and is not affiliated with, endorsed by, or operated by Lovely Professional University (LPU).";
      doc.setFontSize(8.5);
      doc.setTextColor(90, 100, 120);
      const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - margin * 2);
      const disclaimerY = 112;
      doc.text(disclaimerLines, margin, disclaimerY);
      const summaryTableStartY = disclaimerY + disclaimerLines.length * 10 + 8;

      autoTable(doc, {
        startY: summaryTableStartY,
        margin: { left: margin, right: margin },
        head: [["Overall CGPA", "Total Credits", "Semesters"]],
        body: [[valid ? cgpa.toFixed(2) : "--", `${totalCredits}`, `${semesters.length}`]],
        theme: "grid",
        styles: { fontSize: 11, cellPadding: 8, lineColor: palette.border, lineWidth: 1 },
        headStyles: { fillColor: palette.headBg, textColor: 255, fontStyle: "bold" },
        bodyStyles: { textColor: palette.bodyText },
      });

      semesters.forEach((semester, index) => {
        const previousY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
        let startY = previousY + 22;
        const { tgpa, totalCredits: semCredits, valid: semValid } = calculateTGPA(semester.subjects);

        const pageHeight = doc.internal.pageSize.getHeight();
        if (startY > pageHeight - 120) {
          doc.addPage();
          startY = margin;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...palette.title);
        doc.text(`${index + 1}. ${semester.name}`, margin, startY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...palette.bodyText);
        doc.text(`TGPA: ${semValid ? tgpa.toFixed(2) : "--"}`, margin + 220, startY);
        doc.text(`Credits: ${semCredits}`, pageWidth - margin, startY, { align: "right" });

        autoTable(doc, {
          startY: startY + 8,
          margin: { left: margin, right: margin },
          head: [["#", "Subject", "Credits", "Grade (Point)"]],
          body: semester.subjects.map((subject, i) => {
            const gradePoint = GRADE_MAP[subject.grade];
            return [
              `${i + 1}`,
              subject.name || "Untitled Subject",
              subject.credits || "0",
              `${subject.grade || "-"} (${gradePoint ?? "-"})`,
            ];
          }),
          theme: "grid",
          headStyles: { fillColor: palette.semHeadBg, textColor: palette.semHeadText, fontStyle: "bold" },
          styles: { fontSize: 10, cellPadding: 7, lineColor: palette.border, lineWidth: 1, textColor: palette.bodyText },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          columnStyles: {
            0: { cellWidth: 34, halign: "center" },
            1: { cellWidth: 301 },
            2: { cellWidth: 80, halign: "center" },
            3: { cellWidth: 90, halign: "center" },
          },
        });
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      doc.save(`lpu-cgpa-report-${timestamp}.pdf`);
      toast.success("PDF download started.");
    } catch {
      toast.error("Unable to download PDF file.");
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden pb-10">
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute top-44 -right-16 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <FeedbackModal />

      <CGPADisplay semesters={semesters} />
      <main className="relative max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <article className="animate-fade-up rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[0_10px_32px_-24px_hsl(var(--primary))]">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Smart Import
            </p>
            <h3 className="mt-3 text-lg font-semibold">Start from transcript</h3>
            <p className="mt-1 text-sm text-muted-foreground">Upload PDF, ASPX/HTML, or scanned image documents to auto-fill semesters.</p>
            <Button variant="secondary" onClick={openFilePicker} disabled={isImporting} className="mt-4 h-11 w-full rounded-xl">
              <FileUp className="h-4 w-4 mr-2" /> {isImporting ? "Importing..." : "Import Document"}
            </Button>
          </article>

          <article className="animate-fade-up rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[0_10px_32px_-24px_hsl(var(--primary))]" style={{ animationDelay: "80ms" }}>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Rocket className="h-3.5 w-3.5" /> Quick Build
            </p>
            <h3 className="mt-3 text-lg font-semibold">Create semester manually</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add your own semester structure and update credits live.</p>
            <Button variant="outline" onClick={addSemester} className="mt-4 h-11 w-full rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Add Semester
            </Button>
          </article>

          <article className="animate-fade-up rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[0_10px_32px_-24px_hsl(var(--primary))]" style={{ animationDelay: "150ms" }}>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Wand2 className="h-3.5 w-3.5" /> Live Analytics
            </p>
            <h3 className="mt-3 text-lg font-semibold">Track performance instantly</h3>
            <p className="mt-1 text-sm text-muted-foreground">TGPA and CGPA update automatically while you type.</p>
            <div className="mt-4 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
              Tip: keep all grades and credits filled for precise results.
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/75 backdrop-blur p-4 md:p-5">
          <h2 className="text-lg md:text-xl font-semibold tracking-tight">How to use this website</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Log in to your UMS account.</li>
            <li>Select <span className="font-medium text-foreground">Certificate Request</span>.</li>
            <li>Go to <span className="font-medium text-foreground">Download Certificates</span>.</li>
            <li>Download <span className="font-medium text-foreground">Provisional Academic Transcript</span>.</li>
            <li>Upload the downloaded file (PDF, ASPX/HTML, or scanned image) on this website, or manually fill in your semester details.</li>
          </ol>
        </section>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf,.aspx,.html,.htm,image/*,.png,.jpg,.jpeg,.webp"
          multiple
          className="hidden"
          onChange={handlePdfUpload}
        />

        <section className="rounded-2xl border border-border/70 bg-card/75 backdrop-blur p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg md:text-xl font-semibold tracking-tight">Semester Workspace</h2>
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <Input
                placeholder="Student name (optional)"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="h-9 w-full sm:min-w-[18rem] sm:max-w-[36rem]"
                style={{ width: `${Math.min(Math.max(studentName.length + 2, 18), 44)}ch` }}
                maxLength={80}
              />
              <Input
                placeholder="Registration no. (optional)"
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value)}
                className="h-9 w-full sm:w-52"
                maxLength={30}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="default" size="sm" onClick={startForNewStudent} className="rounded-lg">
                <UserPlus className="h-4 w-4 mr-1.5" /> New Student
              </Button>
              <Button variant="outline" size="sm" onClick={saveSnapshot} className="rounded-lg">
                <Save className="h-4 w-4 mr-1.5" /> Save
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadPdf} className="rounded-lg">
                <FileText className="h-4 w-4 mr-1.5" /> PDF
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadExcel} className="rounded-lg">
                <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
              </Button>
              <p className="text-sm text-muted-foreground">Edit, reset, collapse, or remove semesters anytime.</p>
            </div>
          </div>
        </section>

        {semesters.map((sem, i) => (
          <div key={sem.id} className="animate-fade-up" style={{ animationDelay: `${120 + i * 45}ms` }}>
            <SemesterCard
              semester={sem}
              onChange={(updated) => updateSemester(i, updated)}
              onRemove={() => removeSemester(i)}
              canRemove={semesters.length > 1}
            />
          </div>
        ))}

        <footer className="pt-5 pb-2 text-center px-2 md:px-4">
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Created by Vishnu Vardha Reddy Gangireddy • For LPU students only
          </p>
          <p className="mt-2 text-[11px] md:text-xs text-muted-foreground/90 max-w-4xl mx-auto leading-relaxed">
            Disclaimer: This project is an independent unofficial tool and is not affiliated with, endorsed by, or operated by Lovely Professional University (LPU). Please verify all results with official university records.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
