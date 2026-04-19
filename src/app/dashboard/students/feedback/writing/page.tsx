'use client';
import { CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

export default function WritingFeedbackPage() {
  const feedbacks = [
    {
      id: '1',
      task: 'Task 2: Global Warming',
      score: 6.5,
      date: '2 days ago',
      status: 'reviewed',
      strengths: 'Good use of cohesive devices.',
      weakness: 'Grammatical errors in complex sentences.',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Writing Feedback</h1>
          <p className="text-gray-500">
            Detailed AI-powered evaluation of your writing tasks.
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Submit New Task
        </button>
      </div>

      <div className="grid gap-6">
        {feedbacks.map(item => (
          <div
            key={item.id}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{item.task}</h3>
                  <p className="text-xs text-gray-500">
                    Submitted on {item.date}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-purple-600">
                  {item.score}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-400">
                  Band Score
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-green-700 font-bold text-sm mb-2">
                  <CheckCircle2 size={16} /> <span>Strengths</span>
                </div>
                <p className="text-sm text-green-800 leading-relaxed">
                  {item.strengths}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-red-700 font-bold text-sm mb-2">
                  <AlertCircle size={16} /> <span>Areas to Improve</span>
                </div>
                <p className="text-sm text-red-800 leading-relaxed">
                  {item.weakness}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
