
import React, { useState } from 'react';
import { AssetType, Holding } from '../types';

interface HoldingsTableProps {
  holdings: Holding[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

type SortField = 'marketValue' | 'profitLoss' | 'profitRate' | 'dayProfitLoss' | 'currentPrice';
type SortOrder = 'asc' | 'desc';

const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, onDelete, onEdit }) => {
  const [filterType, setFilterType] = useState<AssetType | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('profitLoss');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filtered = holdings.filter(h => filterType === 'ALL' || h.type === filterType);

  const sorted = [...filtered].sort((a, b) => {
    const costA = a.buyPrice * a.quantity;
    const valA = a.currentPrice * a.quantity;
    const plA = valA - costA;
    const prA = costA > 0 ? plA / costA : 0;
    const dayPLA = a.yesterdayPrice ? (a.currentPrice - a.yesterdayPrice) * a.quantity : 0;

    const costB = b.buyPrice * b.quantity;
    const valB = b.currentPrice * b.quantity;
    const plB = valB - costB;
    const prB = costB > 0 ? plB / costB : 0;
    const dayPLB = b.yesterdayPrice ? (b.currentPrice - b.yesterdayPrice) * b.quantity : 0;

    let val1 = 0;
    let val2 = 0;

    switch (sortField) {
      case 'marketValue':
        val1 = valA;
        val2 = valB;
        break;
      case 'profitLoss':
        val1 = plA;
        val2 = plB;
        break;
      case 'profitRate':
        val1 = prA;
        val2 = prB;
        break;
      case 'dayProfitLoss':
        val1 = dayPLA;
        val2 = dayPLB;
        break;
      case 'currentPrice':
        val1 = a.currentPrice;
        val2 = b.currentPrice;
        break;
    }

    return sortOrder === 'asc' ? val1 - val2 : val2 - val1;
  });

  const getPLColor = (val: number) => val >= 0 ? 'text-red-400' : 'text-green-400';
  
  // Format to Integer for display
  const fmtInt = (val: number) => Math.round(val).toLocaleString('zh-CN');
  // Format to 4 decimals for Prices
  const fmtPrice = (val: number) => val.toFixed(4);

  return (
    <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h3 className="font-semibold text-slate-200">持仓明细 (Holdings)</h3>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as AssetType | 'ALL')}
          className="text-sm bg-slate-900 text-slate-300 border-slate-600 rounded-md border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">全部类型 (All)</option>
          <option value={AssetType.STOCK}>股票 (Stock)</option>
          <option value={AssetType.FUND}>基金 (Fund)</option>
        </select>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900/50 text-slate-400 font-medium">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">标的 (Asset)</th>
              <th className="px-4 py-3 cursor-pointer hover:text-indigo-400 whitespace-nowrap" onClick={() => handleSort('currentPrice')}>
                最新净值 (Nav) {sortField === 'currentPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
               <th className="px-4 py-3 cursor-pointer hover:text-indigo-400 whitespace-nowrap" onClick={() => handleSort('marketValue')}>
                市值 (Val) {sortField === 'marketValue' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-indigo-400 whitespace-nowrap" onClick={() => handleSort('dayProfitLoss')}>
                每日盈亏 (Day P/L) {sortField === 'dayProfitLoss' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-indigo-400 whitespace-nowrap" onClick={() => handleSort('profitLoss')}>
                总盈亏 (Total P/L) {sortField === 'profitLoss' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-indigo-400 whitespace-nowrap" onClick={() => handleSort('profitRate')}>
                收益率 (%) {sortField === 'profitRate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-right whitespace-nowrap">操作 (Action)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {sorted.map(h => {
              const cost = h.buyPrice * h.quantity;
              const value = h.currentPrice * h.quantity;
              const pl = value - cost;
              const plRate = cost > 0 ? (pl / cost) * 100 : 0;
              const dayPL = h.yesterdayPrice ? (h.currentPrice - h.yesterdayPrice) * h.quantity : 0;
              const dayChangeRate = h.yesterdayPrice ? ((h.currentPrice - h.yesterdayPrice) / h.yesterdayPrice) * 100 : 0;

              return (
                <tr key={h.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{h.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{h.code} · {h.type === AssetType.STOCK ? '股票' : '基金'}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Hold: <span className="text-slate-300">{h.quantity}</span> · Cost: <span className="text-slate-300">{fmtPrice(h.buyPrice)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    <div>{fmtPrice(h.currentPrice)}</div>
                    {h.priceDate && (
                      <div className="text-[10px] text-slate-500 mt-0.5">{h.priceDate.replace(/^\d{4}-/, '')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium font-mono text-slate-200">
                    ¥{fmtInt(value)}
                  </td>
                  <td className={`px-4 py-3 font-medium font-mono ${getPLColor(dayPL)}`}>
                     <div>{dayPL > 0 ? '+' : ''}{fmtInt(dayPL)}</div>
                     <div className="text-xs opacity-70">
                       ({dayChangeRate > 0 ? '+' : ''}{dayChangeRate.toFixed(2)}%)
                     </div>
                  </td>
                  <td className={`px-4 py-3 font-medium font-mono ${getPLColor(pl)}`}>
                    {pl > 0 ? '+' : ''}{fmtInt(pl)}
                  </td>
                  <td className={`px-4 py-3 font-medium font-mono ${getPLColor(plRate)}`}>
                    {plRate.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => onEdit(h.id)}
                      className="text-slate-400 hover:text-indigo-400 transition-colors"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(h.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  暂无持仓记录 (No holdings found)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HoldingsTable;
