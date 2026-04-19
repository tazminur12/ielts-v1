'use client';
import { FileText, Download } from 'lucide-react';

export default function ResultsPage() {
  const results = [
    {
      id: '1',
      date: '2023-12-01',
      module: 'Full Mock',
      listening: 8.0,
      reading: 7.5,
      writing: 6.5,
      speaking: 7.0,
      overall: 7.5,
    },
    {
      id: '2',
      date: '2023-11-25',
      module: 'Listening',
      listening: 7.0,
      reading: '-',
      writing: '-',
      speaking: '-',
      overall: 7.0,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Test Results</h1>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-bold uppercase text-gray-500">
                Date & Module
              </th>
              <th className="p-4 text-xs font-bold uppercase text-gray-500 text-center">
                L
              </th>
              <th className="p-4 text-xs font-bold uppercase text-gray-500 text-center">
                R
              </th>
              <th className="p-4 text-xs font-bold uppercase text-gray-500 text-center">
                W
              </th>
              <th className="p-4 text-xs font-bold uppercase text-gray-500 text-center">
                S
              </th>
              <th className="p-4 text-xs font-bold uppercase text-gray-500 text-center">
                Overall
              </th>
              <th className="p-4 text-xs font-bold uppercase text-gray-500 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map(res => (
              <tr key={res.id} className="hover:bg-gray-50 transition">
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{res.module}</p>
                      <p className="text-xs text-gray-500">{res.date}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-center font-medium text-sm">
                  {res.listening}
                </td>
                <td className="p-4 text-center font-medium text-sm">
                  {res.reading}
                </td>
                <td className="p-4 text-center font-medium text-sm">
                  {res.writing}
                </td>
                <td className="p-4 text-center font-medium text-sm">
                  {res.speaking}
                </td>
                <td className="p-4 text-center">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold text-sm">
                    {res.overall}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 text-gray-400 hover:text-blue-600">
                    <Download size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
