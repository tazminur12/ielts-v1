"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import Link from "next/link";

interface Phonetic {
  text?: string;
  audio?: string;
}

interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

interface WordData {
  word: string;
  phonetic?: string;
  phonetics?: Phonetic[];
  origin?: string;
  meanings?: Meaning[];
}

export default function VocabularyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const resolvedPhonetic = useMemo(() => {
    if (!wordData) return "";
    if (wordData.phonetic) return wordData.phonetic;
    const fromPhonetics = wordData.phonetics?.find((p) => p.text)?.text;
    return fromPhonetics || "";
  }, [wordData]);

  const handleSearch = async (word: string) => {
    if (!word.trim()) {
      setError("Please enter a word");
      return;
    }

    setLoading(true);
    setError("");
    setWordData(null);
    setAudioUrl("");

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
      );

      if (!response.ok) {
        throw new Error("Word not found");
      }

      const data = await response.json();
      const firstWord = data[0];
      setWordData(firstWord);

      // Find audio URL
      if (firstWord.phonetics && firstWord.phonetics.length > 0) {
        for (const phonetic of firstWord.phonetics) {
          if (phonetic.audio) {
            setAudioUrl(phonetic.audio);
            break;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch word definition");
      setWordData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(searchTerm);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-blue-200/35 blur-[110px]" />
        <div className="absolute -bottom-36 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-200/30 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.04)_1px,transparent_0)] bg-size-[22px_22px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-28 pb-16 lg:pt-32">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">
              IELTS vocabulary
            </span>
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Definitions that are easy to revise
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium max-w-2xl mx-auto">
            Search any English word to get pronunciation, meanings, examples, and useful synonyms—perfect for IELTS preparation.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-8 bg-white/90 backdrop-blur rounded-4xl border border-slate-200 p-4 sm:p-5 shadow-[0_24px_64px_-20px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              <input
                type="text"
                placeholder="Type a word (e.g. “resilient”)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyPress}
                autoComplete="off"
                spellCheck={false}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-semibold text-slate-900 placeholder-slate-400 bg-white"
              />
            </div>
            <button
              onClick={() => handleSearch(searchTerm)}
              disabled={loading}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-extrabold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-slate-900/10"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search size={16} />}
              <span>{loading ? "Searching…" : "Search"}</span>
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500 font-medium">
            Tip: Press <span className="font-extrabold text-slate-700">Enter</span> to search quickly.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-rose-50 border border-rose-200 rounded-4xl p-5">
            <p className="text-rose-800 font-extrabold text-sm">Couldn&apos;t fetch that word.</p>
            <p className="text-rose-700 font-medium text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-6 bg-white/90 backdrop-blur rounded-4xl border border-slate-200 p-7 text-center shadow-sm">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-3xl bg-slate-900/5 border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
            </div>
            <p className="text-slate-600 mt-3 text-sm font-medium">Fetching definition…</p>
          </div>
        )}

        {/* Word Definition Card */}
        {wordData && !loading && (
          <div className="mt-6 space-y-5">
            {/* Word Header */}
            <div className="bg-white/90 backdrop-blur rounded-4xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1 tracking-tight">
                    {wordData.word}
                  </h2>
                  {resolvedPhonetic ? (
                    <p className="text-base text-blue-700 font-semibold italic">{resolvedPhonetic}</p>
                  ) : null}
                </div>
                {audioUrl && (
                  <button
                    onClick={playAudio}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all text-slate-900 font-extrabold text-sm self-start sm:self-auto"
                    aria-label="Play pronunciation audio"
                    title="Play pronunciation audio"
                  >
                    <Volume2 size={16} className="text-blue-700" />
                    <span>Listen</span>
                  </button>
                )}
              </div>

              {wordData.origin && (
                <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 mt-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Origin</p>
                  <p className="text-slate-700 text-sm leading-relaxed">{wordData.origin}</p>
                </div>
              )}
            </div>

            {/* Meanings */}
            {wordData.meanings && wordData.meanings.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                {wordData.meanings.map((meaning, idx) => (
                  <div key={idx} className="bg-white/90 backdrop-blur rounded-4xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-extrabold capitalize">
                        {meaning.partOfSpeech}
                      </span>
                      <div className="h-px grow bg-slate-200" />
                    </div>

                    <div className="mt-3 space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Definitions</h4>
                        <ul className="space-y-2">
                          {meaning.definitions.map((def, defIdx) => (
                            <li key={defIdx} className="flex gap-2">
                              <span className="text-blue-600 font-bold text-base mt-0 shrink-0">•</span>
                              <div className="flex-1">
                                <p className="text-slate-700 font-medium text-sm mb-1">{def.definition}</p>
                                {def.example && (
                                  <p className="text-slate-500 italic text-xs pl-2 border-l-2 border-blue-300">
                                    &quot;{def.example}&quot;
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {meaning.definitions[0]?.synonyms && meaning.definitions[0].synonyms.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Synonyms</h4>
                          <div className="flex flex-wrap gap-1">
                            {meaning.definitions[0].synonyms.map((syn, synIdx) => (
                              <button
                                type="button"
                                key={synIdx}
                                onClick={() => {
                                  setSearchTerm(syn);
                                  handleSearch(syn);
                                }}
                                className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-extrabold text-xs hover:bg-blue-100 transition-all"
                              >
                                {syn}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {meaning.definitions[0]?.antonyms && meaning.definitions[0].antonyms.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Antonyms</h4>
                          <div className="flex flex-wrap gap-1">
                            {meaning.definitions[0].antonyms.map((ant, antIdx) => (
                              <button
                                type="button"
                                key={antIdx}
                                onClick={() => {
                                  setSearchTerm(ant);
                                  handleSearch(ant);
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-extrabold text-xs hover:bg-rose-100 transition-all"
                              >
                                {ant}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Related Links */}
            <div className="bg-linear-to-r from-blue-50 to-emerald-50 rounded-4xl p-6 border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-slate-900 font-extrabold text-sm">Keep the momentum.</p>
                  <p className="text-slate-700/80 text-sm mt-1">
                    Jump back to practice modules and apply today&apos;s new words.
                  </p>
                </div>
                <Link
                  href="/practice"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl transition-all w-full sm:w-auto"
                >
                  <span>Go to practice</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!wordData && !loading && !error && (
          <div className="mt-6 bg-white/90 backdrop-blur rounded-4xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="bg-linear-to-br from-blue-50 to-indigo-50 text-blue-700 p-3 rounded-3xl border border-blue-100">
                <BookOpen size={26} />
              </div>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">Search your first word</h3>
            <p className="text-slate-600 max-w-md mx-auto leading-relaxed text-sm font-medium">
              Try words like <span className="font-extrabold text-slate-800">analyze</span>,{" "}
              <span className="font-extrabold text-slate-800">efficient</span>, or{" "}
              <span className="font-extrabold text-slate-800">consequence</span>.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["resilient", "coherent", "significant", "mitigate"].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setSearchTerm(w);
                    handleSearch(w);
                  }}
                  className="px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trust strip */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-blue-700" />}
            title="500K+ words"
            subtitle="Broad dictionary coverage"
          />
          <StatCard
            icon={<Volume2 className="w-5 h-5 text-emerald-700" />}
            title="Audio pronunciation"
            subtitle="When available for the word"
          />
          <StatCard
            icon={<ShieldCheck className="w-5 h-5 text-indigo-700" />}
            title="Free to use"
            subtitle="Fast lookups anytime"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-4xl border border-slate-200 bg-white/80 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-900 truncate">{title}</p>
          <p className="text-xs font-medium text-slate-600 mt-0.5 truncate">{subtitle}</p>
        </div>
        <BadgeCheck className="w-5 h-5 text-slate-300 ml-auto shrink-0" />
      </div>
    </div>
  );
}
