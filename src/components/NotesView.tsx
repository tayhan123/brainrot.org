import React, { useState } from "react";
import { ArrowLeft, Plus, Trash2, Pin, CheckSquare, Download, Search, X } from "lucide-react";
import JSZip from "jszip";
import { Note } from "../types";

interface NotesViewProps {
  notes: Note[];
  addNote: (title: string, content: string, category: string) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  detachDiagram?: (id: string) => void;
  playSound: (type: "bloop" | "success" | "fail" | "pop" | "levelUp") => void;
  onBack: () => void;
}

export default function NotesView({ notes, addNote, deleteNote, togglePin, detachDiagram, playSound, onBack }: NotesViewProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Biology");
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDiagram, setSelectedDiagram] = useState<string | null>(null);

  // AI Notes Generator states
  const [formTab, setFormTab] = useState<"manual" | "ai" | "pdf">("manual");
  const [aiTopic, setAiTopic] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);

  // AI Refiner modal states
  const [activeRefinerNote, setActiveRefinerNote] = useState<Note | null>(null);
  const [refinerAction, setRefinerAction] = useState<"summarize" | "mnemonics" | "simplify" | "quiz">("summarize");
  const [isRefinerLoading, setIsRefinerLoading] = useState(false);
  const [refinerResult, setRefinerResult] = useState("");
  const [copyChecked, setCopyChecked] = useState(false);

  const [categories, setCategories] = useState<string[]>(() => {
    const cached = localStorage.getItem("brainrot_custom_categories");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse custom categories", e);
      }
    }
    return ["Biology 🧬", "History 🏛️", "Physics ⚡", "Language 📝", "General 🎒"];
  });

  const [newCatName, setNewCatName] = useState("");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    
    // Check if it already has an emoji, if not, append standard study/notebook emoji
    let finalCat = trimmed;
    const hasEmoji = /\p{Emoji}/u.test(trimmed);
    if (!hasEmoji) {
      finalCat = `${trimmed} 📚`;
    }

    const rawCat = finalCat.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim();

    if (categories.some(cat => cat.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim().toLowerCase() === rawCat.toLowerCase())) {
      alert("This subject category already exists!");
      return;
    }

    const updated = [...categories, finalCat];
    setCategories(updated);
    localStorage.setItem("brainrot_custom_categories", JSON.stringify(updated));
    setCategory(rawCat);
    setNewCatName("");
    setIsCreatingCat(false);
    playSound("levelUp");
  };

  const handleAiGenerateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim() || isAiLoading) return;

    playSound("pop");
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/generate-notes-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic, category })
      });

      if (!response.ok) throw new Error("Our AI scribes couldn't generate the requested note.");
      const data = await response.json();

      playSound("success");
      addNote(data.title, data.content, category);
      
      // Reset state and close form
      setAiTopic("");
      setFormTab("manual");
      setIsAdding(false);
    } catch (err: any) {
      playSound("fail");
      alert(`⚠️ Note Generator Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDocImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    playSound("pop");
    setIsImportLoading(true);

    const reader = new FileReader();
    
    // For direct JSON parsing
    if (importFile.name.endsWith(".json")) {
      reader.onload = async (evt) => {
        try {
          const text = evt.target?.result as string;
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            parsed.forEach(n => {
              if (n.title && n.content) {
                addNote(n.title, n.content, n.category || category);
              }
            });
            playSound("success");
            alert("🎉 Successfully imported notes list from JSON!");
          } else if (parsed.title && parsed.content) {
            addNote(parsed.title, parsed.content, parsed.category || category);
            playSound("success");
            alert(`🎉 Successfully imported "${parsed.title}"!`);
          } else {
            throw new Error("Invalid json format. Must have title and content.");
          }
          setImportFile(null);
          setFormTab("manual");
          setIsAdding(false);
        } catch (err: any) {
          playSound("fail");
          alert(`⚠️ JSON parse error: ${err.message}`);
        } finally {
          setIsImportLoading(false);
        }
      };
      reader.readAsText(importFile);
      return;
    }

    // For PDF, docx, txt, md files, read as Base64 and run through Gemini!
    reader.onload = async (evt) => {
      try {
        const base64Data = evt.target?.result as string;
        const response = await fetch("/api/import-document-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: importFile.name,
            fileData: base64Data,
            mimeType: importFile.type || "application/pdf"
          })
        });

        if (!response.ok) throw new Error("Gizmo's microchips timed out parsing your PDF document.");
        const data = await response.json();

        playSound("success");
        addNote(data.title, data.content, category);
        
        // Reset state
        setImportFile(null);
        setFormTab("manual");
        setIsAdding(false);
        alert(`🎉 Awesome! Gizmo extracted study sections from "${importFile.name}" successfully!`);
      } catch (err: any) {
        playSound("fail");
        alert(`⚠️ PDF Import Error: ${err.message}`);
      } finally {
        setIsImportLoading(false);
      }
    };
    reader.readAsDataURL(importFile);
  };

  const executeNoteRefiner = async (note: Note, action: "summarize" | "mnemonics" | "simplify" | "quiz") => {
    playSound("pop");
    setIsRefinerLoading(true);
    setRefinerResult("");
    setCopyChecked(false);
    setActiveRefinerNote(note);
    setRefinerAction(action);

    try {
      const resp = await fetch("/api/summarize-note-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteTitle: note.title,
          noteContent: note.content,
          actionType: action
        })
      });

      if (!resp.ok) throw new Error("We couldn't reach Gizmo's logic core.");
      const data = await resp.json();
      setRefinerResult(data.result);
      playSound("success");
    } catch (err: any) {
      playSound("fail");
      setRefinerResult(`⚠️ AI Refiner failed: ${err.message}`);
    } finally {
      setIsRefinerLoading(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    playSound("success");
    addNote(title, content, category);
    setTitle("");
    setContent("");
    setIsAdding(false);
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.content.toLowerCase().includes(search.toLowerCase()) ||
      (note.category || "").toLowerCase().includes(search.toLowerCase())
  );

  // Sorting: Pinned first, then creation time descending
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedNotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedNotes.map(n => n.id)));
    }
  };

  const exportJSON = () => {
    const selectedNotes = notes.filter(n => selectedIds.has(n.id));
    if (selectedNotes.length === 0) return;
    
    const jsonStr = JSON.stringify(selectedNotes, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = `brainrot_notes_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
    playSound("success");
  };

  const exportMarkdown = () => {
    const selectedNotes = notes.filter(n => selectedIds.has(n.id));
    if (selectedNotes.length === 0) return;

    let md = `# Study Notes Export (${new Date().toLocaleDateString()})\n\n`;
    selectedNotes.forEach((n) => {
      md += `## ${n.title}\n`;
      md += `**Category**: ${n.category} | **Created**: ${n.createdAt}\n\n`;
      md += `${n.content}\n\n`;
      md += `--- \n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    downloadAnchor.download = `brainrot_notes_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
    playSound("success");
  };

  const downloadAllNotesAsZip = async () => {
    if (notes.length === 0) return;

    try {
      const zip = new JSZip();
      
      // Track counts for duplicate titles to prevent overwriting files in the same folder
      const filenameCount: { [key: string]: number } = {};

      notes.forEach((note) => {
        const folderName = (note.category || "General").replace(/[^\s\w]/g, "").trim();
        const folder = zip.folder(folderName);
        
        let safeTitle = note.title.trim().replace(/[/\\?%*:|"<>\s]/g, "_");
        if (!safeTitle) {
          safeTitle = `note_${note.id}`;
        }
        
        const pathKey = `${folderName}/${safeTitle}`;
        let finalTitle = safeTitle;
        if (filenameCount[pathKey] !== undefined) {
          filenameCount[pathKey] += 1;
          finalTitle = `${safeTitle}_(${filenameCount[pathKey]})`;
        } else {
          filenameCount[pathKey] = 0;
        }

        const fileContent = `# ${note.title}
**Category**: ${note.category}
**Created At**: ${note.createdAt}
${note.isPinned ? "**Status**: 📌 Pinned" : ""}

---

${note.content}
`;
        folder?.file(`${finalTitle}.md`, fileContent);
      });

      // Include an index.md table of contents file
      let indexContent = `# Brainrot Study Notes Backup\n\nExported on: ${new Date().toLocaleString()}\nTotal notes: ${notes.length}\n\n## Table of Contents\n`;
      notes.forEach((note) => {
        const folderName = (note.category || "General").replace(/[^\s\w]/g, "").trim();
        const safeTitle = note.title.trim().replace(/[/\\?%*:|"<>\s]/g, "_");
        indexContent += `- [${note.title}](${folderName}/${safeTitle}.md) (${note.category})\n`;
      });
      zip.file("index.md", indexContent);

      const contentBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(contentBlob);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = url;
      downloadAnchor.download = `brainrot_all_notes_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
      playSound("success");
    } catch (err) {
      console.error("Failed to generate zip:", err);
      alert("Oops! Gizmo couldn't pack your notes into a ZIP file. Try again!");
      playSound("fail");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9FF] relative rounded-2xl">
      {/* Middle Workspace Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-indigo-950/10 gap-3">
        <div>
          <h2 className="text-3xl font-display font-black text-[#1E1B4B] flex items-center gap-2">
            My Scrawl Notes <span className="animate-wiggle inline-block">📓</span>
          </h2>
          <p className="text-xs font-semibold text-gray-500 uppercase mt-0.5 tracking-wider">
            Organize, pin, and master your study nodes!
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => { playSound("pop"); setIsAdding(!isAdding); }}
            className={`cartoon-btn px-4 py-2 flex items-center gap-2 font-display font-black text-sm cursor-pointer text-indigo-950 ${
              isAdding ? "bg-[#FFADAD] text-indigo-900" : "bg-yellow-300 hover:bg-yellow-400"
            }`}
          >
            <Plus className={`w-4 h-4 transition-transform ${isAdding ? "rotate-45" : ""}`} />
            <span>{isAdding ? "Cancel" : "Add Note"}</span>
          </button>

          <button
            onClick={onBack}
            className="cartoon-btn px-3.5 py-2 bg-white text-indigo-950 font-display font-black text-sm flex items-center gap-1.5 cursor-pointer hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Searching & Export Bar */}
      {!isAdding && notes.length > 0 && (
        <div className="mb-6 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-indigo-950/40 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, topic, or category..."
              className="cartoon-input w-full pl-10 pr-10 py-2.5 text-sm font-bold text-[#1E1B4B] bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7D69EC]/30 transition-all shadow-[2px_2px_0px_0px_#1E1B4B]"
            />
            {search && (
              <button
                type="button"
                onClick={() => { playSound("pop"); setSearch(""); }}
                className="absolute right-3.5 p-1 rounded-full hover:bg-gray-100/90 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { playSound("pop"); toggleSelectAll(); }}
              className="cartoon-btn px-3 py-2 bg-indigo-50 hover:bg-slate-100/90 text-[#1E1B4B] font-display font-black text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-indigo-650" />
              <span>{selectedIds.size === sortedNotes.length && sortedNotes.length > 0 ? "Deselect All" : "Select All"}</span>
            </button>
            
            <button
              onClick={exportJSON}
              disabled={selectedIds.size === 0}
              className={`cartoon-btn px-3 py-2 font-display font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-200 ${
                selectedIds.size > 0 
                  ? "bg-[#C4FAF8] text-teal-950 border-[#1E1B4B]" 
                  : "bg-gray-100 text-gray-400 border-gray-300 opacity-50 cursor-not-allowed shadow-none"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected (JSON) {selectedIds.size > 0 && `(${selectedIds.size})`}</span>
            </button>
            
            <button
              onClick={exportMarkdown}
              disabled={selectedIds.size === 0}
              className={`cartoon-btn px-3 py-2 font-display font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-400 border-[#1E1B4B] ${
                selectedIds.size > 0 
                  ? "bg-[#FFDEB4] text-amber-955 border-[#1E1B4B]" 
                  : "bg-gray-100 text-gray-400 border-gray-300 opacity-50 cursor-not-allowed shadow-none"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected (.MD) {selectedIds.size > 0 && `(${selectedIds.size})`}</span>
            </button>

            <button
              onClick={() => { playSound("pop"); downloadAllNotesAsZip(); }}
              className="cartoon-btn px-3 py-2 bg-[#D6C7FF] text-indigo-950 hover:bg-[#C2AFFA] font-display font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-200 border-[#1E1B4B] shadow-[2px_2px_0px_0px_#1B1E4B]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All Notes (ZIP) 📦</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container Workspace */}
      <div className="flex-1 overflow-y-auto scrollbar pr-1 pb-4 min-h-0">
        {/* Note Creator Form */}
        {isAdding ? (
          <form 
            onSubmit={
              formTab === "manual" 
                ? handleCreate 
                : formTab === "ai" 
                  ? handleAiGenerateNote 
                  : handleDocImport
            } 
            className="space-y-4 my-2 p-5 bg-white border-3 border-indigo-950 rounded-3xl animate-float max-w-xl mx-auto shadow-[4px_4px_0px_0px_rgba(30,27,75,1)]"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b-2 border-dashed border-indigo-950/10 gap-2">
              <h4 className="font-display font-black text-lg text-indigo-955 flex items-center gap-2">
                {formTab === "manual" ? "Create Study Node 📝" : formTab === "ai" ? "AI Note Generator 🪄" : "Import PDF / Files 📄"}
              </h4>
              
              <div className="flex bg-slate-100 p-1 rounded-xl border border-indigo-950/20 select-none">
                <button
                  type="button"
                  onClick={() => { playSound("bloop"); setFormTab("manual"); }}
                  className={`px-2.5 py-1 text-xs font-display font-black rounded-lg transition-all cursor-pointer ${formTab === "manual" ? "bg-white border-2 border-indigo-950 text-indigo-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] scale-[1.02]" : "text-gray-400"}`}
                >
                  Manual ✍️
                </button>
                <button
                  type="button"
                  onClick={() => { playSound("bloop"); setFormTab("ai"); }}
                  className={`px-2.5 py-1 text-xs font-display font-black rounded-lg transition-all cursor-pointer ${formTab === "ai" ? "bg-[#7D69EC] text-white border-2 border-indigo-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] scale-[1.02]" : "text-gray-400"}`}
                >
                  AI Wizard 🪄
                </button>
                <button
                  type="button"
                  onClick={() => { playSound("bloop"); setFormTab("pdf"); }}
                  className={`px-2.5 py-1 text-xs font-display font-black rounded-lg transition-all cursor-pointer ${formTab === "pdf" ? "bg-emerald-500 text-white border-2 border-indigo-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] scale-[1.02]" : "text-gray-400"}`}
                >
                  Import 📄
                </button>
              </div>
            </div>
            
            {formTab === "manual" ? (
              <>
                <div>
                  <label className="text-[10px] font-display font-black text-[#5C509C] uppercase block mb-1.5 tracking-wider">
                    NOTE TITLE:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brain Anatomy, Quadratic Equations"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="cartoon-input w-full px-4 py-2.5 text-sm font-bold text-indigo-950 bg-[#FAF9FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-display font-black text-[#5C509C] uppercase block mb-1.5 tracking-wider">
                    MEMORIZATION CARD CONTENT:
                  </label>
                  <textarea
                    placeholder="Enter facts, equations, simple formulas, or funny slang mnemonics..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    className="cartoon-input w-full h-32 px-4 py-2.5 text-xs font-semibold text-indigo-950 leading-relaxed bg-[#FAF9FF]"
                  />
                </div>
              </>
            ) : formTab === "ai" ? (
              <>
                <div className="p-4 bg-purple-50 rounded-2xl border-2 border-[#7D69EC]/20 text-indigo-955 text-xs font-sans font-semibold leading-relaxed">
                  📢 <strong>Gizmo's Study Core is Powered!</strong> Type any educational research topic or scientific question, and let our Gemini server scrawl detailed takeaway sections, equations, and structures instantly!
                </div>

                <div>
                  <label className="text-[10px] font-display font-black text-[#5C509C] uppercase block mb-1.5 tracking-wider">
                    ENTER KEY STUDY SUBJECT FOR AI NOTES:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cellular Respiration, Roman Republic Crisis, Quantum Spin"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    required
                    disabled={isAiLoading}
                    className="cartoon-input w-full px-4 py-2.5 text-sm font-bold text-[#1E1B4B] bg-[#FAF9FF]"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-purple-50 rounded-2xl border-2 border-[#7D69EC]/20 text-indigo-955 text-xs font-sans font-semibold leading-relaxed">
                  📢 <strong>AI PDF & Document Extractor:</strong> Drag, drop, or select any <strong>PDF, plain text, Markdown (.md), or JSON notes backup</strong> file. Our advanced multimodal Gemini AI reads the contents and transcribes it perfectly!
                </div>

                <div>
                  <label className="text-[10px] font-display font-black text-[#5C509C] uppercase block mb-1.5 tracking-wider">
                    UPLOAD DOCUMENT FILE (PDF, TXT, MD, JSON):
                  </label>
                  <div className="border-3 border-dashed border-[#7D69EC]/40 hover:border-[#7D69EC] rounded-2xl p-6 bg-purple-55/10 hover:bg-purple-55/20 text-center relative transition-all cursor-pointer flex flex-col items-center">
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImportFile(e.target.files[0]);
                          playSound("pop");
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <span className="text-4xl mb-2">📄</span>
                    <p className="text-xs font-display font-black text-indigo-950">
                      {importFile ? `Selected: ${importFile.name}` : "Tap to browse or drop your study file here"}
                    </p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-1">
                      PDF, Plain Text (.txt), Markdown (.md), or Single/Array Notes Backup (.json)
                    </p>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[10px] font-display font-black text-[#5C509C] uppercase block mb-1.5 tracking-wider">
                SUBJECT CATEGORY:
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {categories.map((cat, i) => {
                  const rawCat = cat.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim();
                  const isDefault = ["Biology 🧬", "History 🏛️", "Physics ⚡", "Language 📝", "General 🎒"].includes(cat);
                  return (
                    <div key={i} className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setCategory(rawCat)}
                        className={`cartoon-btn px-3 py-1.5 text-xs font-display font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          category === rawCat
                            ? "bg-[#7D69EC] text-white border-indigo-950 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
                            : "bg-white text-[#5C509C] border-indigo-950 hover:bg-gray-50"
                        }`}
                      >
                        <span>{cat}</span>
                        {!isDefault && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              playSound("fail");
                              const updated = categories.filter((_, idx) => idx !== i);
                              setCategories(updated);
                              localStorage.setItem("brainrot_custom_categories", JSON.stringify(updated));
                              if (category === rawCat) {
                                setCategory("General");
                              }
                            }}
                            className="ml-1 text-[11px] font-black hover:text-red-500 hover:scale-125 transition-transform px-1 cursor-pointer"
                            title="Delete custom subject"
                          >
                            ×
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => { playSound("pop"); setIsCreatingCat(!isCreatingCat); }}
                  className="cartoon-btn px-3 py-1.5 text-xs font-display font-black bg-amber-100 hover:bg-amber-100 text-amber-950 border-indigo-950 cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
                >
                  ➕ Custom Subject
                </button>
              </div>

              {isCreatingCat && (
                <div className="mt-3 p-3 bg-[#FAF2FF] border-2 border-indigo-950 rounded-2xl flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <input
                    type="text"
                    placeholder="e.g. Computer Science, Art 🎨"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="cartoon-input flex-1 px-3 py-1.5 text-xs font-bold bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { playSound("success"); handleAddCategory(); }}
                      className="cartoon-btn px-3 py-1.5 bg-[#7D69EC] text-white font-display font-black text-xs cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { playSound("bloop"); setIsCreatingCat(false); }}
                      className="cartoon-btn px-3 py-1.5 bg-white text-gray-500 border-[#1E1B4B] font-display font-black text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-indigo-950/10">
              {isAiLoading || isImportLoading ? (
                <div className="w-full flex flex-col items-center py-2.5 bg-indigo-50 border-2 border-dashed border-[#7D69EC] rounded-2xl animate-pulse">
                  <div className="flex items-center gap-2 text-[#7D69EC] font-display font-black text-sm uppercase tracking-wider">
                    <span className="animate-spin inline-block">🔮</span>
                    <span>{isAiLoading ? "Gizmo is writing notes for you..." : "Gizmo is extracting terms from file..."}</span>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="submit"
                    className="cartoon-btn flex-1 py-2.5 bg-[#7D69EC] text-white font-display font-black text-sm cursor-pointer hover:bg-[#6853DF]"
                  >
                    {formTab === "manual" ? "Save" : formTab === "ai" ? "🪄 Write Note!" : "⚡ Extract Document!"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportFile(null);
                      setIsAdding(false);
                    }}
                    className="cartoon-btn flex-1 py-2.5 bg-gray-150 text-indigo-955 font-display font-black text-sm cursor-pointer hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        ) : (
          /* Notes Lists Grid */
          <div>
            {search && sortedNotes.length > 0 && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF2FF] border-2 border-[#1E1B4B] rounded-full text-[11px] font-bold text-indigo-950 shadow-[1.5px_1.5px_0px_0px_#1B1E4B]">
                <span className="w-2 h-2 rounded-full bg-[#7D69EC] animate-pulse"></span>
                <span>Found <strong className="font-extrabold">{sortedNotes.length}</strong> matching note{sortedNotes.length !== 1 && "s"} for <strong className="font-extrabold">"{search}"</strong></span>
              </div>
            )}

            {sortedNotes.length === 0 ? (
              search ? (
                <div className="text-center p-12 bg-white border-3 border-dashed border-red-200 rounded-3xl max-w-md mx-auto my-8 animate-float">
                  <span className="text-5xl block mb-3">🔍</span>
                  <p className="text-sm font-display font-black text-rose-900 uppercase">No Search Match Found!</p>
                  <p className="text-xs text-gray-550 font-semibold mt-1.5 leading-relaxed">
                    We couldn't find any note titled, containing, or categorized with <strong className="text-indigo-950 font-black">"{search}"</strong>. Try checking your spelling or adjusting your keywords!
                  </p>
                  <button
                    type="button"
                    onClick={() => { playSound("pop"); setSearch(""); }}
                    className="cartoon-btn mt-4 px-4 py-1.5 bg-[#D6C7FF] hover:bg-[#C2AFFA] text-indigo-950 text-xs font-display font-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Clear Search Query
                  </button>
                </div>
              ) : (
                <div className="text-center p-12 bg-[#FAF9FF] border-3 border-dashed border-gray-200 rounded-3xl max-w-md mx-auto my-12 animate-float">
                  <span className="text-5xl block mb-3 animate-bounce">🎐</span>
                  <p className="text-sm font-display font-black text-indigo-955">No study notes found!</p>
                  <p className="text-xs text-gray-500 font-semibold mt-1">Press the "Add Note" button above to scrawl down key facts.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedNotes.map((note) => {
                  const isSelected = selectedIds.has(note.id);
                  return (
                    <div
                      key={note.id}
                      className={`cartoon-card p-5 relative border-3 flex flex-col justify-between transition-all duration-300 ${
                        isSelected
                          ? "bg-emerald-50/20 border-emerald-500 shadow-[4px_4px_0px_0px_#10B981]"
                          : note.isPinned 
                            ? "bg-amber-55/70 border-[#7D69EC] shadow-[4px_4px_0px_0px_#7D69EC]" 
                            : "bg-white border-indigo-950 shadow-[4px_4px_0px_0px_#1E1B4B]"
                      }`}
                    >
                      <div>
                        {/* Note Header Info */}
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-display font-black bg-[#FAF9FF] text-[#7D69EC] border border-[#7D69EC]/30 px-3 py-1 rounded-full uppercase tracking-wider">
                            {note.category}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            {/* Checkbox selector */}
                            <button
                              type="button"
                              onClick={() => { playSound("pop"); toggleSelect(note.id); }}
                              className={`p-1 rounded-md border transition-all cursor-pointer ${
                                isSelected 
                                  ? "bg-emerald-500 border-emerald-600 text-white scale-110" 
                                  : "bg-white border-indigo-950/20 text-gray-300 hover:text-emerald-500 hover:border-emerald-500/50"
                              }`}
                              title={isSelected ? "Deselect Note" : "Select Note"}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => { playSound("bloop"); togglePin(note.id); }}
                              className={`p-1 rounded-lg hover:bg-gray-50 transition-all cursor-pointer ${
                                note.isPinned ? "text-amber-500 scale-110" : "text-gray-300 hover:text-[#7D69EC]"
                              }`}
                              title="Pin Note"
                            >
                              <Pin className="w-3.5 h-3.5 fill-current" />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => { playSound("fail"); deleteNote(note.id); }}
                              className="p-1 rounded-lg text-gray-300 hover:text-rose-500 transition-colors cursor-pointer hover:bg-gray-105"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h5 className="font-display font-black text-sm text-[#1E1B4B] mb-2 line-clamp-1">
                          {note.title}
                        </h5>
                        
                        <div className="font-sans font-medium text-xs text-gray-650 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto pr-1 scrollbar">
                          {note.content}
                        </div>

                        {/* AI Diagram Attachment Graphic Link */}
                        {note.attachedDiagram && (
                          <div className="mt-3 relative group rounded-xl overflow-hidden border-2 border-indigo-950 bg-white aspect-video flex items-center justify-center cursor-pointer">
                            <img
                              src={note.attachedDiagram}
                              alt="Attached Study Whiteboard"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onClick={() => {
                                playSound("pop");
                                setSelectedDiagram(note.attachedDiagram || null);
                              }}
                              referrerPolicy="no-referrer"
                            />
                            <div
                              onClick={() => {
                                playSound("pop");
                                setSelectedDiagram(note.attachedDiagram || null);
                              }}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 animate-fadeIn"
                            >
                              <span className="text-[9px] font-display font-black text-white uppercase tracking-wider bg-indigo-950 px-2 py-1 rounded border border-indigo-400">
                                🔍 View Whiteboard
                              </span>
                            </div>
                            
                            {/* Detach button */}
                            {detachDiagram && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playSound("fail");
                                  if (confirm("Are you sure you want to detach this AI diagram from the note?")) {
                                    detachDiagram(note.id);
                                  }
                                }}
                                className="absolute top-1.5 right-1.5 p-1 rounded bg-white hover:bg-rose-50 border border-indigo-950 text-indigo-955 hover:text-rose-550/90 transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] z-10"
                                title="Detach Whiteboard Diagram"
                              >
                                <Trash2 className="w-3 h-3 text-rose-500" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* AI Action Quick Links */}
                      <div className="mt-3.5 pt-2 border-t border-dashed border-indigo-950/10 flex flex-wrap gap-1.5 items-center justify-between">
                        <span className="text-[9px] font-display font-black text-[#7D69EC] uppercase tracking-wider">
                          🔬 Gizmo Assist:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => executeNoteRefiner(note, "summarize")}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-950 text-[9px] font-display font-black px-1.5 py-0.5 rounded border border-indigo-950 transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            title="Summarize key takeaways into a neat bullet sheet"
                          >
                            TL;DR 📝
                          </button>
                          <button
                            type="button"
                            onClick={() => executeNoteRefiner(note, "simplify")}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-950 text-[9px] font-display font-black px-1.5 py-0.5 rounded border border-indigo-950 transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            title="Simplify tough concepts into easy analogies"
                          >
                            Analogize 💡
                          </button>
                          <button
                            type="button"
                            onClick={() => executeNoteRefiner(note, "mnemonics")}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[9px] font-display font-black px-1.5 py-0.5 rounded border border-indigo-950 transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            title="Generate catchy mnemonic memory triggers"
                          >
                            Mnemonic 🧪
                          </button>
                          <button
                            type="button"
                            onClick={() => executeNoteRefiner(note, "quiz")}
                            className="bg-cyan-100 hover:bg-cyan-200 text-cyan-950 text-[9px] font-display font-black px-1.5 py-0.5 rounded border border-indigo-950 transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            title="Take a fast 3-question mock review test"
                          >
                            Quiz ⚡
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-indigo-950/5 flex justify-between items-center text-[10px] font-mono font-bold text-gray-400">
                        <span>{note.category === "Biology" ? "🧬 Biology" : note.category === "Physics" ? "⚡ Physics" : note.category === "Mathematics" ? "📐 Math" : "🎒 General"}</span>
                        <span>{note.createdAt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / High-fidelity Whiteboard Diagram Viewer Modal */}
      {selectedDiagram && (
        <div 
          className="fixed inset-0 bg-[#0F0D24]/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDiagram(null)}
        >
          <div 
            className="bg-white border-4 border-indigo-950 rounded-3xl overflow-hidden max-w-2xl w-full p-5 relative shadow-[8px_8px_0px_0px_#1B1E4B] animate-float"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2.5 border-b-2 border-indigo-950/10 mb-4">
              <h4 className="font-display font-black text-indigo-950 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                🎨 GIZMO WHITEBOARD DIAGRAM VIEWER
              </h4>
              <button
                type="button"
                onClick={() => setSelectedDiagram(null)}
                className="cartoon-btn px-2.5 py-1 bg-[#FFAAAA] hover:bg-red-400 text-indigo-950 font-display font-black text-xs cursor-pointer border-indigo-950"
              >
                CLOSE ×
              </button>
            </div>
            
            {/* Modal Diagram Content */}
            <div className="border-3 border-indigo-950 rounded-2xl bg-white overflow-hidden max-h-[60vh] flex items-center justify-center">
              <img
                src={selectedDiagram}
                alt="Whiteboard Diagram Full View"
                className="max-w-full max-h-[50vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Download Export Helper */}
            <div className="mt-4 flex justify-between items-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              <span>Whiteboard diagram attachment</span>
              <a 
                href={selectedDiagram}
                download="gizmo_classroom_study_diagram.png"
                onClick={() => playSound("success")}
                className="cartoon-btn px-4 py-1.5 bg-[#FFF275] hover:bg-[#FFE359] border-2 border-indigo-950 text-indigo-955 text-xs font-display font-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
              >
                Download Export 💾
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Gizmo AI Study Refiner Modal */}
      {activeRefinerNote && (
        <div 
          className="fixed inset-0 bg-[#0F0D24]/80 z-50 flex items-center justify-center p-4"
          onClick={() => setActiveRefinerNote(null)}
        >
          <div 
            className="bg-white border-4 border-indigo-950 rounded-3xl overflow-hidden max-w-xl w-full p-5 relative shadow-[8px_8px_0px_0px_#1B1E4B] animate-float flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b-2 border-indigo-950/10 mb-4 shrink-0 font-sans">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-pulse">⚡</span>
                <div>
                  <h4 className="font-display font-black text-indigo-955 text-xs sm:text-sm uppercase tracking-wider">
                    {refinerAction === "summarize" ? "TL;DR Summary 📝" : refinerAction === "simplify" ? "Concept Analogizer 💡" : refinerAction === "mnemonics" ? "Memory Tricks 🧪" : "Recall Test Quiz ⚡"}
                  </h4>
                  <p className="text-[9px] font-bold text-gray-400 capitalize">
                    Subject: {activeRefinerNote.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRefinerNote(null)}
                className="cartoon-btn px-2.5 py-1 bg-[#FFAAAA] hover:bg-red-400 text-indigo-950 font-display font-black text-xs cursor-pointer border-indigo-950"
              >
                CLOSE ×
              </button>
            </div>

            {/* Modal Loading/Result Content */}
            <div className="flex-1 overflow-y-auto pr-1 scrollbar pb-4">
              {isRefinerLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-4xl animate-spin inline-block mb-3">🔮</span>
                  <p className="font-display font-black text-indigo-955 text-sm uppercase tracking-wide">Gizmo is thinking...</p>
                  <p className="text-xs text-gray-400 font-semibold mt-1">Consulting study core databases</p>
                </div>
              ) : (
                <div className="prose prose-indigo max-w-none text-indigo-955 font-sans text-xs font-semibold leading-relaxed whitespace-pre-wrap bg-[#FAF9FF] border-2 border-indigo-950 p-4 rounded-2xl shadow-[inset_1.5px_1.5px_0px_0px_rgba(30,27,75,0.05)]">
                  {refinerResult}
                </div>
              )}
            </div>

            {/* Actions Bar */}
            {!isRefinerLoading && refinerResult && (
              <div className="mt-4 pt-4 border-t-2 border-indigo-950/10 flex justify-between items-center shrink-0 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    executeNoteRefiner(activeRefinerNote, refinerAction);
                  }}
                  className="cartoon-btn px-4 py-2 bg-indigo-55 hover:bg-indigo-100 text-[#1E1B4B] text-xs font-display font-black cursor-pointer flex items-center gap-1 border-indigo-950"
                >
                  🔄 Retry
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(refinerResult);
                      setCopyChecked(true);
                      playSound("success");
                      setTimeout(() => setCopyChecked(false), 2000);
                    }}
                    className="cartoon-btn px-4 py-2 bg-[#FFF275] hover:bg-[#FFE359] border-2 border-indigo-950 text-indigo-955 text-xs font-display font-black cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(30,27,75,1)]"
                  >
                    {copyChecked ? "Copied! ✅" : "Copy to Clipboard 📋"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
