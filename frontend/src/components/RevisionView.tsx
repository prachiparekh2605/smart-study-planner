import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  RotateCw,
  Award,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Flashcard, FlashcardDeck, FormulaSheetData, Subject } from '../types';
import { api } from '../services/api';

interface RevisionViewProps {
  selectedSubject: Subject | null;
  subjects: Subject[];
  onSelectSubject: (sub: Subject) => void;
}

export const RevisionView: React.FC<RevisionViewProps> = ({
  selectedSubject,
  subjects,
  onSelectSubject
}) => {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'formulas'>('flashcards');

  // Flashcards state
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [generatingDeck, setGeneratingDeck] = useState(false);

  // Formula sheet state
  const [formulaSheet, setFormulaSheet] = useState<FormulaSheetData | null>(null);
  const [loadingFormulas, setLoadingFormulas] = useState(false);

  useEffect(() => {
    if (selectedSubject) {
      if (activeTab === 'flashcards') {
        loadDecks(selectedSubject.id);
      } else {
        loadFormulaSheet(selectedSubject.id);
      }
    }
  }, [selectedSubject, activeTab]);

  const loadDecks = async (subId: number) => {
    try {
      const data = await api.getFlashcardDecks(subId);
      setDecks(data);
      if (data.length > 0) {
        loadDeckCards(data[0].id);
        setSelectedDeck(data[0]);
      } else {
        setCards([]);
        setSelectedDeck(null);
      }
    } catch {
      setDecks([]);
    }
  };

  const loadDeckCards = async (deckId: number) => {
    try {
      const data = await api.getDeckCards(deckId);
      setCards(data.cards);
      setCardIndex(0);
      setIsFlipped(false);
    } catch {
      setCards([]);
    }
  };

  const loadFormulaSheet = async (subId: number) => {
    setLoadingFormulas(true);
    try {
      const data = await api.getFormulaSheet(subId);
      setFormulaSheet(data);
    } catch {
      setFormulaSheet(null);
    } finally {
      setLoadingFormulas(false);
    }
  };

  const handleGenerateDeck = async () => {
    if (!selectedSubject) return;
    setGeneratingDeck(true);
    try {
      await api.generateFlashcards(selectedSubject.id, undefined, 8);
      await loadDecks(selectedSubject.id);
    } catch (err: any) {
      alert(err.message || 'Failed to generate flashcard deck.');
    } finally {
      setGeneratingDeck(false);
    }
  };

  const handleRateCard = async (rating: number) => {
    if (cards.length === 0) return;
    const currentCard = cards[cardIndex];

    try {
      await api.reviewFlashcard(currentCard.id, rating);
      setIsFlipped(false);
      // Next card
      if (cardIndex < cards.length - 1) {
        setCardIndex((prev) => prev + 1);
      } else {
        alert('Deck review complete for this session! SuperMemo intervals updated.');
        setCardIndex(0);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update review interval');
    }
  };

  const activeCard: Flashcard | undefined = cards[cardIndex];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Revision Center & Spaced Memory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            SuperMemo SM-2 flashcard intervals and unified exam formula cheat sheets
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'flashcards'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Spaced Flashcards
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'formulas'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Formula Cheat Sheet
          </button>
        </div>
      </div>

      {activeTab === 'flashcards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Decks Sidebar (1 col) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Card Decks</span>
              </h3>

              <button
                onClick={handleGenerateDeck}
                disabled={generatingDeck || !selectedSubject}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{generatingDeck ? 'Building...' : '+ New Deck'}</span>
              </button>
            </div>

            {decks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No decks yet. Click "+ New Deck" to generate flashcards with Agent 7!
              </div>
            ) : (
              <div className="space-y-2">
                {decks.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDeck(d);
                      loadDeckCards(d.id);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                      selectedDeck?.id === d.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 font-semibold text-indigo-950 dark:text-indigo-200'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{d.title}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {d.cards_count} Cards &middot; SM-2 Spaced
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Flashcard Interactive Studio (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {!activeCard ? (
              <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Select or Generate a Flashcard Deck
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Use the left panel to pick a deck or click "+ New Deck" to have AI extract core formulas and concepts into active-recall cards.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-2">
                  <span>
                    Card {cardIndex + 1} of {cards.length}
                  </span>
                  <span>Interval: {activeCard.interval_days} Days</span>
                </div>

                {/* 3D Flip Card Container */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="min-h-[260px] p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between items-center text-center cursor-pointer hover:border-indigo-400/50 transition-all select-none relative group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {isFlipped ? 'Answer & Explanation (Click to flip)' : 'Prompt / Question (Click to flip)'}
                  </span>

                  <div className="my-auto max-w-lg space-y-3">
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                      {isFlipped ? activeCard.back : activeCard.front}
                    </p>

                    {isFlipped && activeCard.formula && (
                      <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 font-mono text-xs text-indigo-700 dark:text-indigo-300">
                        📐 {activeCard.formula}
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Click anywhere on card to flip</span>
                  </span>
                </div>

                {/* SuperMemo SM-2 Rating Buttons */}
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <span className="block text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    How well did you recall this? (SuperMemo SM-2 Algorithm)
                  </span>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleRateCard(1)}
                      className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all text-center"
                    >
                      <div>🔴 Again</div>
                      <div className="text-[10px] font-normal text-rose-500 mt-0.5">1 Day (Reset)</div>
                    </button>

                    <button
                      onClick={() => handleRateCard(2)}
                      className="p-3 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-bold transition-all text-center"
                    >
                      <div>🟠 Hard</div>
                      <div className="text-[10px] font-normal text-orange-500 mt-0.5">Short Interval</div>
                    </button>

                    <button
                      onClick={() => handleRateCard(3)}
                      className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all text-center"
                    >
                      <div>🟢 Good</div>
                      <div className="text-[10px] font-normal text-emerald-500 mt-0.5">Recommended</div>
                    </button>

                    <button
                      onClick={() => handleRateCard(4)}
                      className="p-3 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition-all text-center"
                    >
                      <div>🔵 Easy</div>
                      <div className="text-[10px] font-normal text-blue-500 mt-0.5">Long Interval</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Formula Cheat Sheet Tab */
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                <span>{selectedSubject?.name} &mdash; Official Formula Sheet</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Unified formula compendium with variable definitions and examination tips
              </p>
            </div>
          </div>

          {loadingFormulas ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Compiling formula matrix...
            </div>
          ) : !formulaSheet ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No formulas extracted. Ensure your syllabus and notes contain quantitative equations.
            </div>
          ) : (
            <div className="space-y-6">
              {formulaSheet.categories.map((cat, cIdx) => (
                <div key={cIdx} className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {cat.unit_title}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cat.formulas.map((item, fIdx) => (
                      <div
                        key={fIdx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                          {item.formula}
                        </div>
                        {item.variables && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {item.variables}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {formulaSheet.exam_cheat_sheet_tips?.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>High-Yield Examination Tips:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                    {formulaSheet.exam_cheat_sheet_tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

