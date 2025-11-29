
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AssetType, Holding } from '../types';

interface AddAssetFormProps {
  onAdd: (holdings: Holding[]) => void;
  onUpdate: (holding: Holding) => void;
  editingHolding?: Holding;
  onCancelEdit: () => void;
}

const AddAssetForm: React.FC<AddAssetFormProps> = ({ onAdd, onUpdate, editingHolding, onCancelEdit }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'batch'>('manual');
  
  // Manual State
  const [manualForm, setManualForm] = useState({
    type: AssetType.FUND,
    name: '',
    code: '',
    buyDate: new Date().toISOString().split('T')[0],
    buyPrice: '',
    quantity: ''
  });

  // Load editing data into form
  useEffect(() => {
    if (editingHolding) {
      setActiveTab('manual');
      setManualForm({
        type: editingHolding.type,
        name: editingHolding.name,
        code: editingHolding.code,
        buyDate: editingHolding.buyDate,
        buyPrice: editingHolding.buyPrice.toString(),
        quantity: editingHolding.quantity.toString()
      });
    } else {
      // Reset form if not editing
      setManualForm({
        type: AssetType.FUND,
        name: '',
        code: '',
        buyDate: new Date().toISOString().split('T')[0],
        buyPrice: '',
        quantity: ''
      });
    }
  }, [editingHolding]);

  // Batch State
  const [batchText, setBatchText] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.code || !manualForm.buyPrice || !manualForm.quantity) return;

    if (editingHolding) {
        // Update Logic
        const updated: Holding = {
            ...editingHolding,
            type: manualForm.type,
            name: manualForm.name || editingHolding.name,
            code: manualForm.code,
            buyDate: manualForm.buyDate,
            buyPrice: parseFloat(manualForm.buyPrice),
            quantity: parseFloat(manualForm.quantity),
        };
        onUpdate(updated);
    } else {
        // Add Logic
        const newHolding: Holding = {
            id: uuidv4(),
            type: manualForm.type,
            name: manualForm.name || manualForm.code,
            code: manualForm.code,
            buyDate: manualForm.buyDate,
            buyPrice: parseFloat(manualForm.buyPrice),
            quantity: parseFloat(manualForm.quantity),
            currentPrice: parseFloat(manualForm.buyPrice) // Init with buy price, will fetch later
        };
        onAdd([newHolding]);
        // Reset
        setManualForm({ ...manualForm, name: '', code: '', buyPrice: '', quantity: '' });
    }
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const lines = batchText.trim().split('\n');
    const newHoldings: Holding[] = [];
    const today = new Date().toISOString().split('T')[0];

    lines.forEach(line => {
      // Expected: Name, Code, Price, Quantity
      const parts = line.split(/,|，/).map(p => p.trim());
      
      if (parts.length >= 4) {
        const name = parts[0];
        const code = parts[1];
        const price = parseFloat(parts[2]);
        const qty = parseFloat(parts[3]);

        if (code && !isNaN(price) && !isNaN(qty)) {
          newHoldings.push({
            id: uuidv4(),
            type: AssetType.FUND, // Default to fund for batch
            name: name || code,
            code: code,
            buyDate: today,
            buyPrice: price,
            quantity: qty,
            currentPrice: price
          });
        }
      }
    });

    if (newHoldings.length > 0) {
      onAdd(newHoldings);
      setBatchText('');
    } else {
      alert('Could not parse any valid holdings. Format: Name, Code, Price, Quantity');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center border-b border-slate-700 mb-6 pb-2">
         <h2 className="text-xl font-bold text-slate-100">
           {editingHolding ? '编辑持仓 (Edit Asset)' : '添加资产 (Add Asset)'}
         </h2>
         <button onClick={onCancelEdit} className="text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
         </button>
      </div>

      <div className="flex space-x-6 mb-6">
          <button
            className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'manual' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setActiveTab('manual')}
            disabled={!!editingHolding}
          >
            单条录入 (Manual)
          </button>
          {!editingHolding && (
              <button
              className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'batch' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => setActiveTab('batch')}
              >
              批量导入 (Batch)
              </button>
          )}
      </div>

      {activeTab === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">类型 (Type)</label>
            <select
              value={manualForm.type}
              onChange={e => setManualForm({...manualForm, type: e.target.value as AssetType})}
              className="w-full bg-slate-900 text-slate-200 rounded-md border border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={AssetType.FUND}>基金 (Fund)</option>
              <option value={AssetType.STOCK}>股票 (Stock)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">代码 (Code)</label>
            <input
              type="text"
              required
              placeholder="e.g. 600519"
              value={manualForm.code}
              onChange={e => setManualForm({...manualForm, code: e.target.value})}
              className="w-full bg-slate-900 text-slate-200 rounded-md border border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">名称 (Name)</label>
            <input
              type="text"
              placeholder="e.g. 茅台"
              value={manualForm.name}
              onChange={e => setManualForm({...manualForm, name: e.target.value})}
              className="w-full bg-slate-900 text-slate-200 rounded-md border border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">买入日期 (Date)</label>
            <input
              type="date"
              required
              value={manualForm.buyDate}
              onChange={e => setManualForm({...manualForm, buyDate: e.target.value})}
              className="w-full bg-slate-900 text-slate-200 rounded-md border border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">买入单价 (Cost)</label>
            <input
              type="number"
              required
              step="0.0001"
              min="0"
              value={manualForm.buyPrice}
              onChange={e => setManualForm({...manualForm, buyPrice: e.target.value})}
              className="w-full bg-slate-900 text-slate-200 rounded-md border border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">持仓数量 (Qty)</label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={manualForm.quantity}
              onChange={e => setManualForm({...manualForm, quantity: e.target.value})}
              className="w-full bg-slate-900 text-slate-200 rounded-md border border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-2 mt-4">
            <button
              type="submit"
              className={`w-full py-2 px-4 rounded-md transition-colors text-sm font-medium ${
                  editingHolding 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {editingHolding ? '更新持仓 (Update Holding)' : '+ 添加持仓 (Add Holding)'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBatchSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              批量文本输入 (Batch Text)
            </label>
            <p className="text-[10px] text-slate-500 mb-2">
              格式: 名称, 代码, 买入价格, 持仓数量 (逗号隔开，每行一条)
            </p>
            <textarea
              rows={8}
              className="w-full bg-slate-900 text-slate-200 rounded-md border border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder={`招商白酒, 161725, 1.25, 1000\n易方达蓝筹, 005827, 2.30, 500`}
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            解析并导入 (Parse & Import)
          </button>
        </form>
      )}
    </div>
  );
};

export default AddAssetForm;
