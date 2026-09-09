import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Calendar, 
  User as UserIcon, 
  Search, 
  Filter, 
  RefreshCw, 
  X,
  FileSpreadsheet,
  Layers,
  Clock,
  Trash2
} from 'lucide-react';
import { MR_MGA_EQUIPMENTS } from '../App';
import { User } from '../types';

interface EquipmentIntervention {
  id: number;
  user_id: number;
  equipment_id: any;
  date: string;
  is_sandbox: number;
}

export function BilanAE({ user }: { user?: User }) {
  const [interventions, setInterventions] = useState<EquipmentIntervention[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [mgaMissions, setMgaMissions] = useState<any[]>([]);
  const [mgaEquipments, setMgaEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('All');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const canDelete = user?.role === 'admin' || user?.trigram === 'DSO' || user?.entity === 'MR-MGA';

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/equipment_interventions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchData();
      } else {
        console.error("Failed to delete intervention");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, interventionsRes, missionsRes, equipmentsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/equipment_interventions?is_sandbox=false'),
        fetch('/api/mga_missions'),
        fetch('/api/mga_equipments')
      ]);

      if (usersRes.ok && interventionsRes.ok) {
        const uData = await usersRes.json();
        const iData = await interventionsRes.json();
        setUsers(uData);
        setInterventions(iData);
      }
      if (missionsRes && missionsRes.ok) {
        setMgaMissions(await missionsRes.json());
      }
      if (equipmentsRes && equipmentsRes.ok) {
        setMgaEquipments(await equipmentsRes.json());
      }
    } catch (error) {
      console.error("[BILAN AE FETCH ERROR]", error);
    } finally {
      setLoading(false);
    }
  };

  const unifiedEquipments = React.useMemo(() => {
    const list: any[] = [];
    
    mgaMissions.forEach(m => {
      list.push({
        id: `m-${m.id}`,
        trigram: m.name,
        lastname: m.description || m.name,
        subCategory: m.category || 'CNS/ATM'
      });
    });

    mgaEquipments.forEach(e => {
      list.push({
        id: `e-${e.id}`,
        trigram: e.name,
        lastname: e.description || e.name,
        subCategory: e.category || 'CNS/ATM'
      });
    });

    return list;
  }, [mgaMissions, mgaEquipments]);

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to compute week string from YYYY-MM-DD
  const getWeekNumber = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  // Helper to format date in french format
  const formatDateFr = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // Filtered interventions
  const filteredInterventions = interventions.filter(item => {
    const agent = users.find(u => u.id === item.user_id);
    const eq = (() => {
      let found = unifiedEquipments.find(e => e.id === String(item.equipment_id));
      if (!found) {
        const legacyEq = MR_MGA_EQUIPMENTS.find(e => e.id === Number(item.equipment_id));
        if (legacyEq) {
          found = {
            id: String(legacyEq.id),
            trigram: legacyEq.trigram,
            lastname: legacyEq.lastname,
            subCategory: legacyEq.subCategory || 'CNS/ATM'
          };
        }
      }
      return found;
    })();

    if (!eq) return false; // Ignore if equipment not found in list

    // Category filter (CNS/ATM or SE)
    const eqCategory = eq.subCategory || 'CNS/ATM';
    if (selectedCategory !== 'All' && eqCategory !== selectedCategory) {
      return false;
    }

    // Equipment filter
    if (selectedEquipmentId !== 'All' && String(eq.id) !== selectedEquipmentId) {
      return false;
    }

    // Agent filter
    if (selectedAgentId !== 'All' && String(item.user_id) !== selectedAgentId) {
      return false;
    }

    // Text search (Agent name, trigram, or equipment trigram/name)
    if (searchTerm.trim() !== '') {
      const s = searchTerm.toLowerCase();
      const agentMatch = agent ? (
        agent.trigram.toLowerCase().includes(s) || 
        `${agent.firstname} ${agent.lastname}`.toLowerCase().includes(s)
      ) : false;
      const eqMatch = eq.trigram.toLowerCase().includes(s) || eq.lastname.toLowerCase().includes(s);
      
      if (!agentMatch && !eqMatch) {
        return false;
      }
    }

    return true;
  });

  // Sort interventions by date descending, then agent trigram
  const sortedInterventions = [...filteredInterventions].sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    const agentA = users.find(u => u.id === a.user_id)?.trigram || '';
    const agentB = users.find(u => u.id === b.user_id)?.trigram || '';
    return agentA.localeCompare(agentB);
  });

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedEquipmentId('All');
    setSelectedAgentId('All');
  };

  // Stats calculation
  const uniqueAgentsCount = new Set(sortedInterventions.map(i => i.user_id)).size;
  const uniqueEquipmentsCount = new Set(sortedInterventions.map(i => i.equipment_id)).size;

  return (
    <div id="bilan_ae_view" className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 bg-gray-50/50 min-h-screen">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/10">
            <Wrench size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">BILAN DES INTERVENTIONS MS</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Données issues du tableau hebdo</p>
          </div>
        </div>
        <button 
          onClick={fetchData}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl hover:bg-gray-50 text-xs font-black uppercase tracking-wider transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
      </div>

      {/* Filters block */}
      <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-indigo-600" />
            <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest">Filtres de recherche</h2>
          </div>
          {(searchTerm || selectedCategory !== 'All' || selectedEquipmentId !== 'All' || selectedAgentId !== 'All') && (
            <button 
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider transition-colors"
            >
              <X size={13} />
              Réinitialiser
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Text search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <Search size={15} />
            </span>
            <input 
              type="text" 
              placeholder="Rechercher un agent, trigramme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 transition-colors bg-gray-50/20"
            />
          </div>

          {/* Agent filter */}
          <div>
            <select 
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-wider outline-none focus:border-indigo-500 transition-colors bg-gray-50/20 cursor-pointer text-gray-750"
            >
              <option value="All">Agents : Tous</option>
              {users
                .filter(u => u.entity === 'MR-MGA' && u.trigram.toUpperCase() !== 'IGL')
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.trigram} - {u.firstname} {u.lastname}
                  </option>
                ))}
            </select>
          </div>

          {/* Equipment/Mission filter */}
          <div>
            <select 
              value={selectedEquipmentId}
              onChange={(e) => setSelectedEquipmentId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-wider outline-none focus:border-indigo-500 transition-colors bg-gray-50/20 cursor-pointer text-gray-750"
            >
              <option value="All">Mission/Équipement : Tous</option>
              <optgroup label="Missions">
                {unifiedEquipments
                  .filter(eq => eq.id.startsWith('m-'))
                  .filter(eq => selectedCategory === 'All' || (eq.subCategory || 'CNS/ATM') === selectedCategory)
                  .map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.trigram} ({eq.subCategory === 'SE' ? 'Section électrique' : 'CNS/ATM'})
                    </option>
                  ))
                }
              </optgroup>
              <optgroup label="Équipements">
                {unifiedEquipments
                  .filter(eq => eq.id.startsWith('e-'))
                  .filter(eq => selectedCategory === 'All' || (eq.subCategory || 'CNS/ATM') === selectedCategory)
                  .map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.trigram} ({eq.subCategory === 'SE' ? 'Section électrique' : 'CNS/ATM'})
                    </option>
                  ))
                }
              </optgroup>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select 
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedEquipmentId('All'); // reset equipment filter if category changes
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-wider outline-none focus:border-indigo-500 transition-colors bg-gray-50/20 cursor-pointer text-gray-750"
            >
              <option value="All">Catégories : Toutes</option>
              <option value="CNS/ATM">CNS/ATM</option>
              <option value="SE">Section électrique</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400 gap-3">
            <RefreshCw size={36} className="animate-spin text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest">Chargement des interventions...</span>
          </div>
        ) : sortedInterventions.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Wrench size={36} className="text-gray-300" />
            <span className="text-xs font-black uppercase tracking-widest text-center">Aucune intervention trouvée</span>
            <p className="text-[11px] text-gray-400 font-bold max-w-sm text-center uppercase tracking-normal">Essayez de modifier vos critères de recherche ou de réinitialiser les filtres.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Semaine</th>
                  <th className="py-4 px-6">Agent</th>
                  <th className="py-4 px-6">Mission/Équipement</th>
                  <th className="py-4 px-6">Catégorie</th>
                  {canDelete && <th className="py-4 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedInterventions.map((item, index) => {
                  const agent = users.find(u => u.id === item.user_id);
                  const eq = (() => {
                    let found = unifiedEquipments.find(e => e.id === String(item.equipment_id));
                    if (!found) {
                      const legacyEq = MR_MGA_EQUIPMENTS.find(e => e.id === Number(item.equipment_id));
                      if (legacyEq) {
                        found = {
                          id: String(legacyEq.id),
                          trigram: legacyEq.trigram,
                          lastname: legacyEq.lastname,
                          subCategory: legacyEq.subCategory || 'CNS/ATM'
                        };
                      }
                    }
                    return found;
                  })();
                  const weekStr = getWeekNumber(item.date);
                  const weekNo = weekStr ? weekStr.split('-W')[1] : '';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-xs font-black text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-indigo-600" />
                          <span>{formatDateFr(item.date)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs font-mono font-black text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-gray-400" />
                          <span>{weekStr ? `S${weekNo}` : '-'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-700">
                            {agent?.trigram || '?'}
                          </div>
                          <div>
                            <div className="text-xs font-black text-gray-900">
                              {agent ? `${agent.firstname} ${agent.lastname}` : 'Inconnu'}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              MR-MGA Agent
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs font-black text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[10px] font-black">
                            {eq?.trigram || '?'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          (eq?.subCategory || 'CNS/ATM') === 'CNS/ATM' 
                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                            : 'bg-purple-50 text-purple-700 border-purple-100'
                        }`}>
                          {eq?.subCategory === 'SE' ? 'Section électrique' : (eq?.subCategory || 'CNS/ATM')}
                        </span>
                      </td>
                      {canDelete && (
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {deleteConfirmId === item.id ? (
                              <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 p-1 rounded-lg">
                                <span className="text-[9px] font-black text-red-700 uppercase px-1">Confirmer ?</span>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[9px] font-black uppercase transition-colors"
                                >
                                  Oui
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[9px] font-black uppercase transition-colors"
                                >
                                  Non
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-all"
                                title="Supprimer l'intervention"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
