

## TGPA & CGPA Calculator

### Overview
A clean, academic-styled calculator app for computing Term GPA (TGPA) per semester and Cumulative GPA (CGPA) across semesters. Uses the Inter font, indigo/slate color palette, and a centered card layout.

### Pages & Layout
- **Single-page app** with a centered container (max-width ~768px) on a slate-50 background
- **Sticky CGPA banner** at the top showing the cumulative GPA in real-time (emerald accent)
- **Semester cards** stacked vertically, each containing a subject table and semester TGPA

### Components
- **SemesterCard** — collapsible card with semester name, subject table, TGPA display, and "Add Subject" / "Reset Semester" buttons
- **SubjectRow** — table row (desktop) / stacked card (mobile) with Subject Name input, Credits number input, Grade dropdown (O=10, A+=9, A=8, B+=7, B=6, C=5)
- **CGPADisplay** — sticky top bar showing live CGPA and total credits across all semesters
- **GradeSelect** — dropdown component for grade selection

### Features
1. **Real-time TGPA** per semester: `Σ(credits × gradePoints) / Σ(credits)`
2. **Real-time CGPA** across all semesters using the same weighted formula
3. **Add/Remove subjects** per semester with snappy 150ms transitions
4. **Add/Remove semesters** for multi-semester CGPA tracking
5. **Input validation** — require subject name, valid credits (>0), and grade selection before including in calculation; show inline errors
6. **Reset button** per semester to clear all subjects
7. **localStorage persistence** — auto-save all data so it survives page reloads
8. **Responsive design** — table layout on desktop, stacked cards on mobile

### Design Details
- Inter font from Google Fonts
- Cards: white bg, subtle shadow, slate-200 borders
- Primary actions in indigo-600, success/GPA display in emerald-500
- Fast 150-200ms transitions for add/remove animations
- Clean text labels ("Add Subject", "Remove") — no icon-only buttons

