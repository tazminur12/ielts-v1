"use client";

import { useEffect, useRef } from "react";
import { useExam } from "@/components/exam/ExamContext";

export default function ReadingPage() {
  const { startExam, currentQuestion, setCurrentQuestion } = useExam();
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure we are in reading mode if accessed directly
    startExam("reading", 60 * 60, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = document.getElementById(`question-${currentQuestion}`);
    if (el && rightPanelRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentQuestion]);

  return (
    <div className="flex h-full">
      {/* Left Panel: Reading Text */}
      <div className="w-1/2 h-full overflow-y-auto p-8 border-r border-slate-300 bg-white">
        <h2 className="text-2xl font-bold mb-4">The History of Tea</h2>
        <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed">
          <p className="mb-4">
            The story of tea begins in China. According to legend, in 2737 BC, the Chinese emperor Shen Nung was sitting beneath a tree while his servant boiled drinking water, when some leaves from the tree blew into the water. Shen Nung, a renowned herbalist, decided to try the infusion that his servant had accidentally created. The tree was a Camellia sinensis, and the resulting drink was what we now call tea.
          </p>
          <p className="mb-4">
            Tea containers have been found in tombs dating from the Han dynasty (206 BC – 220 AD) but it was under the Tang dynasty (618–906 AD), that tea became firmly established as the national drink of China. It became such a favourite that during the late eighth century a writer called Lu Yu wrote the first book entirely about tea, the Ch’a Ching, or Tea Classic. It was shortly after this that tea was first introduced to Japan, by Japanese Buddhist monks who had travelled to China to study.
          </p>
          <p className="mb-4">
             Tea drinking is a vital part of Japanese culture, as seen in the development of the Tea Ceremony, which may be rooted in the rituals of Zen Buddhism. Tea was also important in the establishment of the British Empire.
          </p>
           <p className="mb-4">
            The story of tea begins in China. According to legend, in 2737 BC, the Chinese emperor Shen Nung was sitting beneath a tree while his servant boiled drinking water, when some leaves from the tree blew into the water. Shen Nung, a renowned herbalist, decided to try the infusion that his servant had accidentally created. The tree was a Camellia sinensis, and the resulting drink was what we now call tea.
          </p>
          <p className="mb-4">
            Tea containers have been found in tombs dating from the Han dynasty (206 BC – 220 AD) but it was under the Tang dynasty (618–906 AD), that tea became firmly established as the national drink of China. It became such a favourite that during the late eighth century a writer called Lu Yu wrote the first book entirely about tea, the Ch’a Ching, or Tea Classic. It was shortly after this that tea was first introduced to Japan, by Japanese Buddhist monks who had travelled to China to study.
          </p>
          <p className="mb-4">
             Tea drinking is a vital part of Japanese culture, as seen in the development of the Tea Ceremony, which may be rooted in the rituals of Zen Buddhism. Tea was also important in the establishment of the British Empire.
          </p>
        </div>
      </div>

      {/* Right Panel: Questions */}
      <div className="w-1/2 h-full overflow-y-auto p-8 bg-slate-50">
        <h3 className="text-xl font-bold mb-6 text-slate-800">Questions 1-5</h3>
        <p className="mb-4 text-sm text-slate-600 font-medium uppercase tracking-wide">
          Do the following statements agree with the information given in the Reading Passage?
        </p>
        <div className="bg-white p-4 border border-slate-200 rounded mb-6 text-sm">
           <p><span className="font-bold">TRUE</span> if the statement agrees with the information</p>
           <p><span className="font-bold">FALSE</span> if the statement contradicts the information</p>
           <p><span className="font-bold">NOT GIVEN</span> if there is no information on this</p>
        </div>

        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((q) => (
            <div key={q} className="flex flex-col space-y-2">
              <div className="flex items-start">
                 <span className="font-bold mr-3 min-w-[20px]">{q}.</span>
                 <p className="text-slate-800">The tea plant was discovered by accident.</p>
              </div>
              <div className="ml-8">
                 <select aria-label={`Answer for question ${q}`} className="border border-slate-300 rounded px-3 py-2 w-40 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select answer</option>
                    <option value="TRUE">TRUE</option>
                    <option value="FALSE">FALSE</option>
                    <option value="NOT GIVEN">NOT GIVEN</option>
                 </select>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-bold mt-10 mb-6 text-slate-800">Questions 6-10</h3>
        <p className="mb-4 text-sm text-slate-600 font-medium uppercase tracking-wide">
            Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
        </p>
        
        <div className="space-y-6">
           {[6, 7, 8, 9, 10].map((q) => (
             <div key={q} className="flex items-baseline flex-wrap gap-2">
                <span className="font-bold mr-1 min-w-[20px]">{q}.</span>
                <span className="text-slate-800">Tea became the national drink of China during the</span>
                <input type="text" aria-label={`Answer for question ${q}`} className="border-b-2 border-slate-300 bg-transparent px-2 py-0.5 w-40 focus:border-blue-500 outline-none text-center font-handwriting" />
                <span className="text-slate-800">dynasty.</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
