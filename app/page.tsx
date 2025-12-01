"use client";

import { useState, useEffect, useRef } from "react";
import { IconSend, IconWriting, IconLoader2, IconBulb, IconCheck, IconArrowRight, IconListNumbers, IconBook2, IconRotateClockwise, IconReplace } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { motion, AnimatePresence } from "framer-motion";

interface Correction {
  original: string;
  replacement: string;
  type: string;
  explanation: string;
}

interface PrioritizedSuggestion {
  priority: "high" | "medium" | "low";
  issue: string;
  suggestion: string;
  example_fix?: string;
  apply_to_text?: string | null;
  replacement_text?: string | null;
  category: string;
}

interface VocabularyEnrichment {
  word: string;
  phonetic: string;
  type: string;
  definition: string;
  example_sentence: string;
  context_in_essay: string;
  target_text?: string | null;
  replacement_text?: string | null;
}

interface Tip {
  tip: string;
  example_implementation?: string;
  apply_to_text?: string | null;
  replacement_text?: string | null;
}

interface FeedbackDetail {
  summary: string;
  tips: Tip[];
}

interface FeedbackData {
  band_score: number;
  prioritized_suggestions: PrioritizedSuggestion[];
  enrichment?: VocabularyEnrichment[];
  feedback: {
    task_achievement: FeedbackDetail;
    coherence_cohesion: FeedbackDetail;
    lexical_resource: FeedbackDetail;
    grammatical_range_accuracy: FeedbackDetail;
  };
  corrections: Correction[];
  general_comment: string;
}

export default function Home() {
  const [essay, setEssay] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [taskType, setTaskType] = useState<"Task 1" | "Task 2">("Task 2");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeedbackData | null>(null);
  const [error, setError] = useState("");
  const [selectedCriterion, setSelectedCriterion] = useState<keyof FeedbackData['feedback'] | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "review">("edit");

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: Correction | null }>({ x: 0, y: 0, content: null });

  // Highlight logic
  const [lastModifiedText, setLastModifiedText] = useState<string | null>(null);
  const reviewContainerRef = useRef<HTMLDivElement>(null);

  // Initialize history
  useEffect(() => {
    if (history.length === 0 && essay) {
       setHistory([essay]);
       setHistoryIndex(0);
    }
  }, []);

  // Effect to scroll to changes
  useEffect(() => {
    if (viewMode === "review" && lastModifiedText && reviewContainerRef.current) {
      // Small timeout to allow render
      setTimeout(() => {
        const highlightedElement = reviewContainerRef.current?.querySelector(`[data-highlight="${lastModifiedText}"]`);
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Optional: Add a temporary flash class here if desired
        }
      }, 100);
    }
  }, [essay, viewMode, lastModifiedText]);

  // Update essay wrapper to handle history
  const updateEssay = (newEssay: string, sourceReplacement?: string) => {
    setEssay(newEssay);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEssay);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    if (sourceReplacement) {
       setLastModifiedText(sourceReplacement);
    }
  };

  const applyFix = (original: string, replacement: string, event?: React.MouseEvent) => {
    const newEssay = essay.replace(original, replacement);
    if (event?.shiftKey) {
        // Skip scrolling logic if Shift is held
        updateEssay(newEssay, undefined); // Pass undefined to prevent triggering scroll/highlight
    } else {
        updateEssay(newEssay, replacement);
    }
    setViewMode("review");
    if (selectedCriterion) setSelectedCriterion(null);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setEssay(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setEssay(history[historyIndex + 1]);
    }
  };

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);

  const handleAnalyze = async () => {
    if (!essay.trim()) {
      setError("Please enter your essay.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, taskType }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze essay");
      }

      const data = await response.json();
      setResult(data);
      setViewMode("review"); // Switch to review mode automatically
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCriterionName = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ');
  };

  // Function to render essay with clickable highlights
  const renderAnnotatedEssay = () => {
    // This function splits text based on known corrections.
    // It also needs to find the "lastModifiedText" if present and wrap it for scrolling.
    if (!result) return essay;
    
    let annotatedText: (string | React.ReactNode)[] = [essay];

    // First, apply correction highlights
    result.corrections.forEach((correction, index) => {
      const newAnnotatedText: (string | React.ReactNode)[] = [];
      annotatedText.forEach((segment) => {
        if (typeof segment === "string") {
          // Only split if the correction text still exists in the essay
          const parts = segment.split(correction.original);
          if (parts.length > 1) {
            parts.forEach((part, i) => {
              newAnnotatedText.push(part);
              if (i < parts.length - 1) {
                newAnnotatedText.push(
                  <span
                    key={`corr-${index}-${i}`}
                    className="bg-red-500/20 border-b-2 border-red-500 cursor-pointer hover:bg-red-500/30 transition-colors px-1"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        content: correction
                      });
                    }}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, content: null }))}
                    onClick={(e) => applyFix(correction.original, correction.replacement, e)}
                  >
                    {correction.original}
                  </span>
                );
              }
            });
          } else {
            newAnnotatedText.push(segment);
          }
        } else {
          newAnnotatedText.push(segment);
        }
      });
      annotatedText = newAnnotatedText;
    });

    // Second pass: If there's a lastModifiedText (that wasn't a correction, e.g. vocabulary swap), find and highlight it.
    // Note: If the lastModifiedText IS a correction replacement, the previous loop wouldn't have found it (because it looked for original).
    // So we search the string segments for lastModifiedText.
    if (lastModifiedText) {
      const finalAnnotatedText: (string | React.ReactNode)[] = [];
      annotatedText.forEach(segment => {
        if (typeof segment === "string" && segment.includes(lastModifiedText)) {
           const parts = segment.split(lastModifiedText);
           parts.forEach((part, i) => {
             finalAnnotatedText.push(part);
             if (i < parts.length - 1) {
               finalAnnotatedText.push(
                 <span 
                   key={`mod-${i}`} 
                   data-highlight={lastModifiedText}
                   className="bg-green-500/30 transition-colors duration-1000 ease-out animate-pulse" 
                 >
                   {lastModifiedText}
                 </span>
               );
             }
           });
        } else {
          finalAnnotatedText.push(segment);
        }
      });
      annotatedText = finalAnnotatedText;
    }

    return <div className="whitespace-pre-wrap leading-relaxed pb-32">{annotatedText}</div>;
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-400 border-red-900/30 bg-red-950/20';
      case 'medium': return 'text-yellow-400 border-yellow-900/30 bg-yellow-950/20';
      case 'low': return 'text-blue-400 border-blue-900/30 bg-blue-950/20';
      default: return 'text-neutral-400 border-neutral-800 bg-neutral-900/50';
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans selection:bg-purple-500/30">
      {/* Fixed Tooltip */}
      <AnimatePresence>
        {tooltip.content && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{ 
              position: 'fixed', 
              left: tooltip.x, 
              top: tooltip.y - 10, 
              transform: 'translate(-50%, -100%)' 
            }}
            className="w-80 bg-neutral-900 border border-neutral-700 p-4 rounded-xl shadow-2xl text-xs z-[100] pointer-events-none"
          >
            <span className="block font-bold text-green-400 mb-1 text-base">
              Click to change to: &quot;{tooltip.content.replacement}&quot;
            </span>
            <span className="block text-neutral-300 mb-2">
              {tooltip.content.explanation}
            </span>
            <span className="block text-neutral-500 text-[10px] uppercase tracking-wider">
              {tooltip.content.type}
            </span>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-neutral-900 border-r border-b border-neutral-700 rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            IELTS Writing Helper
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            AI-powered feedback, scoring, and interactive corrections.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Input / Essay Section */}
          <div className="space-y-6 lg:sticky lg:top-8">
             <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <button
                    onClick={() => setTaskType("Task 1")}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      taskType === "Task 1"
                        ? "bg-purple-600 text-white"
                        : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                    )}
                  >
                    Task 1
                  </button>
                  <button
                    onClick={() => setTaskType("Task 2")}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      taskType === "Task 2"
                        ? "bg-purple-600 text-white"
                        : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                    )}
                  >
                    Task 2
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Undo/Redo Controls */}
                  <div className="flex gap-1">
                     <button 
                        onClick={handleUndo} 
                        disabled={historyIndex <= 0}
                        className="p-2 rounded-full hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                        title="Undo (Ctrl+Z)"
                      >
                        <IconRotateClockwise className="scale-x-[-1]" size={16} />
                     </button>
                     <button 
                        onClick={handleRedo} 
                        disabled={historyIndex >= history.length - 1}
                        className="p-2 rounded-full hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                        title="Redo (Ctrl+Y)"
                      >
                        <IconRotateClockwise size={16} />
                     </button>
                  </div>

                  {result && (
                    <div className="flex gap-2 bg-neutral-900 p-1 rounded-full border border-neutral-800">
                      <button
                        onClick={() => setViewMode("edit")}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                          viewMode === "edit" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        )}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setViewMode("review")}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                          viewMode === "review" ? "bg-purple-600 text-white" : "text-neutral-500 hover:text-neutral-300"
                        )}
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
             </div>

            <div className="relative">
              {viewMode === "edit" ? (
                <textarea
                  value={essay}
                  onChange={(e) => updateEssay(e.target.value)}
                  placeholder={`Paste your ${taskType} essay here...`}
                  className="w-full h-[600px] bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-neutral-200 placeholder:text-neutral-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all shadow-lg font-mono text-sm leading-relaxed"
                />
              ) : (
                <div 
                  ref={reviewContainerRef}
                  onScroll={() => setTooltip({ x: 0, y: 0, content: null })}
                  className="w-full h-[600px] bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-neutral-200 overflow-y-auto font-mono text-sm leading-relaxed scroll-smooth"
                >
                   {renderAnnotatedEssay()}
                </div>
              )}
              
              <div className="absolute bottom-4 right-4 text-xs text-neutral-500 bg-neutral-900/80 px-2 py-1 rounded-md">
                {essay.split(/\s+/).filter(w => w.length > 0).length} words
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <>
                  <IconSend size={20} /> {result ? "Re-Analyze Essay" : "Analyze Essay"}
                </>
              )}
            </button>
          </div>

          {/* Results Section */}
          <div className="space-y-8">
            {result ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Score Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 group-hover:opacity-75 transition-opacity duration-500" />
                  <h2 className="text-6xl font-bold text-white mb-2 relative z-10">
                    {result.band_score}
                  </h2>
                  <p className="text-neutral-400 uppercase tracking-widest text-sm relative z-10 font-medium">
                    Band Score
                  </p>
                </div>

                {/* Priorities Section */}
                {result.prioritized_suggestions && result.prioritized_suggestions.length > 0 && (
                   <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <IconListNumbers size={20} className="text-blue-500" />
                        Action Plan (Prioritized)
                      </h3>
                      <div className="space-y-3">
                        {result.prioritized_suggestions.map((item, idx) => {
                          const isApplied = item.apply_to_text && !essay.includes(item.apply_to_text);
                          
                          return (
                            <div key={idx} className={cn("p-4 rounded-xl border flex gap-4 transition-all", 
                              isApplied ? "opacity-50 bg-neutral-900 border-neutral-800" : getPriorityColor(item.priority)
                            )}>
                              <div className="font-bold text-xs uppercase tracking-wider opacity-70 pt-1 w-16 shrink-0">
                                {item.priority}
                              </div>
                              <div className="space-y-2 w-full">
                                <div>
                                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                                    {item.issue}
                                    {isApplied && <IconCheck size={14} className="text-green-500" />}
                                  </h4>
                                  <p className="text-sm opacity-90">{item.suggestion}</p>
                                </div>
                                
                                {item.example_fix && (
                                  <div className="bg-black/20 p-3 rounded-lg text-xs space-y-1 border border-white/5">
                                     <div className="uppercase tracking-wider opacity-50 font-bold text-[10px]">Example Fix:</div>
                                     <div className="italic opacity-90">&quot;{item.example_fix}&quot;</div>
                                  </div>
                                )}

                                {item.apply_to_text && item.replacement_text && (
                                   <button 
                                      onClick={(e) => applyFix(item.apply_to_text!, item.replacement_text!, e)}
                                      disabled={!!isApplied}
                                      className={cn(
                                        "flex items-center gap-2 text-[10px] px-2 py-1 rounded transition-colors mt-2 w-fit",
                                        isApplied 
                                          ? "bg-green-500/10 text-green-500 cursor-default" 
                                          : "bg-white/10 hover:bg-white/20 text-white"
                                      )}
                                   >
                                      {isApplied ? (
                                        <>
                                          <IconCheck size={12} /> Applied
                                        </>
                                      ) : (
                                        <>
                                          <IconReplace size={12} /> Apply this fix
                                        </>
                                      )}
                                   </button>
                                )}

                                <div className="mt-2 text-[10px] uppercase tracking-widest opacity-60 bg-black/20 inline-block px-2 py-0.5 rounded">
                                  {item.category}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                   </div>
                )}

                {/* Vocabulary Enrichment Section */}
                {result.enrichment && result.enrichment.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <IconBook2 size={20} className="text-amber-500" />
                      Vocabulary Enrichment
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {result.enrichment.map((item, idx) => {
                        const isApplied = item.target_text && !essay.includes(item.target_text);
                        const canApply = !!(item.target_text && item.replacement_text);

                        return (
                          <button 
                            key={idx} 
                            onClick={(e) => {
                               if (canApply && !isApplied) {
                                  // Prevent default button behavior which might cause scrolling
                                  e.preventDefault();
                                  applyFix(item.target_text!, item.replacement_text!, e);
                               }
                            }}
                            disabled={!canApply || !!isApplied}
                            className={cn(
                              "border rounded-xl p-4 transition-all text-left group relative",
                              isApplied 
                                ? "bg-neutral-900/50 border-neutral-800 opacity-60 cursor-default"
                                : canApply
                                  ? "bg-neutral-900 border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-900/80 cursor-pointer" 
                                  : "bg-neutral-900 border-neutral-800 cursor-default"
                            )}
                          >
                             <div className="flex justify-between items-start mb-2">
                               <div>
                                 <div className="font-bold text-amber-400 text-lg">{item.word}</div>
                                 <div className="text-xs text-neutral-500 font-mono">{item.phonetic} • {item.type}</div>
                               </div>
                               {canApply && (
                                 <div 
                                   onClick={(e) => {
                                      // Stop propagation to avoid triggering the parent button's click again
                                      e.stopPropagation();
                                      if (!isApplied) applyFix(item.target_text!, item.replacement_text!, e);
                                   }}
                                   className={cn(
                                   "text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-opacity z-10",
                                   isApplied 
                                     ? "text-green-500 bg-green-500/10 opacity-100" 
                                     : "text-amber-500 bg-amber-500/10 opacity-0 group-hover:opacity-100 cursor-pointer hover:bg-amber-500/20"
                                 )}>
                                   {isApplied ? (
                                     <><IconCheck size={12} /> Applied</>
                                   ) : (
                                     <><IconReplace size={12} /> Apply</>
                                   )}
                                 </div>
                               )}
                             </div>
                             <div className="space-y-2 text-sm">
                               <p className="text-neutral-300">{item.definition}</p>
                               <div className="pl-2 border-l-2 border-neutral-700 italic text-neutral-400">
                                 &quot;{item.example_sentence}&quot;
                               </div>
                               <div className="bg-neutral-800/50 p-2 rounded text-xs text-neutral-400 mt-2">
                                 <span className="text-amber-500/80 font-bold">Use instead of:</span> {item.context_in_essay}
                               </div>
                             </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Detailed Breakdown Grid */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Detailed Evaluation</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(Object.keys(result.feedback) as Array<keyof FeedbackData['feedback']>).map((key) => (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={key}
                        onClick={() => setSelectedCriterion(key)}
                        className="bg-neutral-900/50 hover:bg-neutral-800 p-5 rounded-xl border border-neutral-800 text-left transition-colors h-full flex flex-col"
                      >
                        <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">
                          {formatCriterionName(key)}
                        </h4>
                        <p className="text-sm text-neutral-300 line-clamp-3 flex-grow">
                          {result.feedback[key].summary}
                        </p>
                        <div className="mt-3 text-xs text-neutral-500 flex items-center gap-1">
                           View details <IconArrowRight size={12} />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4 border-2 border-dashed border-neutral-800 rounded-3xl p-12 min-h-[400px]">
                <IconWriting size={48} stroke={1} />
                <p>Your analysis results will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Feedback Modal */}
        <Modal
          isOpen={!!selectedCriterion}
          onClose={() => setSelectedCriterion(null)}
          title={selectedCriterion ? formatCriterionName(selectedCriterion) : ""}
        >
          {selectedCriterion && result && (
            <div className="space-y-6">
              <p className="text-neutral-300 leading-relaxed">
                {result.feedback[selectedCriterion].summary}
              </p>
              
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-blue-400 uppercase flex items-center gap-2">
                  <IconBulb size={16} />
                  Tips for Improvement
                </h4>
                {result.feedback[selectedCriterion].tips.length > 0 ? (
                  <ul className="space-y-3">
                    {result.feedback[selectedCriterion].tips.map((tip, idx) => {
                      const isApplied = tip.apply_to_text && !essay.includes(tip.apply_to_text);

                      return (
                        <li key={idx} className={cn("bg-blue-950/20 border border-blue-900/30 rounded-lg p-4 space-y-3 transition-opacity", isApplied && "opacity-60")}>
                          <div className="text-blue-200/90 font-medium text-sm">
                            {tip.tip}
                          </div>
                          
                          {tip.example_implementation && (
                            <div className="bg-black/30 rounded p-3 text-xs space-y-1 border border-white/5">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400/70">Example:</span>
                              <div className="text-neutral-300 italic">&quot;{tip.example_implementation}&quot;</div>
                            </div>
                          )}

                          {tip.apply_to_text && tip.replacement_text && (
                             <button 
                                onClick={(e) => applyFix(tip.apply_to_text!, tip.replacement_text!, e)}
                                disabled={!!isApplied}
                                className={cn(
                                  "flex items-center gap-2 text-xs px-3 py-1.5 rounded-md transition-colors",
                                  isApplied
                                    ? "bg-green-500/10 text-green-500 cursor-default"
                                    : "bg-blue-600 hover:bg-blue-500 text-white"
                                )}
                             >
                                {Boolean(isApplied) ? (
                                  <><IconCheck size={14} /> Applied</>
                                ) : (
                                  <><IconReplace size={14} /> Apply this fix to essay</>
                                )}
                             </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-neutral-500 italic">Keep up the good work!</p>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </main>
  );
}
