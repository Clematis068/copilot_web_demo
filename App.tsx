
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DDRAGON_BASE, ROLE_ICONS, ROLE_LABELS, ROLE_ORDER } from './constants';
import { Champion, Role, StrategyData, LcuStateResponse } from './types';
import { getStrategy } from './geminiService';

const App: React.FC = () => {
  const [allChampions, setAllChampions] = useState<Champion[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myChampion, setMyChampion] = useState<Champion | null>(null);
  const [enemyTeam, setEnemyTeam] = useState<(Champion | null)[]>(new Array(5).fill(null));
  const [assignedRole, setAssignedRole] = useState<Role>('MID');
  const [selectedOpponent, setSelectedOpponent] = useState<Champion | null>(null);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<(StrategyData & { isCached?: boolean }) | null>(null);
  const [showPicker, setShowPicker] = useState<{ active: boolean; index?: number | 'MY' }>({ active: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [customContext, setCustomContext] = useState('');

  useEffect(() => {
    const initData = async () => {
      try {
        const vRes = await fetch(`${DDRAGON_BASE}/api/versions.json`);
        const versions = await vRes.json();
        const latest = versions[0];
        const cRes = await fetch(`${DDRAGON_BASE}/cdn/${latest}/data/zh_CN/champion.json`);
        const cData = await cRes.json();
        setAllChampions(Object.values(cData.data).map((c: any) => ({
          id: c.id, key: c.key, name: c.name, title: c.title, image: `${DDRAGON_BASE}/cdn/${latest}/img/champion/${c.image.full}`
        })));
      } catch (e) { console.error(e); }
    };
    initData();
  }, []);

  const findChampByKey = useCallback((key: string | number) => {
    return allChampions.find(c => c.key === key.toString()) || null;
  }, [allChampions]);

  useEffect(() => {
    if (allChampions.length === 0) return;
    const poll = async () => {
      try {
        const res = await fetch('http://localhost:8000/state');
        const data: LcuStateResponse = await res.json();
        setIsConnected(data.isConnected);
        if (data.isConnected) {
            const activeMyId = data.myChampionId !== 0 ? data.myChampionId : data.myPickIntentId;
            if (activeMyId !== 0) setMyChampion(findChampByKey(activeMyId));
            if (data.enemyIds) setEnemyTeam(data.enemyIds.map(id => id !== 0 ? findChampByKey(id) : null));
            if (data.assignedRole && data.assignedRole !== "UNKNOWN") {
              const posMap: Record<string, Role> = { 'TOP': 'TOP', 'JUNGLE': 'JUNGLE', 'MIDDLE': 'MID', 'MID': 'MID', 'BOTTOM': 'ADC', 'ADC': 'ADC', 'UTILITY': 'SUPPORT' };
              setAssignedRole(posMap[data.assignedRole.toUpperCase()] || 'MID');
            }
        }
      } catch (e) { setIsConnected(false); }
    };
    const timer = setInterval(poll, 1500);
    return () => clearInterval(timer);
  }, [allChampions, findChampByKey]);

  const handleAnalyze = useCallback(async () => {
    if (!myChampion || !selectedOpponent) return;
    setLoading(true);
    // 注意：如果是从缓存读取，这一步会非常快
    try {
      const data = await getStrategy(myChampion.name, selectedOpponent.name, assignedRole, customContext);
      setStrategy(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [myChampion, selectedOpponent, assignedRole, customContext]);

  useEffect(() => {
    if (myChampion && selectedOpponent && !customContext) handleAnalyze();
  }, [myChampion?.id, selectedOpponent?.id, assignedRole]);

  const filteredChamps = useMemo(() => {
    if (!searchTerm) return allChampions;
    return allChampions.filter(c => c.name.includes(searchTerm) || c.title.includes(searchTerm) || c.id.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allChampions, searchTerm]);

  return (
    <div className="min-h-screen bg-[#010a13] text-[#f0e6d2] font-sans">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* Header - 精简高度 */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-[#1e2328] pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#c89b3c] rounded-xl flex items-center justify-center text-[#010a13] shadow-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2z"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white leading-none">LCU <span className="text-[#c89b3c]">COPILOT</span></h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`} />
                <span className="text-[8px] font-bold tracking-widest text-[#a09b8c] uppercase">{isConnected ? 'LINKED' : 'OFFLINE'}</span>
              </div>
            </div>
          </div>

          <div className="flex bg-[#091428] p-1 rounded-xl border border-[#1e2328] space-x-1">
            {ROLE_ORDER.map(role => (
              <button 
                key={role} 
                onClick={() => setAssignedRole(role)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all min-w-[90px] ${assignedRole === role ? 'bg-[#c89b3c] text-[#010a13]' : 'text-[#5b5a56] hover:bg-white/5'}`}
              >
                <div className="scale-75">{ROLE_ICONS[role]}</div>
                <span className="text-[10px] font-bold uppercase">{ROLE_LABELS[role]}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dashboard Left */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#091428] border border-[#1e2328] rounded-[1.5rem] p-6 shadow-xl">
              <div className="mb-6">
                <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#c89b3c] mb-3 opacity-60">Intelligence Input</h3>
                <textarea 
                  placeholder="输入视频链接或特定绝活哥名称..."
                  className="w-full h-16 bg-[#010a13] border border-[#1e2328] rounded-lg p-3 text-[11px] focus:border-[#c89b3c] outline-none transition-all placeholder-[#3c3c3c] resize-none"
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                />
                <button 
                  onClick={handleAnalyze}
                  disabled={loading || !myChampion || !selectedOpponent}
                  className="w-full mt-2 py-2.5 bg-[#c89b3c] rounded-lg text-[#010a13] font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-20"
                >
                  {loading ? 'ANALYZING...' : '提取实战秘籍'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#a09b8c] opacity-60">My Champion</h3>
                  <button onClick={() => setShowPicker({ active: true, index: 'MY' })} className="w-full aspect-video bg-[#010a13] rounded-xl overflow-hidden border border-[#1e2328] relative group">
                    {myChampion ? (
                      <img src={myChampion.image} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform" />
                    ) : <div className="h-full flex items-center justify-center text-[#1e2328] font-black text-2xl">?</div>}
                  </button>
                </div>
                <div className="space-y-2">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-red-500 opacity-60">Opponent</h3>
                  <div className="grid grid-cols-5 gap-1">
                    {enemyTeam.map((champ, i) => (
                      <button key={i} onClick={() => champ ? setSelectedOpponent(champ) : setShowPicker({ active: true, index: i })} className={`aspect-square rounded border ${selectedOpponent?.key === champ?.key && champ ? 'border-[#c89b3c] bg-[#c89b3c]/20' : 'border-[#1e2328]'} overflow-hidden`}>
                        {champ ? <img src={champ.image} className="w-full h-full object-cover" /> : <div className="text-[8px] opacity-20">?</div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {selectedOpponent && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                  <img src={selectedOpponent.image} className="w-8 h-8 rounded-lg" />
                  <span className="text-[11px] font-bold uppercase text-white tracking-widest">{selectedOpponent.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Strategy Panel */}
          <div className="lg:col-span-8">
            {loading ? (
              <div className="h-64 bg-[#091428] border border-[#1e2328] rounded-[1.5rem] flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#c89b3c]/20 border-t-[#c89b3c] rounded-full animate-spin mb-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#a09b8c]">Fetching Tactics</span>
              </div>
            ) : strategy ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-[#091428] border border-[#1e2328] rounded-[2rem] p-8 relative overflow-hidden">
                  {strategy.isCached && (
                    <div className="absolute top-4 right-6 flex items-center gap-2 text-[8px] font-bold text-[#c89b3c] bg-[#c89b3c]/10 px-3 py-1 rounded-full uppercase tracking-widest">
                      <span className="animate-pulse">⚡</span> Local Cache Hit
                    </div>
                  )}
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] mb-4 text-[#c89b3c] opacity-50">Operational Summary</h2>
                  <p className="text-2xl font-black italic text-white leading-tight mb-8">“{strategy.summary}”</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MiniPhaseCard title="Early Game" icon="⚡" items={strategy.earlyGame} color="green" />
                    <MiniPhaseCard title="Mid Game" icon="⚔️" items={strategy.midGame} color="yellow" />
                    <MiniPhaseCard title="Late Game" icon="🏆" items={strategy.lateGame} color="purple" />
                  </div>
                </div>

                <div className="bg-[#091428] border border-[#1e2328] rounded-[2rem] p-8">
                  <h3 className="text-sm font-black italic text-white mb-6 border-b border-[#1e2328] pb-4 uppercase tracking-widest">Matchup Intel</h3>
                  <div className="space-y-3 text-[#a09b8c] text-[13px] leading-relaxed max-h-48 overflow-y-auto pr-4 custom-scroll font-medium">
                    {strategy.matchupTips.split('\n').filter(l => l.trim().length > 3).map((line, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-[#c89b3c] opacity-40 font-black shrink-0">/</span>
                        <p>{line.replace(/[*#]/g, '')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-[#1e2328] rounded-[2rem] flex items-center justify-center opacity-20">
                <span className="text-[10px] font-bold uppercase tracking-widest">Waiting for Combat Signal</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPicker.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className="absolute inset-0" onClick={() => setShowPicker({ active: false })} />
          <div className="relative w-full max-w-4xl bg-[#091428] border border-[#1e2328] rounded-[2rem] p-8 flex flex-col max-h-[85vh]">
             <input type="text" placeholder="搜索英雄..." autoFocus className="bg-[#010a13] border border-[#1e2328] rounded-xl px-6 py-4 text-xl focus:border-[#c89b3c] outline-none mb-8 w-full font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 overflow-y-auto pr-4 custom-scroll">
                {filteredChamps.map(c => (
                  <button key={c.key} onClick={() => {
                    if (showPicker.index === 'MY') setMyChampion(c);
                    else { const team = [...enemyTeam]; team[showPicker.index as number] = c; setEnemyTeam(team); setSelectedOpponent(c); }
                    setShowPicker({ active: false });
                  }} className="flex flex-col items-center group">
                    <img src={c.image} className="w-full aspect-square rounded-lg border-2 border-transparent group-hover:border-[#c89b3c] transition-all" />
                    <span className="text-[9px] mt-2 font-bold truncate w-full text-center opacity-60 uppercase">{c.name}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #1e2328; border-radius: 2px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #c89b3c; }
      `}</style>
    </div>
  );
};

const MiniPhaseCard = ({ title, icon, items, color }: { title: string, icon: string, items: string[], color: string }) => {
  const colors: any = { green: 'text-green-500', yellow: 'text-yellow-500', purple: 'text-purple-500' };
  return (
    <div className="bg-[#010a13] p-5 rounded-2xl border border-white/5">
      <div className={`text-xl mb-3 ${colors[color]} opacity-50`}>{icon}</div>
      <h4 className="text-[8px] font-bold uppercase tracking-widest mb-4 opacity-40">{title}</h4>
      <ul className="space-y-2">
        {items.slice(0, 3).map((item, i) => (
          <li key={i} className="text-[11px] font-bold text-[#a09b8c] leading-tight flex gap-2">
            <span className="text-[#c89b3c] opacity-20 shrink-0">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
