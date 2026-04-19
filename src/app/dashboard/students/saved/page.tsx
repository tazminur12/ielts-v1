'use client';
import { Bookmark, Search, Trash2, ExternalLink } from 'lucide-react';

export default function SavedQuestionsPage() {
  const savedItems = [
    {
      id: '1',
      title: 'Vocabulary for Environment',
      type: 'Reading',
      level: 'Hard',
    },
    {
      id: '2',
      title: 'Task 1: Line Graph Analysis',
      type: 'Writing',
      level: 'Medium',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Saved Resources</h1>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Search bookmarks..."
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {savedItems.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {savedItems.map(item => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Bookmark size={18} fill="currentColor" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-400 capitalize">
                      {item.type} • {item.level}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600">
                    <ExternalLink size={18} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center text-gray-400">
            No saved questions found.
          </div>
        )}
      </div>
    </div>
  );
}
