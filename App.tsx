
import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { Holding, PortfolioSummary } from './types';
import { getHoldings, saveHoldings, getUserHoldings, saveUserHoldings } from './services/storageService';
import { refreshMarketPrices } from './services/marketDataService';
import AddAssetForm from './components/AddAssetForm';
import HoldingsTable from './components/HoldingsTable';
import ProfitSharing from './components/ProfitSharing';
import SmartAdvisor from './components/SmartAdvisor';
import AuthModal from './components/AuthModal';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6'];

const App: React.FC = () => {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize App & Auth Listener
  useEffect(() => {
    // Graceful fallback if Firebase is not configured
    if (!auth) {
      console.log("App running in Local Mode (Firebase not configured)");
      const localData = getHoldings();
      setHoldings(localData);
      handleRefresh(localData);
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(true);

      if (currentUser) {
        // Logged In: Try to fetch from cloud
        try {
          const cloudData = await getUserHoldings(currentUser.uid);
          if (cloudData) {
            // Found cloud data, use it
            setHoldings(cloudData);
            handleRefresh(cloudData);
          } else {
            // No cloud data (new user), upload current local data as initial state
            const localData = getHoldings();
            await saveUserHoldings(currentUser.uid, localData);
            setHoldings(localData); // Keep using local data but now it's synced
            handleRefresh(localData);
          }
        } catch (e) {
          console.error("Sync error", e);
        }
      } else {
        // Guest: Load from Local Storage
        const localData = getHoldings();
        setHoldings(localData);
        handleRefresh(localData);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save Logic (Cloud + Local Backup)
  const persistHoldings = async (newHoldings: Holding[]) => {
    setHoldings(newHoldings);
    
    // Always save to local as cache/backup
    saveHoldings(newHoldings);

    // If logged in, sync to cloud
    if (user && auth) {
      try {
        await saveUserHoldings(user.uid, newHoldings);
      } catch (e) {
        console.error("Failed to sync to cloud", e);
      }
    }
  };

  const handleRefresh = async (currentHoldings: Holding[]) => {
    setIsRefreshing(true);
    try {
      const updated = await refreshMarketPrices(currentHoldings);
      setHoldings(updated);
      saveHoldings(updated);
      if (user && auth) saveUserHoldings(user.uid, updated);
      
      setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Modified to handle Incremental Updates (Weighted Average)
  const handleAddHoldings = (newHoldings: Holding[]) => {
    const updatedList = [...holdings];
    const affectedIds: string[] = [];

    newHoldings.forEach(incoming => {
      // Find if this asset already exists (match by Code and Type)
      const existingIndex = updatedList.findIndex(
        h => h.code === incoming.code && h.type === incoming.type
      );

      if (existingIndex !== -1) {
        // --- MERGE LOGIC ---
        const existing = updatedList[existingIndex];
        
        // Calculate Weighted Average Cost
        const totalOldCost = existing.buyPrice * existing.quantity;
        const totalNewCost = incoming.buyPrice * incoming.quantity;
        const newTotalQty = existing.quantity + incoming.quantity;
        
        // Avoid division by zero
        const newAvgPrice = newTotalQty > 0 ? (totalOldCost + totalNewCost) / newTotalQty : 0;

        updatedList[existingIndex] = {
          ...existing,
          quantity: newTotalQty,
          buyPrice: newAvgPrice,
        };
        affectedIds.push(existing.id);
      } else {
        // --- ADD LOGIC ---
        updatedList.push(incoming);
        affectedIds.push(incoming.id);
      }
    });

    persistHoldings(updatedList);
    setIsModalOpen(false); 
    
    // Trigger price fetch for only the items that were added or modified
    const itemsToRefresh = updatedList.filter(h => affectedIds.includes(h.id));

    refreshMarketPrices(itemsToRefresh).then(refreshedItems => {
        setHoldings(currentHoldings => {
             // Merge the fresh prices back into the main state
             const finalMix = currentHoldings.map(p => {
                 const fresh = refreshedItems.find(f => f.id === p.id);
                 return fresh ? { 
                   ...p, 
                   currentPrice: fresh.currentPrice, 
                   yesterdayPrice: fresh.yesterdayPrice, 
                   priceDate: fresh.priceDate,
                   name: fresh.name 
                 } : p;
             });
             
             saveHoldings(finalMix);
             if (user && auth) saveUserHoldings(user.uid, finalMix);
             
             return finalMix;
         });
    });
  };

  const handleUpdateHolding = (updatedHolding: Holding) => {
    // Edit mode replaces the specific record entirely (useful for correcting mistakes)
    const updatedList = holdings.map(h => h.id === updatedHolding.id ? updatedHolding : h);
    persistHoldings(updatedList);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确认删除? (Confirm delete?)')) {
      const updatedList = holdings.filter(h => h.id !== id);
      persistHoldings(updatedList);
      if (editingId === id) {
        setEditingId(null);
        setIsModalOpen(false);
      }
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const editingHolding = useMemo(() => holdings.find(h => h.id === editingId), [holdings, editingId]);

  const summary: PortfolioSummary = useMemo(() => {
    let cost = 0;
    let value = 0;
    let dayPL = 0;

    holdings.forEach(h => {
      cost += h.buyPrice * h.quantity;
      value += h.currentPrice * h.quantity;
      if (h.yesterdayPrice) {
        dayPL += (h.currentPrice - h.yesterdayPrice) * h.quantity;
      }
    });

    const pl = value - cost;
    const rate = cost > 0 ? (pl / cost) * 100 : 0;

    return {
      totalCost: cost,
      totalMarketValue: value,
      totalProfitLoss: pl,
      totalReturnRate: rate,
      totalDayProfitLoss: dayPL
    };
  }, [holdings]);

  const pieData = useMemo(() => {
    return holdings.map(h => ({
      name: h.name,
      value: h.currentPrice * h.quantity
    })).filter(d => d.value > 0);
  }, [holdings]);

  const barData = useMemo(() => {
     return [...holdings]
        .sort((a,b) => {
             const plA = (a.currentPrice - a.buyPrice) * a.quantity;
             const plB = (b.currentPrice - b.buyPrice) * b.quantity;
             return Math.abs(plB) - Math.abs(plA); 
        })
        .slice(0, 8)
        .map(h => ({
            name: h.name,
            pl: (h.currentPrice - h.buyPrice) * h.quantity
        }));
  }, [holdings]);

  const getPLColor = (val: number) => val >= 0 ? 'text-red-400' : 'text-green-400';
  const getBarColor = (val: number) => val >= 0 ? '#f87171' : '#4ade80';

  // Format Helper
  const fmtInt = (val: number) => Math.round(val).toLocaleString('zh-CN');

  if (authLoading && !holdings.length) {
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-800 shadow-md border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
               <h1 className="text-xl font-bold text-white tracking-tight">WealthTrack AI</h1>
               <div className="flex items-center space-x-2">
                 <p className="text-xs text-slate-400">Personal Finance Dashboard</p>
                 {user ? (
                   <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">Cloud Sync Active</span>
                 ) : (
                   <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                     {auth ? 'Local Mode' : 'Offline Mode (No Config)'}
                   </span>
                 )}
               </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             {/* Auth Buttons */}
             {user ? (
               <div className="hidden sm:flex items-center space-x-3 border-r border-slate-700 pr-4 mr-1">
                 <span className="text-xs text-slate-300 truncate max-w-[150px]">{user.email}</span>
                 <button 
                   onClick={handleLogout}
                   className="text-xs text-slate-400 hover:text-white transition-colors"
                 >
                   Sign Out
                 </button>
               </div>
             ) : (
               <div className="hidden sm:block border-r border-slate-700 pr-4 mr-1">
                 <button 
                   onClick={() => setIsAuthModalOpen(true)}
                   className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                 >
                   Login / Register
                 </button>
               </div>
             )}

             <div className="text-right hidden md:block">
               <div className="text-[10px] text-slate-400 uppercase tracking-wider">Data Updated</div>
               <div className="text-xs font-mono text-slate-200">{lastUpdated || '--:--:--'}</div>
             </div>
             
             <button
              onClick={openAddModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Asset
            </button>
            <button 
              onClick={() => handleRefresh(holdings)}
              className={`flex items-center space-x-2 text-slate-400 hover:text-indigo-400 transition-colors ${isRefreshing ? 'animate-pulse' : ''}`}
              title="Refresh Market Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
           <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden order-1">
            <div className={`absolute top-0 right-0 p-2 opacity-10 ${summary.totalDayProfitLoss >= 0 ? 'bg-red-500' : 'bg-green-500'} rounded-bl-xl`}>
                <span className="text-xl">Today</span>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">今日盈亏 (Day P/L)</p>
            <p className={`text-2xl font-bold mt-2 font-mono ${getPLColor(summary.totalDayProfitLoss)}`}>
               {summary.totalDayProfitLoss >= 0 ? '+' : ''}{fmtInt(summary.totalDayProfitLoss)}
            </p>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm order-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">总盈亏金额 (Total P/L)</p>
            <p className={`text-2xl font-bold mt-2 font-mono ${getPLColor(summary.totalProfitLoss)}`}>
              {summary.totalProfitLoss >= 0 ? '+' : ''}{fmtInt(summary.totalProfitLoss)}
            </p>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm order-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">总收益率 (Return)</p>
            <p className={`text-2xl font-bold mt-2 font-mono ${getPLColor(summary.totalReturnRate)}`}>
               {summary.totalReturnRate >= 0 ? '+' : ''}{summary.totalReturnRate.toFixed(2)}%
            </p>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm order-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">当前总市值 (Value)</p>
            <p className="text-2xl font-bold text-indigo-300 mt-2 font-mono">¥{fmtInt(summary.totalMarketValue)}</p>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm order-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">总投入成本 (Cost)</p>
            <p className="text-2xl font-bold text-slate-100 mt-2 font-mono">¥{fmtInt(summary.totalCost)}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm min-h-[350px]">
                <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
                    <span className="w-1 h-5 bg-indigo-500 rounded-full mr-2"></span>
                    资产配置 (Allocation)
                </h3>
                {holdings.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                formatter={(value: number) => `¥${Math.round(value).toLocaleString()}`} 
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600">No Data</div>
                )}
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm min-h-[350px]">
                 <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
                    <span className="w-1 h-5 bg-indigo-500 rounded-full mr-2"></span>
                    主要盈亏贡献 (Top Movers)
                 </h3>
                  {holdings.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 12, fill: '#94a3b8'}} interval={0} />
                             <Tooltip 
                                cursor={{fill: '#334155', opacity: 0.4}}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                formatter={(value: number) => `¥${Math.round(value).toLocaleString()}`} 
                             />
                             <Bar dataKey="pl" radius={[0, 4, 4, 0]}>
                                {barData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getBarColor(entry.pl)} />
                                ))}
                             </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                   ) : (
                    <div className="h-full flex items-center justify-center text-slate-600">No Data</div>
                )}
            </div>
        </div>

        {/* Profit Sharing Logic */}
        <ProfitSharing summary={summary} />

        {/* Holdings List */}
        <HoldingsTable holdings={holdings} onDelete={handleDelete} onEdit={handleEdit} />

        {/* AI Advisor */}
        <SmartAdvisor holdings={holdings} />

      </main>

      {/* Add/Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
           <div className="relative w-full max-w-2xl bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
              <AddAssetForm 
                  onAdd={handleAddHoldings} 
                  onUpdate={handleUpdateHolding}
                  editingHolding={editingHolding || undefined} 
                  onCancelEdit={() => {
                    setEditingId(null);
                    setIsModalOpen(false);
                  }}
              />
           </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal onClose={() => setIsAuthModalOpen(false)} />
      )}
    </div>
  );
};

export default App;
