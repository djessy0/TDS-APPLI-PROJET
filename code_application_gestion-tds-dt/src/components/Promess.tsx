import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Info
} from 'lucide-react';
import { User } from '../types';

interface PromessRow {
  lastSemestrielle?: string;
  lastAnnuelle?: string;
  butee9Mois?: string;
  butee18Mois?: string;
  maintSemestrielle?: string;
  maintAnnuelle?: string;
}

interface PromessData {
  [equipment: string]: PromessRow;
}

const EQUIPMENTS = [
  "VOR MGA",
  "DME MGA",
  "NDB MG",
  "NDB MD",
  "NDB KO",
  "NDB IP",
  "NDB OA",
  "NDB MR",
  "NDB BL",
  "NDB LU",
  "NDB KQ"
];

const COLUMNS = [
  { key: 'lastAnnuelle' as const, label: 'Date annuelle N-1' },
  { key: 'butee9Mois' as const, label: 'Date butée 9 mois', isButee: true, months: 9, sourceKey: 'lastAnnuelle' as const },
  { key: 'butee18Mois' as const, label: 'Date butée 18 mois', isButee: true, months: 18, sourceKey: 'lastAnnuelle' as const },
  { key: 'maintSemestrielle' as const, label: 'Date maintenance semestrielle' },
  { key: 'maintAnnuelle' as const, label: 'Date maintenance annuelle' },
];

const addMonths = (dateStr: string, months: number): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

interface PromessProps {
  user?: User;
}

export function Promess({ user }: PromessProps) {
  const [data, setData] = useState<PromessData>({});
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [editingCell, setEditingCell] = useState<{ eq: string; col: keyof PromessRow } | null>(null);

  const isDavidSoulard = (u?: User) => {
    if (!u) return false;
    const trigram = (u.trigram || '').toUpperCase();
    const firstname = (u.firstname || '').toLowerCase();
    const lastname = (u.lastname || '').toLowerCase();
    return trigram === 'DSO' || 
           lastname === 'soulard' || 
           (firstname === 'david' && lastname === 'soulard') ||
           (firstname === 'chef' && lastname === 'dso');
  };

  const isMRMGAAgent = user?.entity === 'MR-MGA' || user?.role === 'admin';
  const canEdit = isDavidSoulard(user) && isMRMGAAgent;

  // Load from server on mount
  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);

    fetch('/api/promess')
      .then(res => res.json())
      .then((serverData: PromessData) => {
        // Enforce calculations
        EQUIPMENTS.forEach(eq => {
          const row = serverData[eq];
          if (row && row.lastAnnuelle) {
            row.butee9Mois = addMonths(row.lastAnnuelle, 9);
            row.butee18Mois = addMonths(row.lastAnnuelle, 18);
          }
        });
        setData(serverData);
      })
      .catch(err => console.error("Failed to fetch PROMESS data from server", err));
  }, []);

  const handleDateChange = (eq: string, col: keyof PromessRow, value: string) => {
    setData(prev => {
      const updatedRow = { ...(prev[eq] || {}), [col]: value };
      
      // Auto-calculate butée dates if the last annual date was updated
      if (col === 'lastAnnuelle') {
        if (value) {
          updatedRow.butee9Mois = addMonths(value, 9);
          updatedRow.butee18Mois = addMonths(value, 18);
        } else {
          updatedRow.butee9Mois = '';
          updatedRow.butee18Mois = '';
        }
      }

      // Save to server asynchronously
      fetch('/api/promess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment: eq, ...updatedRow })
      }).catch(err => console.error("Failed to save PROMESS row to server", err));

      return {
        ...prev,
        [eq]: updatedRow
      };
    });
  };

  const formatDateFr = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const getCellStatus = (buteeDateStr?: string, referenceDateStr?: string) => {
    if (!buteeDateStr) return 'empty';
    const buteeDate = new Date(buteeDateStr);
    if (isNaN(buteeDate.getTime())) return 'empty';
    
    let comparisonDate: Date;
    let hasDoneMaintenance = false;

    if (referenceDateStr) {
      const parsedRef = new Date(referenceDateStr);
      if (!isNaN(parsedRef.getTime())) {
        comparisonDate = parsedRef;
        hasDoneMaintenance = true;
      } else {
        comparisonDate = new Date(currentDate);
      }
    } else {
      comparisonDate = new Date(currentDate);
    }
    comparisonDate.setHours(0, 0, 0, 0);
    buteeDate.setHours(0, 0, 0, 0);

    const diffTime = buteeDate.getTime() - comparisonDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (hasDoneMaintenance) {
      if (diffDays >= 0) {
        return 'ok'; // Done in time -> Green/Blue
      } else {
        return 'overdue'; // Done late -> Red
      }
    } else {
      if (diffDays < 0) {
        return 'overdue'; // Red
      } else if (diffDays <= 60) {
        return 'warning'; // Orange (updated to 60 days)
      } else {
        return 'ok'; // Green/Blue
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title section */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-sky-50 rounded-2xl text-sky-600 border border-sky-100">
              <Database size={24} className="animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wider flex flex-wrap items-center gap-2">
              <span>PROMESS MR-MGA</span>
              {canEdit ? (
                <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold normal-case">
                  Administrateur (DSO)
                </span>
              ) : isMRMGAAgent ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold normal-case">
                  Agent MR-MGA (Lecture seule)
                </span>
              ) : (
                <span className="text-[10px] bg-gray-150 text-gray-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold normal-case">
                  Lecture seule
                </span>
              )}
            </h1>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            Suivi du respect des PROMESS
          </p>
        </div>
      </div>

      {/* Info Cards / KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-950">
              {EQUIPMENTS.reduce((count, eq) => {
                const row = data[eq];
                const isNdb = eq.startsWith('NDB') || eq.startsWith('NDK');
                const s9 = !isNdb && getCellStatus(row?.butee9Mois, row?.maintSemestrielle) === 'overdue';
                const s18 = getCellStatus(row?.butee18Mois, row?.maintAnnuelle) === 'overdue';
                return count + (s9 ? 1 : 0) + (s18 ? 1 : 0);
              }, 0)}
            </div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Maintenance en retard</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-950">
              {EQUIPMENTS.reduce((count, eq) => {
                const row = data[eq];
                const isNdb = eq.startsWith('NDB') || eq.startsWith('NDK');
                const s9 = !isNdb && getCellStatus(row?.butee9Mois, row?.maintSemestrielle) === 'warning';
                const s18 = getCellStatus(row?.butee18Mois, row?.maintAnnuelle) === 'warning';
                return count + (s9 ? 1 : 0) + (s18 ? 1 : 0);
              }, 0)}
            </div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Échéance proche (&lt; 60j)</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-950">
              {EQUIPMENTS.reduce((count, eq) => {
                const row = data[eq];
                const isNdb = eq.startsWith('NDB') || eq.startsWith('NDK');
                const s9 = !isNdb && getCellStatus(row?.butee9Mois, row?.maintSemestrielle) === 'ok';
                const s18 = getCellStatus(row?.butee18Mois, row?.maintAnnuelle) === 'ok';
                return count + (s9 ? 1 : 0) + (s18 ? 1 : 0);
              }, 0)}
            </div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Échéances valides</div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/70">
                <th className="py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-wider border-r border-gray-200">Équipement</th>
                {COLUMNS.map(col => (
                  <th key={col.key} className="py-4 px-4 text-xs font-black text-gray-600 uppercase tracking-wider text-center border-r border-gray-200 last:border-r-0">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EQUIPMENTS.map((eq) => {
                const row = data[eq] || {};
                return (
                  <tr key={eq} className="border-b border-gray-150 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-black text-gray-900 border-r border-gray-200 bg-gray-50/20">
                      {eq}
                    </td>
                    {COLUMNS.map(col => {
                      const value = row[col.key];
                      const isNdbEquipment = eq.startsWith('NDB') || eq.startsWith('NDK');
                      const isDisabled = isNdbEquipment && (col.key === 'butee9Mois' || col.key === 'maintSemestrielle');
                      const isEditing = canEdit && !isDisabled && editingCell?.eq === eq && editingCell?.col === col.key;
                      const status = col.isButee ? (
                        col.key === 'butee9Mois' ? getCellStatus(value, row.maintSemestrielle) : getCellStatus(value, row.maintAnnuelle)
                      ) : 'normal';

                      let cellBg = isDisabled ? 'bg-gray-100/80 cursor-not-allowed' : (canEdit ? 'hover:bg-gray-100/40 cursor-pointer' : '');
                      let textClass = isDisabled ? 'text-gray-400 font-medium italic' : 'text-gray-700 font-medium';

                      if (!isDisabled && col.isButee) {
                        if (status === 'overdue') {
                          cellBg = `bg-red-50 ${canEdit ? 'hover:bg-red-100/70 cursor-pointer' : ''}`;
                          textClass = 'text-red-700 font-extrabold';
                        } else if (status === 'warning') {
                          cellBg = `bg-amber-50 ${canEdit ? 'hover:bg-amber-100/70 cursor-pointer' : ''}`;
                          textClass = 'text-amber-700 font-extrabold';
                        } else if (status === 'ok') {
                          cellBg = `bg-emerald-50 ${canEdit ? 'hover:bg-emerald-100/70 cursor-pointer' : ''}`;
                          textClass = 'text-emerald-700 font-extrabold';
                        }
                      }

                      return (
                        <td
                          key={col.key}
                          onClick={() => {
                            if (canEdit && !isDisabled && !isEditing) {
                              setEditingCell({ eq, col: col.key });
                            }
                          }}
                          className={`py-3 px-4 text-center border-r border-gray-200 last:border-r-0 transition-all relative select-none min-w-[150px] ${cellBg}`}
                        >
                          {isEditing ? (
                            <input
                              type="date"
                              value={value || ''}
                              autoFocus
                              onChange={e => handleDateChange(eq, col.key, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="w-full px-2.5 py-1 text-xs font-semibold bg-white border-2 border-sky-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/10 shadow-sm text-center"
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 min-h-[28px]">
                              {isDisabled ? (
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider bg-gray-200/50 px-2 py-0.5 rounded-md">N/A</span>
                              ) : value ? (
                                <span className={`text-xs ${textClass}`}>{formatDateFr(value)}</span>
                              ) : (
                                <span className="text-gray-300 text-xs font-semibold">--/--/----</span>
                              )}
                              {!isDisabled && canEdit && <CalendarIcon size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                          )}

                          {/* Extra subtle badge for Butee alerts */}
                          {!isDisabled && col.isButee && value && !isEditing && (
                            <div className="absolute top-1 right-1">
                              {status === 'overdue' && (
                                <span className="flex h-1.5 w-1.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                </span>
                              )}
                              {status === 'warning' && (
                                <span className="flex h-1.5 w-1.5 relative">
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
