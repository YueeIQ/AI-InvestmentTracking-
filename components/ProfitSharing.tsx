
import React, { useMemo } from 'react';
import { PortfolioSummary } from '../types';

interface ProfitSharingProps {
  summary: PortfolioSummary;
}

const ProfitSharing: React.FC<ProfitSharingProps> = ({ summary }) => {
  const { totalCost, totalProfitLoss } = summary;

  const calculation = useMemo(() => {
    if (totalCost === 0) {
      return { sharingAmount: 0, guaranteeAmount: 0 };
    }

    let sharingAmount = 0;
    let guaranteeAmount = 0;

    // Logic:
    // If Loss: Guarantee = Total Loss.
    if (totalProfitLoss < 0) {
      guaranteeAmount = Math.abs(totalProfitLoss);
    } else {
      // If Profit
      const profitRate = totalProfitLoss / totalCost;
      
      const thresholdLow = 0.03; // 3%
      const thresholdHigh = 0.05; // 5%

      const profitAt3Percent = totalCost * thresholdLow;
      const profitAt5Percent = totalCost * thresholdHigh;

      if (profitRate <= thresholdLow) {
        // Under 3%, no sharing
        sharingAmount = 0;
      } else if (profitRate > thresholdLow && profitRate <= thresholdHigh) {
        // Between 3% and 5%
        // (Total Profit - Profit@3%) * 20%
        sharingAmount = (totalProfitLoss - profitAt3Percent) * 0.20;
      } else {
        // Greater than 5%
        // Part 1: (Profit@5% - Profit@3%) * 20%
        const part1 = (profitAt5Percent - profitAt3Percent) * 0.20;
        // Part 2: (Total Profit - Profit@5%) * 50%
        const part2 = (totalProfitLoss - profitAt5Percent) * 0.50;
        
        sharingAmount = part1 + part2;
      }
    }

    return {
      sharingAmount,
      guaranteeAmount
    };
  }, [totalCost, totalProfitLoss]);

  // Format Helper
  const fmtInt = (val: number) => Math.round(val).toLocaleString('zh-CN');

  return (
    <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-6">
      <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        理财服务分成模型 (Profit Sharing)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-4 rounded-lg border ${calculation.sharingAmount > 0 ? 'bg-indigo-900/20 border-indigo-700' : 'bg-slate-900/50 border-slate-700'}`}>
          <div className="text-sm text-slate-400 mb-1">分成金额 (Share Amount)</div>
          <div className="text-2xl font-bold text-indigo-400">
            ¥{fmtInt(calculation.sharingAmount)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            规则: 收益3%-5%部分提成20%, 超过5%部分提成50%
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${calculation.guaranteeAmount > 0 ? 'bg-orange-900/20 border-orange-700' : 'bg-slate-900/50 border-slate-700'}`}>
          <div className="text-sm text-slate-400 mb-1">兜底金额 (Guarantee Amount)</div>
          <div className="text-2xl font-bold text-orange-400">
            ¥{fmtInt(calculation.guaranteeAmount)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            规则: 总亏损全额兜底
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitSharing;
