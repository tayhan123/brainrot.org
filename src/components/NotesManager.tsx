import React, { useState, useEffect } from "react";
import { Plus, Trash, Pin, Search, CheckCircle2, RefreshCw, FolderSearch } from "lucide-react";
import { Note } from "../types";

interface NotesManagerProps {
  notes: Note[];
  saveNote: (n: Note) => void;
  deleteNote: (id: string) => void;
  addXp: (amount: number, reason: string) => void;
}

const CATEGORIES = ["General", "Science", "Math", "History", "Languages", "Brainrot Slang"];
// Fun sticky note colors based on index or category
const BILLBOARD_COLORS = [
  "bg-yellow-100 border-yellow-400 text-yellow-950",
  "bg-pink-100 border-pink-400 text-pink-950",
  "bg-cyan-100 border-cyan-400 text-cyan-950",
  "bg-emerald-100 border-emerald-400 text-emerald-950",
  "bg-purple-100 border-purple-400 text-purple-950",
];

export default function NotesManager({ notes, saveNote, deleteNote, addXp }: NotesManagerProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [isPinned, setIsPinned] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterCategory, setActiveFilterCategory] = useState("All");

  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newNote: Note = {
      id: "note-" + Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toLocaleDateString(),
      category,
      isPinned,
    };

    saveNote(newNote);
    addXp(30, `Penned down study note: "${title.trim()}"! 📚🖊️`);
    
    // Clear form inputs
    setTitle("");
    setContent("");
    setCategory("General");
    setIsPinned(false);
    setIsFormOpen(false);
  };

  // Filter notes based on search query and category pill
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeFilterCategory === "All" || n.category === activeFilterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Sort pinned notes to the top
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const getNoteColor = (cat: string) => {
    const idx = CATEGORIES.indexOf(cat);
    if (idx === -1) return BILLBOARD_COLORS[0];
    return BILLBOARD_COLORS[idx % BILLBOARD_COLORS.length];
  };

  return (
    <div className="max-w-4xl mx-auto py-2">
      <div className="cartoon-card p-6 md:p-8 bg-purple-50">
        
        {/* Header toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-3 border-dashed border-indigo-950 pb-6 mb-6">
          <div>
            <h2 className="font-display text-3xl font-black text-indigo-950">Study Sticky Corkboard</h2>
            <p className="text-gray-500 font-sans text-sm mt-0.5">Pen down flashcards, facts, and summary references.</p>
          </div>
          
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="cartoon-btn px-5 py-3 bg-yellow-300 hover:bg-yellow-400 text-indigo-950 font-display font-black flex items-center justify-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-5 h-5 font-bold" />
            {isFormOpen ? "Cancel Note" : "Write Sticky Card"}
          </button>
        </div>

        {/* 1. COLLAPSIBLE NEW NOTE FORM */}
        {isFormOpen && (
          <form onSubmit={handleSubmit} className="cartoon-card p-5 bg-white mb-6 border-indigo-950 shadow-[4px_4px_0px_0px_#1E1B4B] animate-float">
            <h3 className="font-display font-black text-indigo-950 text-lg mb-4">✍️ Draft New Study Memo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-display font-black text-indigo-950 mb-1.5">Sticky Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mitosis Cycle Notes"
                  className="w-full cartoon-input p-3 font-sans text-sm h-11"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-display font-black text-indigo-950 mb-1.5">Category Tag</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full cartoon-input p-3 font-sans text-sm h-11 bg-white cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-display font-black text-indigo-950 mb-1.5">Memo Takeaways</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write down formulas, key insights, dictionary concepts..."
                rows={3}
                className="w-full cartoon-input p-3 font-sans text-sm resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-display text-sm font-bold text-indigo-950 select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-indigo-950 text-purple-600 focus:ring-purple-500"
                />
                <Pin className="w-4 h-4 fill-indigo-950 inline" />
                Pin sticky card to top board
              </label>

              <button
                type="submit"
                className="cartoon-btn px-6 py-2 bg-indigo-950 text-white font-display font-bold cursor-pointer"
              >
                Pin on Board (+30 XP)
              </button>
            </div>
          </form>
        )}

        {/* 2. FILTER & SEARCH RAILS */}
        <div className="flex flex-col md:flex-row gap-3.5 mb-6">
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search written sticky memos..."
              className="w-full cartoon-input pl-10 pr-4 py-2.5 font-sans text-sm"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 max-w-full md:max-w-md">
            {["All", ...CATEGORIES].map((pill) => (
              <button
                key={pill}
                onClick={() => setActiveFilterCategory(pill)}
                className={`font-display text-xs font-bold px-3 py-2 border-2 border-indigo-950 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeFilterCategory === pill
                    ? "bg-indigo-950 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white text-gray-600 hover:text-indigo-950 hover:bg-indigo-50"
                }`}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* 3. NOTES LIST BOARD */}
        {sortedNotes.length === 0 ? (
          <div className="cartoon-card bg-white p-12 text-center border-indigo-950 shadow-[4px_4px_0px_0px_rgba(30,27,75,1)]">
            <div className="text-5xl animate-bounce mb-3">📌</div>
            <h4 className="font-display font-black text-indigo-950 text-lg">No Sticky cards on the board</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Draft your first textbook cheat-card now! Synthesize summaries directly into sticky notes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sortedNotes.map((note) => {
              const noteColorClass = getNoteColor(note.category);
              return (
                <div
                  key={note.id}
                  className={`cartoon-card p-5 border-3 flex flex-col justify-between min-h-[170px] relative ${noteColorClass} shadow-[4px_4px_0px_0px_rgba(30,27,75,1)]`}
                >
                  <div>
                    {/* Note title / Top info bar */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-65 font-sans">
                        📁 {note.category}
                      </span>
                      {note.isPinned && (
                        <span className="p-1.5 bg-rose-200 border-2 border-indigo-950 rounded-lg text-indigo-950 animate-pulse">
                          <Pin className="w-3.5 h-3.5 fill-current" />
                        </span>
                      )}
                    </div>

                    <h4 className="font-display font-black text-lg mb-1 leading-tight">{note.title}</h4>
                    <p className="font-sans text-xs leading-relaxed opacity-90 whitespace-pre-wrap">{note.content}</p>
                  </div>

                  {/* Note Footer */}
                  <div className="flex justify-between items-center.5 mt-4 pt-3 border-t-2 border-indigo-950/20">
                    <span className="text-[10px] font-bold font-mono opacity-50">{note.createdAt}</span>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to discard this sticky card?")) {
                          deleteNote(note.id);
                        }
                      }}
                      title="Delete card"
                      className="p-1 px-2.5 rounded-lg border border-indigo-950 bg-white hover:bg-rose-100 text-indigo-950 shadow-[1px_1px_0px_0px_rgba(30,27,75,1)] hover:text-rose-600 transition-all cursor-pointer"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
