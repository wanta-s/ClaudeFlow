'use client'

import { useState } from 'react'

export default function Home() {
  const [count, setCount] = useState(0)

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🚀 chat-app-frontend
        </h1>
        
        <p className="text-gray-600 mb-8">
          ClaudeFlowで生成されたNext.jsアプリケーション
        </p>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-2">カウンター</p>
            <p className="text-4xl font-bold text-blue-600">{count}</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCount(count + 1)}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              +1
            </button>
            <button
              onClick={() => setCount(count - 1)}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              -1
            </button>
            <button
              onClick={() => setCount(0)}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              リセット
            </button>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            アプリケーションが正常に動作しています ✅
          </p>
        </div>
      </div>
    </main>
  )
}
