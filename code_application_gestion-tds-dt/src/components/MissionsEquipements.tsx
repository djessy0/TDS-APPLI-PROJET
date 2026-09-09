import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Compass, 
  Cpu, 
  X, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { User } from '../types';

export interface MgaMission {
  id: number;
  name: string;
  category: 'CNS/ATM' | 'SE';
  description: string;
}

export interface MgaEquipment {
  id: number;
  name: string;
  category: 'CNS/ATM' | 'SE';
  description: string;
}

interface Props {
  user?: User;
}

export function MissionsEquipements({ user }: Props) {
  const [missions, setMissions] = useState<MgaMission[]>([]);
  const [equipments, setEquipments] = useState<MgaEquipment[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [loadingEquipments, setLoadingEquipments] = useState(true);

  // Search terms
  const [missionSearch, setMissionSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');

  // Active filters
  const [missionCatFilter, setMissionCatFilter] = useState<'ALL' | 'CNS/ATM' | 'SE'>('ALL');
  const [equipmentCatFilter, setEquipmentCatFilter] = useState<'ALL' | 'CNS/ATM' | 'SE'>('ALL');

  // Modals state
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);

  // Active item for edit (null means create new)
  const [editingMission, setEditingMission] = useState<MgaMission | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<MgaEquipment | null>(null);

  // Form states
  const [missionForm, setMissionForm] = useState({ name: '', category: 'CNS/ATM' as 'CNS/ATM' | 'SE', description: '' });
  const [equipmentForm, setEquipmentForm] = useState({ name: '', category: 'CNS/ATM' as 'CNS/ATM' | 'SE', description: '' });

  // Permissions
  const isDSO = user?.trigram?.toUpperCase() === 'DSO';

  const fetchMissions = async () => {
    setLoadingMissions(true);
    try {
      const res = await fetch('/api/mga_missions');
      if (res.ok) {
        const data = await res.json();
        setMissions(data);
      }
    } catch (e) {
      console.error("[FETCH MISSIONS ERROR]", e);
    } finally {
      setLoadingMissions(false);
    }
  };

  const fetchEquipments = async () => {
    setLoadingEquipments(true);
    try {
      const res = await fetch('/api/mga_equipments');
      if (res.ok) {
        const data = await res.json();
        setEquipments(data);
      }
    } catch (e) {
      console.error("[FETCH EQUIPMENTS ERROR]", e);
    } finally {
      setLoadingEquipments(false);
    }
  };

  useEffect(() => {
    fetchMissions();
    fetchEquipments();
  }, []);

  // Save Mission
  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDSO) return;
    if (!missionForm.name.trim()) return;

    try {
      const body = editingMission 
        ? { id: editingMission.id, ...missionForm }
        : missionForm;

      const res = await fetch('/api/mga_missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowMissionModal(false);
        setEditingMission(null);
        setMissionForm({ name: '', category: 'CNS/ATM', description: '' });
        fetchMissions();
      }
    } catch (e) {
      console.error("[SAVE MISSION ERROR]", e);
    }
  };

  // Delete Mission
  const handleDeleteMission = async (id: number) => {
    if (!isDSO) return;
    if (!window.confirm("Voulez-vous vraiment supprimer cette mission ?")) return;

    try {
      const res = await fetch(`/api/mga_missions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchMissions();
      }
    } catch (e) {
      console.error("[DELETE MISSION ERROR]", e);
    }
  };

  // Save Equipment
  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDSO) return;
    if (!equipmentForm.name.trim()) return;

    try {
      const body = editingEquipment 
        ? { id: editingEquipment.id, ...equipmentForm }
        : equipmentForm;

      const res = await fetch('/api/mga_equipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowEquipmentModal(false);
        setEditingEquipment(null);
        setEquipmentForm({ name: '', category: 'CNS/ATM', description: '' });
        fetchEquipments();
      }
    } catch (e) {
      console.error("[SAVE EQUIPMENT ERROR]", e);
    }
  };

  // Delete Equipment
  const handleDeleteEquipment = async (id: number) => {
    if (!isDSO) return;
    if (!window.confirm("Voulez-vous vraiment supprimer cet équipement ?")) return;

    try {
      const res = await fetch(`/api/mga_equipments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchEquipments();
      }
    } catch (e) {
      console.error("[DELETE EQUIPMENT ERROR]", e);
    }
  };

  const openMissionModal = (mission?: MgaMission) => {
    if (!isDSO) return;
    if (mission) {
      setEditingMission(mission);
      setMissionForm({ name: mission.name, category: mission.category, description: mission.description || '' });
    } else {
      setEditingMission(null);
      setMissionForm({ name: '', category: 'CNS/ATM', description: '' });
    }
    setShowMissionModal(true);
  };

  const openEquipmentModal = (eq?: MgaEquipment) => {
    if (!isDSO) return;
    if (eq) {
      setEditingEquipment(eq);
      setEquipmentForm({ name: eq.name, category: eq.category, description: eq.description || '' });
    } else {
      setEditingEquipment(null);
      setEquipmentForm({ name: '', category: 'CNS/ATM', description: '' });
    }
    setShowEquipmentModal(true);
  };

  // Filters and searches
  const filteredMissions = missions.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(missionSearch.toLowerCase()) || 
                          (m.description || '').toLowerCase().includes(missionSearch.toLowerCase());
    const matchesCat = missionCatFilter === 'ALL' || m.category === missionCatFilter;
    return matchesSearch && matchesCat;
  });

  const filteredEquipments = equipments.filter(eq => {
    const matchesSearch = eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) || 
                          (eq.description || '').toLowerCase().includes(equipmentSearch.toLowerCase());
    const matchesCat = equipmentCatFilter === 'ALL' || eq.category === equipmentCatFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl">
            <Compass size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>Missions & Équipements</span>
              {isDSO ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-850 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold normal-case">
                  Éditeur (MR-MGA)
                </span>
              ) : (
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold normal-case">
                  Lecture seule
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Gestion et consultation des missions annuelles et des équipements de la MR-MGA.
            </p>
          </div>
        </div>
      </div>

      {/* Grid container with 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Missions (issues du tableau annuel) */}
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col h-[700px]">
          {/* Section Header */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Compass size={18} className="text-indigo-500" />
              <h2 className="font-extrabold text-gray-900 uppercase tracking-wide text-sm">
                Missions (Tableau Annuel MR-MGA)
              </h2>
            </div>
            {isDSO && (
              <button
                onClick={() => openMissionModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"
              >
                <Plus size={12} />
                Nouvelle Mission
              </button>
            )}
          </div>

          {/* Filters & Search */}
          <div className="p-4 border-b border-gray-100 bg-white space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={missionSearch}
                onChange={(e) => setMissionSearch(e.target.value)}
                placeholder="Rechercher une mission..."
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            {/* Category tabs */}
            <div className="flex gap-1">
              {(['ALL', 'CNS/ATM', 'SE'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setMissionCatFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    missionCatFilter === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-150 text-gray-600'
                  }`}
                >
                  {cat === 'ALL' ? 'Tous' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/20">
            {loadingMissions ? (
              <div className="flex justify-center items-center h-full text-gray-400 text-xs">
                Chargement des missions...
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                <Compass size={28} className="stroke-[1.5] mb-2 text-gray-300" />
                <span className="text-xs font-semibold">Aucune mission trouvée</span>
              </div>
            ) : (
              filteredMissions.map((m) => (
                <div key={m.id} className="p-3 bg-white border border-gray-150 rounded-xl hover:border-indigo-200 transition-all flex justify-between items-start group shadow-xs">
                  <div className="space-y-1.5 pr-4 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-extrabold text-sm text-gray-900 tracking-tight">{m.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-black tracking-wider uppercase ${
                        m.category === 'CNS/ATM' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {m.category}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-xs text-gray-500 font-medium whitespace-pre-wrap">{m.description}</p>
                    )}
                  </div>
                  {isDSO && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openMissionModal(m)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteMission(m.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Equipments (Saisie manuelle) */}
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col h-[700px]">
          {/* Section Header */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-emerald-500" />
              <h2 className="font-extrabold text-gray-900 uppercase tracking-wide text-sm">
                Équipements (Saisie Manuelle)
              </h2>
            </div>
            {isDSO && (
              <button
                onClick={() => openEquipmentModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"
              >
                <Plus size={12} />
                Nouvel Équipement
              </button>
            )}
          </div>

          {/* Filters & Search */}
          <div className="p-4 border-b border-gray-100 bg-white space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                placeholder="Rechercher un équipement..."
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            {/* Category tabs */}
            <div className="flex gap-1">
              {(['ALL', 'CNS/ATM', 'SE'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setEquipmentCatFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    equipmentCatFilter === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-150 text-gray-600'
                  }`}
                >
                  {cat === 'ALL' ? 'Tous' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/20">
            {loadingEquipments ? (
              <div className="flex justify-center items-center h-full text-gray-400 text-xs">
                Chargement des équipements...
              </div>
            ) : filteredEquipments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                <Cpu size={28} className="stroke-[1.5] mb-2 text-gray-300" />
                <span className="text-xs font-semibold">Aucun équipement trouvé</span>
              </div>
            ) : (
              filteredEquipments.map((eq) => (
                <div key={eq.id} className="p-3 bg-white border border-gray-150 rounded-xl hover:border-emerald-200 transition-all flex justify-between items-start group shadow-xs">
                  <div className="space-y-1.5 pr-4 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-extrabold text-sm text-gray-900 tracking-tight">{eq.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-black tracking-wider uppercase ${
                        eq.category === 'CNS/ATM' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {eq.category}
                      </span>
                    </div>
                    {eq.description && (
                      <p className="text-xs text-gray-500 font-medium whitespace-pre-wrap">{eq.description}</p>
                    )}
                  </div>
                  {isDSO && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEquipmentModal(eq)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteEquipment(eq.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Mission Modal */}
      {showMissionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-extrabold text-gray-900 uppercase tracking-wider text-sm flex items-center gap-2">
                <Compass size={16} className="text-indigo-600" />
                {editingMission ? "Modifier la Mission" : "Nouvelle Mission"}
              </h3>
              <button 
                onClick={() => setShowMissionModal(false)}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveMission} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Nom de la Mission *
                </label>
                <input
                  type="text"
                  required
                  value={missionForm.name}
                  onChange={(e) => setMissionForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: VOR MGA, WAM Lifou..."
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Catégorie
                </label>
                <select
                  value={missionForm.category}
                  onChange={(e) => setMissionForm(prev => ({ ...prev, category: e.target.value as 'CNS/ATM' | 'SE' }))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all bg-white"
                >
                  <option value="CNS/ATM">CNS/ATM</option>
                  <option value="SE">SE (Section Electrique)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Description / Détails
                </label>
                <textarea
                  value={missionForm.description}
                  onChange={(e) => setMissionForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Détails de la mission ou de l'équipement lié..."
                  rows={3}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMissionModal(false)}
                  className="px-4 py-2 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-extrabold text-gray-900 uppercase tracking-wider text-sm flex items-center gap-2">
                <Cpu size={16} className="text-emerald-600" />
                {editingEquipment ? "Modifier l'Équipement" : "Nouvel Équipement"}
              </h3>
              <button 
                onClick={() => setShowEquipmentModal(false)}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEquipment} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Nom de l'Équipement *
                </label>
                <input
                  type="text"
                  required
                  value={equipmentForm.name}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Climatisation, Alimentation, Onduleur..."
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Catégorie
                </label>
                <select
                  value={equipmentForm.category}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, category: e.target.value as 'CNS/ATM' | 'SE' }))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none transition-all bg-white"
                >
                  <option value="CNS/ATM">CNS/ATM</option>
                  <option value="SE">SE (Section Electrique)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Description / Spécifications
                </label>
                <textarea
                  value={equipmentForm.description}
                  onChange={(e) => setEquipmentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Détails techniques, localisation, périodicité..."
                  rows={3}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEquipmentModal(false)}
                  className="px-4 py-2 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
