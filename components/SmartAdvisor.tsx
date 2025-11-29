
import React, { useState } from 'react';
import { Holding, AIAdvice } from '../types';
import { getSmartAdvice } from '../services/geminiService';

interface SmartAdvisorProps {
  holdings: Holding[];
}

const SmartAdvisor: React.FC<SmartAdvisorProps> = ({ holdings }) => {
  const [advice, setAdvice] = useState<AIAdvice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAdvice = async () => {
    if (holdings.length === 0) {
      setError("Please add holdings first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await getSmartAdvice(holdings);
      setAdvice(result);
    } catch (e) {
      setError("Failed to get advice from Gemini. Please ensure API Key is set in env.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-800 to-indigo-900/40 rounded-xl shadow-sm border border-indigo-500/30 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-indigo-100 flex items-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            智能投资顾问 (AI Advisor)
          </h2>
          <p className="text-sm text-indigo-300/80 mt-1">
            Based on your portfolio, finding better performing alternatives.
          </p>
        </div>
        <button
          onClick={handleGenerateAdvice}
          disabled={loading || holdings.length === 0}
          className={`px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-sm ${
            loading 
              ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500'
          }`}
        >
          {loading ? 'Thinking...' : 'Generate Analysis'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 text-red-400 p-3 rounded-md text-sm mb-4 border border-red-900/50">
          {error}
        </div>
      )}

      {advice.length > 0 && (
        <div className="space-y-4">
          {advice.map((item, idx) => (
            <div key={idx} className="bg-slate-900/60 p-4 rounded-lg shadow-sm border border-slate-700">
              <h3 className="font-semibold text-slate-200 mb-3 border-b border-slate-700 pb-2">
                针对: {item.assetName} <span className="text-slate-500 text-sm">({item.assetCode})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {item.alternatives.map((alt, altIdx) => (
                  <div key={altIdx} className="bg-slate-800 p-3 rounded-md text-sm border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-indigo-300">{alt.name}</span>
                      <span className="text-xs font-mono bg-slate-700 text-slate-300 px-1 rounded">{alt.code}</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {alt.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {advice.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-indigo-300/50 text-sm">
          Click "Generate Analysis" to get AI-powered insights.
        </div>
      )}
    </div>
  );
};

export default SmartAdvisor;
