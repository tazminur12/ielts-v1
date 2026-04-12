"use client";

import { useState } from "react";
import { Search, Speaker, BookOpen, ArrowRight, ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 mt-16 sm:mt-20">
      {/* Professional Hero Section */}
      <div className="bg-white border-b border-slate-200 pt-10 pb-8 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-50 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-50 blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold mb-2 text-xs uppercase tracking-wider">
            <BookOpen size={14} />
            <span>IELTS Vocabulary Builder</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Comprehensive <span className="text-blue-600">Word Definitions</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed mb-6">
            Search for any English word to unlock its definitions, phonetics, examples, and synonyms. Build your vocabulary with authentic examples.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              <input
                type="text"
                placeholder="Search for any English word..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm text-slate-900 placeholder-slate-500"
              />
            </div>
            <button
              onClick={() => handleSearch(searchTerm)}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Search size={16} />
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="text-slate-600 mt-2 text-sm">Fetching word definition...</p>
          </div>
        )}

        {/* Word Definition Card */}
        {wordData && !loading && (
          <div className="space-y-5">
            {/* Word Header */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1">
                    {wordData.word}
                  </h2>
                  {wordData.phonetic && (
                    <p className="text-base text-blue-600 font-medium italic">
                      {wordData.phonetic}
                    </p>
                  )}
                </div>
                {audioUrl && (
                  <button
                    onClick={playAudio}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all text-blue-600 font-semibold text-sm self-start sm:self-auto"
                  >
                    <Speaker size={16} />
                    <span>Listen</span>
                  </button>
                )}
              </div>

              {wordData.origin && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mt-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Origin</p>
                  <p className="text-slate-700 text-sm leading-relaxed">{wordData.origin}</p>
                </div>
              )}
            </div>

            {/* Meanings */}
            {wordData.meanings && wordData.meanings.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                {wordData.meanings.map((meaning, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-3 italic">
                      {meaning.partOfSpeech}
                      <div className="h-px grow bg-slate-200"></div>
                    </h3>

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
                              <span
                                key={synIdx}
                                className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full font-medium text-xs hover:bg-blue-100 transition-all cursor-pointer"
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {meaning.definitions[0]?.antonyms && meaning.definitions[0].antonyms.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Antonyms</h4>
                          <div className="flex flex-wrap gap-1">
                            {meaning.definitions[0].antonyms.map((ant, antIdx) => (
                              <span
                                key={antIdx}
                                className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full font-medium text-xs hover:bg-red-100 transition-all cursor-pointer"
                              >
                                {ant}
                              </span>
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
            <div className="bg-linear-to-r from-blue-50 to-emerald-50 rounded-lg p-5 border border-blue-200">
              <p className="text-slate-700 mb-2 text-sm">Want to continue practicing?</p>
              <Link
                href="/practice"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-all"
              >
                <span>Back to Practice Modules</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!wordData && !loading && !error && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-100">
                <BookOpen size={28} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Start Your Vocabulary Journey</h3>
            <p className="text-slate-600 max-w-md mx-auto leading-relaxed text-sm">
              Search for any English word above to explore its definitions, pronunciation, examples, and synonyms. Perfect for IELTS preparation!
            </p>
          </div>
        )}
      </div>

      {/* Trust & Features Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
          <div className="grid md:grid-cols-3 gap-5 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-2 transition-transform hover:scale-105">
              <div className="flex justify-center mb-2">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-100 shadow-sm">
                  <BookOpen size={20} />
                </div>
              </div>
              <h4 className="text-xl font-extrabold text-slate-900 mb-1">500K+</h4>
              <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Words Available</p>
            </div>
            <div className="p-2 transition-transform hover:scale-105">
              <div className="flex justify-center mb-2">
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg border border-emerald-100 shadow-sm">
                  <Speaker size={20} />
                </div>
              </div>
              <h4 className="text-xl font-extrabold text-slate-900 mb-1">Audio</h4>
              <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Pronunciation Guides</p>
            </div>
            <div className="p-2 transition-transform hover:scale-105">
              <div className="flex justify-center mb-2">
                <div className="bg-purple-50 text-purple-600 p-2 rounded-lg border border-purple-100 shadow-sm">
                  <ShieldCheck size={20} />
                </div>
              </div>
              <h4 className="text-xl font-extrabold text-slate-900 mb-1">100%</h4>
              <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Free Forever</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
