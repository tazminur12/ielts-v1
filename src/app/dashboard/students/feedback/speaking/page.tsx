'use client';
import { Mic, Play, Calendar, Star } from 'lucide-react';

export default function SpeakingFeedbackPage() {
  const speakingHistory = [
    {
      id: '1',
      topic: 'Describe a memorable journey',
      date: 'Jan 12, 2026',
      score: 7.0,
      fluency: 7.5,
      vocab: 6.5,
      duration: '3:45',
    },
    {
      id: '2',
      topic: 'Talking about your hometown',
      date: 'Jan 08, 2026',
      score: 6.5,
      fluency: 6.0,
      vocab: 7.0,
      duration: '2:20',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Speaking Evaluation
          </h1>
          <p className="text-gray-500 text-sm">
            Review your speech recordings and band descriptors.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
          <Mic size={18} /> New Recording
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {speakingHistory.map(item => (
          <div
            key={item.id}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Play size={20} fill="currentColor" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{item.topic}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {item.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={12} /> Band {item.score}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Fluency
                  </p>
                  <p className="font-bold text-blue-600">{item.fluency}</p>
                </div>
                <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Vocab
                  </p>
                  <p className="font-bold text-purple-600">{item.vocab}</p>
                </div>
                <button className="bg-gray-900 text-white px-4 rounded-lg text-sm font-medium hover:bg-black transition">
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
