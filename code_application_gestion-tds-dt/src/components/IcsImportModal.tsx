import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Filter, 
  RefreshCw, 
  Info, 
  Check, 
  ArrowRight,
  Eye,
  Sliders
} from 'lucide-react';

export interface IcsImportItem {
  date: string; // YYYY-MM-DD
  dayName: string;
  isWeekend: boolean;
  events: string[];
  suggestedStatus: string;
  selectedStatus: string;
  comment: string;
  selected: boolean;
}

interface IcsImportModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

// Map of allowed statuses per entity
const ENTITY_STATUSES: Record<string, Array<{ code: string; label: string; colorClass: string }>> = {
  'Siège': [
    { code: 'PRE', label: 'PRE - Présent', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { code: 'TLT', label: 'TLT - Télétravail', colorClass: 'bg-blue-100 text-blue-800 border-blue-300' },
    { code: 'MIS', label: 'MIS - Mission', colorClass: 'bg-amber-100 text-amber-800 border-amber-300' },
    { code: 'CA', label: 'CA - Congés Annuels', colorClass: 'bg-purple-100 text-purple-800 border-purple-300' },
    { code: 'FOR', label: 'FOR - Formation', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { code: 'RTT', label: 'RTT - RTT', colorClass: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300' },
    { code: 'REC', label: 'REC - Récupération', colorClass: 'bg-teal-100 text-teal-800 border-teal-300' },
    { code: 'CET', label: 'CET - Compte Épargne Temps', colorClass: 'bg-pink-100 text-pink-800 border-pink-300' },
    { code: 'OFF', label: 'OFF - Repos / Non travaillé', colorClass: 'bg-gray-100 text-gray-700 border-gray-300' },
  ],
  'MR-MGA': [
    { code: 'TRV', label: 'TRV - Travail', colorClass: 'bg-green-100 text-green-800 border-green-300' },
    { code: 'TLT', label: 'TLT - Télétravail', colorClass: 'bg-blue-100 text-blue-800 border-blue-300' },
    { code: 'MIS', label: 'MIS - Mission', colorClass: 'bg-amber-100 text-amber-800 border-amber-300' },
    { code: 'FOR', label: 'FOR - Formation', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { code: 'EPI', label: 'EPI - Épidémie', colorClass: 'bg-orange-100 text-orange-800 border-orange-300' },
    { code: 'AE', label: 'AE - Auth. Explicite', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { code: 'EXC', label: 'EXC - Excusé', colorClass: 'bg-slate-100 text-slate-800 border-slate-300' },
    { code: 'CET', label: 'CET - CET', colorClass: 'bg-pink-100 text-pink-800 border-pink-300' },
    { code: 'ABS_V', label: 'ABS_V - Abs. Validée', colorClass: 'bg-rose-100 text-rose-800 border-rose-300' },
    { code: 'ABS_D', label: 'ABS_D - Abs. Demandée', colorClass: 'bg-rose-50 text-rose-600 border-rose-200' },
    { code: 'OFF', label: 'OFF - Jour OFF', colorClass: 'bg-gray-100 text-gray-700 border-gray-300' },
  ],
  'MR-TTA': [
    { code: 'SEC', label: 'SEC - Service', colorClass: 'bg-green-100 text-green-800 border-green-300' },
    { code: 'TLT', label: 'TLT - Télétravail', colorClass: 'bg-blue-100 text-blue-800 border-blue-300' },
    { code: 'MIS', label: 'MIS - Mission', colorClass: 'bg-amber-100 text-amber-800 border-amber-300' },
    { code: 'FOR', label: 'FOR - Formation', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { code: 'ABS_V', label: 'ABS_V - Abs. Validée', colorClass: 'bg-rose-100 text-rose-800 border-rose-300' },
    { code: 'ABS_D', label: 'ABS_D - Abs. Demandée', colorClass: 'bg-rose-50 text-rose-600 border-rose-200' },
    { code: 'OFF', label: 'OFF - Jour OFF', colorClass: 'bg-gray-100 text-gray-700 border-gray-300' },
  ]
};

// Timezone offset for Nouméa (GMT+11) in milliseconds
const GMT11_OFFSET_MS = 11 * 3600 * 1000;

// Unfold folded RFC5545 lines
function unfoldIcs(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

// Parse ICS date/time line and convert to GMT+11
function parseIcsDateTime(line: string): { dateStr: string; timeMs: number; isAllDay: boolean } | null {
  if (!line) return null;
  const isAllDay = line.includes('VALUE=DATE');
  const parts = line.split(':');
  const val = parts[parts.length - 1].trim();

  const match = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/);
  if (!match) return null;

  const yyyy = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10) - 1;
  const dd = parseInt(match[3], 10);
  const hh = match[4] ? parseInt(match[4], 10) : 0;
  const min = match[5] ? parseInt(match[5], 10) : 0;
  const ss = match[6] ? parseInt(match[6], 10) : 0;
  const isUtc = !!match[7];

  const linePrefix = line.substring(0, line.indexOf(':')).toUpperCase();

  if (isAllDay) {
    const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
    const timeMs = Date.UTC(yyyy, mm, dd, 0, 0, 0);
    return { dateStr, timeMs, isAllDay: true };
  }

  const utcMs = Date.UTC(yyyy, mm, dd, hh, min, ss);
  let gmt11Ms = utcMs;

  if (isUtc || linePrefix.includes('TZID=UTC') || linePrefix.includes('TZID=GMT')) {
    // Convert UTC to GMT+11 (+11 hours)
    gmt11Ms = utcMs + GMT11_OFFSET_MS;
  } else if (linePrefix.includes('TZID=EUROPE/PARIS') || linePrefix.includes('TZID=CET') || linePrefix.includes('TZID=ROMANCE')) {
    // Europe/Paris to GMT+11 (+9 hours)
    gmt11Ms = utcMs + (9 * 3600 * 1000);
  } else {
    // Local floating time or Pacific/Noumea (already GMT+11)
    gmt11Ms = Date.UTC(yyyy, mm, dd, hh, min, ss);
  }

  const d = new Date(gmt11Ms);
  const resY = d.getUTCFullYear();
  const resM = String(d.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(d.getUTCDate()).padStart(2, '0');
  const dateStr = `${resY}-${resM}-${resD}`;

  return { dateStr, timeMs: gmt11Ms, isAllDay: false };
}

// Format GMT+11 YYYY-MM-DD from timeMs
function formatGmt11DateStr(timeMs: number): string {
  const d = new Date(timeMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Detect best status from event fields
function inferStatus(
  summary: string,
  location: string,
  description: string,
  busyStatus: string,
  userEntity: string
): string {
  const combined = `${summary} ${location} ${description}`.toLowerCase();
  const bs = (busyStatus || '').toUpperCase();

  const availableCodes = (ENTITY_STATUSES[userEntity] || ENTITY_STATUSES['Siège']).map(s => s.code);
  const getValidCode = (preferred: string[], fallback: string) => {
    for (const code of preferred) {
      if (availableCodes.includes(code)) return code;
    }
    return fallback;
  };

  // 1. Télétravail / TT / Travail Ailleurs
  if (
    bs === 'WORKINGELSEWHERE' ||
    /\btt\b|teletravail|télétravail|travail ailleurs|travaille ailleurs|working elsewhere|working from home|\bwfh\b|\btlt\b|a domicile|à domicile|a la maison|à la maison/i.test(combined)
  ) {
    return getValidCode(['TLT'], availableCodes[0]);
  }

  // 2. RTT / ARTT / Absences / Congés
  if (
    bs === 'OOF' ||
    /\brtt\b|\bartt\b|conge|congé|\bca\b|vacances|absence|absent|out of office|repos|\boff\b|recuperation|récupération|\bcet\b/i.test(combined)
  ) {
    if (/\brtt\b|\bartt\b/i.test(combined)) {
      return getValidCode(['RTT', 'ABS_V', 'CA'], availableCodes[0]);
    }
    if (/\bcet\b/i.test(combined)) {
      return getValidCode(['CET', 'ABS_V', 'CA'], availableCodes[0]);
    }
    return getValidCode(['CA', 'ABS_V', 'RTT'], availableCodes[0]);
  }

  // 3. Mission
  if (
    /mission|déplacement|deplacement|\bmis\b|tontouta|la tontouta|nouméa|noumea|ouvéa|ouvea|maré|mare|lifou|koumac|poum|koné|kone|futu?na|wallis|voh/i.test(combined)
  ) {
    return getValidCode(['MIS'], availableCodes[0]);
  }

  // 4. Formation
  if (
    /formation|stage|\bfor\b|training|recyclage|e-learning|elearning|habilitation/i.test(combined)
  ) {
    return getValidCode(['FOR'], availableCodes[0]);
  }

  // Default entity presence
  if (userEntity === 'MR-MGA') return getValidCode(['TRV'], 'TRV');
  if (userEntity === 'MR-TTA') return getValidCode(['SEC'], 'SEC');
  return getValidCode(['PRE'], 'PRE');
}

export const IcsImportModal: React.FC<IcsImportModalProps> = ({
  user,
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [importItems, setImportItems] = useState<IcsImportItem[]>([]);
  const [overwrite, setOverwrite] = useState<boolean>(true);
  const [includeWeekends, setIncludeWeekends] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const userEntity = user?.entity || 'Siège';
  const availableStatuses = ENTITY_STATUSES[userEntity] || ENTITY_STATUSES['Siège'];

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        parseIcsContent(content);
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.ics') || file.type.includes('calendar'))) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setRawText(content);
          parseIcsContent(content);
        }
      };
      reader.readAsText(file);
    }
  };

  // Parse ICS string content into day items
  const parseIcsContent = (text: string) => {
    const unfolded = unfoldIcs(text);
    const vevents = unfolded.split('BEGIN:VEVENT');
    
    interface DayEventItem {
      summary: string;
      status: string;
      durationMins: number;
      isAllDay: boolean;
    }

    // Map date -> array of DayEventItem
    const dateMap: Record<string, DayEventItem[]> = {};

    for (let i = 1; i < vevents.length; i++) {
      const block = vevents[i].split('END:VEVENT')[0];
      const lines = block.split(/\r?\n/);

      let summary = '';
      let location = '';
      let description = '';
      let busyStatus = '';
      let dtstartLine = '';
      let dtendLine = '';

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('SUMMARY:') || trimmed.startsWith('SUMMARY;')) {
          summary = trimmed.substring(trimmed.indexOf(':') + 1).replace(/\\,/g, ',').replace(/\\;/g, ';');
        } else if (trimmed.startsWith('LOCATION:') || trimmed.startsWith('LOCATION;')) {
          location = trimmed.substring(trimmed.indexOf(':') + 1).replace(/\\,/g, ',').replace(/\\;/g, ';');
        } else if (trimmed.startsWith('DESCRIPTION:') || trimmed.startsWith('DESCRIPTION;')) {
          description = trimmed.substring(trimmed.indexOf(':') + 1).replace(/\\,/g, ',').replace(/\\n/g, ' ');
        } else if (trimmed.startsWith('X-MICROSOFT-CDO-BUSYSTATUS:')) {
          busyStatus = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        } else if (trimmed.startsWith('DTSTART')) {
          dtstartLine = trimmed;
        } else if (trimmed.startsWith('DTEND')) {
          dtendLine = trimmed;
        }
      });

      const parsedStart = parseIcsDateTime(dtstartLine);
      if (!parsedStart) continue;

      let parsedEnd = parseIcsDateTime(dtendLine);
      if (!parsedEnd) {
        if (parsedStart.isAllDay) {
          parsedEnd = parsedStart;
        } else {
          parsedEnd = {
            dateStr: parsedStart.dateStr,
            timeMs: parsedStart.timeMs + 3600 * 1000,
            isAllDay: false
          };
        }
      }

      const status = inferStatus(summary, location, description, busyStatus, userEntity);
      const eventLabel = summary ? summary.trim() : (busyStatus ? `Outlook: ${busyStatus}` : 'Événement Outlook');

      if (parsedStart.isAllDay) {
        let curMs = parsedStart.timeMs;
        let endMs = parsedEnd.timeMs;
        
        // RFC5545: DTEND for all-day is exclusive if endMs > curMs
        if (endMs > curMs) {
          endMs -= 24 * 3600 * 1000;
        }

        while (curMs <= endMs) {
          const dStr = formatGmt11DateStr(curMs);
          if (!dateMap[dStr]) dateMap[dStr] = [];
          dateMap[dStr].push({
            summary: eventLabel,
            status,
            durationMins: 480, // 8 hours
            isAllDay: true
          });
          curMs += 24 * 3600 * 1000;
        }
      } else {
        // Timed event
        const startMs = parsedStart.timeMs;
        const endMs = parsedEnd.timeMs;
        const totalMins = Math.max(0, Math.round((endMs - startMs) / 60000));

        if (parsedStart.dateStr === parsedEnd.dateStr) {
          const dStr = parsedStart.dateStr;
          if (!dateMap[dStr]) dateMap[dStr] = [];
          dateMap[dStr].push({
            summary: eventLabel,
            status,
            durationMins: totalMins,
            isAllDay: false
          });
        } else {
          // Multi-day timed event
          let curMs = startMs;
          while (curMs < endMs) {
            const curDStr = formatGmt11DateStr(curMs);
            const d = new Date(curMs);
            const nextDayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0);
            const segEndMs = Math.min(endMs, nextDayMs);
            const segMins = Math.max(0, Math.round((segEndMs - curMs) / 60000));

            if (segMins > 0) {
              if (!dateMap[curDStr]) dateMap[curDStr] = [];
              dateMap[curDStr].push({
                summary: eventLabel,
                status,
                durationMins: segMins,
                isAllDay: false
              });
            }
            curMs = nextDayMs;
          }
        }
      }
    }

    // Sort dates
    const sortedDates = Object.keys(dateMap).sort();

    // Default presence code for this entity
    const defaultPresenceCode = availableStatuses[0].code;

    // Priority rank for picking best status when multiple events occur
    const statusPriority = ['TLT', 'MIS', 'FOR', 'CA', 'RTT', 'CET', 'ABS_V', 'ABS_D', 'EPI', 'AE', 'EXC', 'REC', 'OFF', 'PRE', 'TRV', 'SEC'];

    const items: IcsImportItem[] = sortedDates.map(dateStr => {
      const dayEvents = dateMap[dateStr];
      const d = new Date(dateStr + 'T00:00:00');
      const dayNum = d.getDay();
      const isWeekend = dayNum === 0 || dayNum === 6;

      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const dayName = dayNames[dayNum];

      // Calculate total duration per status on this day
      const statusDurations: Record<string, number> = {};
      dayEvents.forEach(ev => {
        statusDurations[ev.status] = (statusDurations[ev.status] || 0) + ev.durationMins;
      });

      // Find statuses that have at least 180 minutes (3 hours)
      const validStatuses = Object.keys(statusDurations).filter(st => {
        return statusDurations[st] >= 180;
      });

      // Filter validStatuses to non-default presence if any exist
      const nonDefaultValidStatuses = validStatuses.filter(st => st !== defaultPresenceCode);

      let bestStatus = defaultPresenceCode;
      if (nonDefaultValidStatuses.length > 0) {
        let highestRank = 999;
        nonDefaultValidStatuses.forEach(st => {
          const rank = statusPriority.indexOf(st);
          if (rank !== -1 && rank < highestRank) {
            highestRank = rank;
            bestStatus = st;
          }
        });
      }

      // Build comment: ONLY include event labels if status is non-default and duration >= 180 mins (or allDay)
      let commentStr = '';
      if (bestStatus !== defaultPresenceCode) {
        // Find matching events for bestStatus that are >= 180 mins (or all-day)
        let relevantEvents = dayEvents.filter(ev => ev.status === bestStatus && (ev.durationMins >= 180 || ev.isAllDay));
        if (relevantEvents.length === 0) {
          // Fallback if combined duration was >= 180 mins
          relevantEvents = dayEvents.filter(ev => ev.status === bestStatus);
        }
        
        // Unique summaries
        const uniqueSummaries = Array.from(new Set(relevantEvents.map(ev => ev.summary)));
        commentStr = uniqueSummaries.join(' | ');
      }

      // Get list of all event summaries for display in table
      const allSummaries = Array.from(new Set(dayEvents.map(ev => ev.summary)));

      return {
        date: dateStr,
        dayName,
        isWeekend,
        events: allSummaries,
        suggestedStatus: bestStatus,
        selectedStatus: bestStatus,
        comment: commentStr.length > 120 ? commentStr.substring(0, 117) + '...' : commentStr,
        selected: !isWeekend // Default unselect weekends
      };
    });

    setImportItems(items);
  };

  // Toggle selection for weekend items
  const handleToggleIncludeWeekends = (val: boolean) => {
    setIncludeWeekends(val);
    setImportItems(prev => prev.map(item => ({
      ...item,
      selected: item.isWeekend ? val : item.selected
    })));
  };

  // Toggle all
  const handleSelectAll = (select: boolean) => {
    setImportItems(prev => prev.map(item => ({
      ...item,
      selected: select
    })));
  };

  // Change individual item status
  const handleItemStatusChange = (date: string, status: string) => {
    setImportItems(prev => prev.map(item => item.date === date ? { ...item, selectedStatus: status } : item));
  };

  // Change individual item comment
  const handleItemCommentChange = (date: string, comment: string) => {
    setImportItems(prev => prev.map(item => item.date === date ? { ...item, comment } : item));
  };

  // Toggle individual item check
  const handleItemToggle = (date: string) => {
    setImportItems(prev => prev.map(item => item.date === date ? { ...item, selected: !item.selected } : item));
  };

  // Filtered items view
  const displayedItems = useMemo(() => {
    return importItems.filter(item => {
      if (filterStatus !== 'ALL' && item.selectedStatus !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.date.includes(term) ||
          item.dayName.toLowerCase().includes(term) ||
          item.comment.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [importItems, filterStatus, searchTerm]);

  const selectedCount = importItems.filter(i => i.selected).length;

  // Submit import to server
  const handleSubmitImport = async () => {
    const selectedItems = importItems.filter(i => i.selected);
    if (selectedItems.length === 0) return;

    setIsLoading(true);
    try {
      const payload = {
        user_id: user?.id,
        overwrite,
        is_sandbox: false,
        entries: selectedItems.map(item => ({
          date: item.date,
          status: item.selectedStatus,
          comment: item.comment
        }))
      };

      const res = await fetch('/api/tds/import-ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onImportSuccess(data.count || selectedItems.length);
        onClose();
      } else {
        alert("Erreur lors de l'importation du fichier ICS.");
      }
    } catch (err) {
      console.error("Import error:", err);
      alert("Erreur réseau ou serveur lors de l'importation.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden transition-all">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 rounded-2xl border border-indigo-500/40 text-indigo-300">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide flex items-center gap-2">
                <span>Importer mon Agenda Outlook (.ics)</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest">
                  {userEntity}
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Convertissez automatiquement vos événements Outlook en statuts TDS (Télétravail, Missions, Congés)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* File Upload Zone if no items parsed yet */}
          {importItems.length === 0 ? (
            <div className="space-y-6">
              <div 
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 transition-all rounded-3xl p-10 text-center cursor-pointer flex flex-col items-center justify-center gap-4 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Upload size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Glissez-déposez votre fichier <span className="text-indigo-600">.ics</span> ici
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    ou cliquez sur le bouton ci-dessous pour choisir le fichier exporté depuis Outlook
                  </p>
                </div>
                <label className="cursor-pointer bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all inline-flex items-center gap-2">
                  <FileText size={18} />
                  <span>Sélectionner un fichier .ics</span>
                  <input 
                    type="file" 
                    accept=".ics,text/calendar" 
                    onChange={handleFileChange}
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Helpful Instructions */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Info size={18} className="text-indigo-600" />
                  <span>Comment obtenir votre fichier .ics depuis Outlook ?</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 font-medium pl-1">
                  <li>Ouvrez <strong>Microsoft Outlook</strong> (Application de bureau ou Web).</li>
                  <li>Allez dans la vue <strong>Calendrier</strong>.</li>
                  <li>Cliquez sur <strong>Fichier</strong> &gt; <strong>Enregistrer le calendrier</strong> (ou <strong>Partager / Exporter</strong>).</li>
                  <li>Choisissez la période souhaitée et enregistrez le fichier au format <strong>iCalendar (.ics)</strong>.</li>
                  <li>Chargez le fichier ci-dessus pour pré-visualiser et valider vos journées dans le TDS.</li>
                </ol>
              </div>
            </div>
          ) : (
            /* Parsed Items Preview & Validation */
            <div className="space-y-5">
              
              {/* Summary Stats & Options Banner */}
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-950">
                      {importItems.length} journées détectées dans {fileName || 'votre fichier'}
                    </p>
                    <p className="text-xs text-indigo-700 font-medium">
                      {selectedCount} jour(s) sélectionné(s) pour l'importation
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={overwrite} 
                      onChange={e => setOverwrite(e.target.checked)} 
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Écraser les statuts existants</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={includeWeekends} 
                      onChange={e => handleToggleIncludeWeekends(e.target.checked)} 
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Inclure les week-ends</span>
                  </label>

                  <button 
                    onClick={() => {
                      setImportItems([]);
                      setFileName('');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-bold ml-2"
                  >
                    <RefreshCw size={14} />
                    <span>Changer de fichier</span>
                  </button>
                </div>
              </div>

              {/* Table Controls (Search & Filter) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleSelectAll(true)} 
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors"
                  >
                    Tout cocher
                  </button>
                  <button 
                    onClick={() => handleSelectAll(false)} 
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors"
                  >
                    Tout décocher
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Filter size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">Tous les statuts ({importItems.length})</option>
                      {availableStatuses.map(s => (
                        <option key={s.code} value={s.code}>
                          {s.label} ({importItems.filter(i => i.selectedStatus === s.code).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  <input 
                    type="text"
                    placeholder="Rechercher une date ou événement..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input 
                            type="checkbox" 
                            checked={importItems.length > 0 && importItems.every(i => i.selected)}
                            onChange={e => handleSelectAll(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="p-3 w-36">Date</th>
                        <th className="p-3">Événement Outlook</th>
                        <th className="p-3 w-48">Statut TDS Déduit</th>
                        <th className="p-3">Commentaire (TDS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
                      {displayedItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400">
                            Aucun élément ne correspond aux filtres actuels.
                          </td>
                        </tr>
                      ) : (
                        displayedItems.map(item => {
                          const statusInfo = availableStatuses.find(s => s.code === item.selectedStatus) || {
                            code: item.selectedStatus,
                            label: item.selectedStatus,
                            colorClass: 'bg-gray-100 text-gray-800 border-gray-300'
                          };

                          return (
                            <tr 
                              key={item.date} 
                              className={`transition-colors hover:bg-slate-50/80 ${
                                item.selected ? 'bg-white' : 'bg-gray-50/60 opacity-60'
                              } ${item.isWeekend ? 'bg-amber-50/30' : ''}`}
                            >
                              <td className="p-3 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={item.selected} 
                                  onChange={() => handleItemToggle(item.date)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="p-3 whitespace-nowrap font-semibold">
                                <div className="flex items-center gap-1.5">
                                  <span>{item.dayName.substring(0, 3)}.</span>
                                  <span className="font-mono text-gray-900">{item.date.split('-').reverse().join('/')}</span>
                                  {item.isWeekend && (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">WE</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-gray-600">
                                <div className="max-w-xs truncate" title={item.events.join(' | ')}>
                                  {item.events.join(' | ') || <span className="italic text-gray-400">Occupé</span>}
                                </div>
                              </td>
                              <td className="p-3">
                                <select
                                  value={item.selectedStatus}
                                  onChange={e => handleItemStatusChange(item.date, e.target.value)}
                                  className={`w-full p-1.5 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer ${statusInfo.colorClass}`}
                                >
                                  {availableStatuses.map(s => (
                                    <option key={s.code} value={s.code}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3">
                                <input 
                                  type="text" 
                                  value={item.comment}
                                  onChange={e => handleItemCommentChange(item.date, e.target.value)}
                                  placeholder="Commentaire..."
                                  className="w-full p-1.5 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-indigo-500 bg-white"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>

          {importItems.length > 0 && (
            <button
              type="button"
              disabled={selectedCount === 0 || isLoading}
              onClick={handleSubmitImport}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Importation en cours...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Importer {selectedCount} jour(s) sélectionné(s)</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
