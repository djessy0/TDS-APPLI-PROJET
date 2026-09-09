import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from '../types';
import { 
  Search, 
  Plus, 
  Trash2, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  User as UserIcon, 
  MessageSquare, 
  Briefcase,
  FileSpreadsheet,
  Check,
  Edit2,
  Upload,
  FileUp
} from 'lucide-react';

export interface DirectoryEntry {
  id: string;
  terrain: string;
  entity: string;
  contact: string;
  function: string;
  landline: string;
  mobile: string;
  email: string;
  comments: string;
}

export interface ParsedVCardContact {
  id: string;
  contact: string;
  entity: string;
  terrain: string;
  function: string;
  landline: string;
  mobile: string;
  email: string;
  comments: string;
  selected: boolean;
}

function formatPhone(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '');
  if (!digits) return val;
  const groups = digits.match(/.{1,2}/g);
  return groups ? groups.join(' ') : val;
}

export function parseVCFContent(vcfText: string): ParsedVCardContact[] {
  const cleanText = vcfText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const unfolded = cleanText.replace(/\n[ \t]/g, '');
  const cardBlocks = unfolded.split(/BEGIN:VCARD/i).slice(1);

  const results: ParsedVCardContact[] = [];

  cardBlocks.forEach((block, idx) => {
    const lines = block.split('\n');

    let fn = '';
    let lastName = '';
    let firstName = '';
    let org = '';
    let title = '';
    let role = '';
    let emails: string[] = [];
    let phones: { number: string; type: string }[] = [];
    let note = '';
    let adr = '';

    lines.forEach(rawLine => {
      let line = rawLine.trim();
      if (!line || line.toUpperCase().startsWith('END:VCARD')) return;

      if (line.includes('ENCODING=QUOTED-PRINTABLE') || line.includes('ENCODING=3DQUOTED-PRINTABLE')) {
        try {
          line = line.replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        } catch {
          // keep line as is
        }
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const propHeader = line.substring(0, colonIndex).toUpperCase();
      const propVal = line.substring(colonIndex + 1).trim();

      if (propHeader.startsWith('FN')) {
        fn = propVal;
      } else if (propHeader.startsWith('N')) {
        const parts = propVal.split(';');
        lastName = parts[0] ? parts[0].trim() : '';
        firstName = parts[1] ? parts[1].trim() : '';
      } else if (propHeader.startsWith('ORG')) {
        org = propVal.replace(/;/g, ' - ').trim();
      } else if (propHeader.startsWith('TITLE')) {
        title = propVal;
      } else if (propHeader.startsWith('ROLE')) {
        role = propVal;
      } else if (propHeader.startsWith('EMAIL')) {
        if (propVal) emails.push(propVal);
      } else if (propHeader.startsWith('TEL')) {
        if (propVal) phones.push({ number: propVal, type: propHeader });
      } else if (propHeader.startsWith('NOTE')) {
        note = propVal;
      } else if (propHeader.startsWith('ADR')) {
        adr = propVal.replace(/;/g, ' ').trim();
      }
    });

    let contactName = fn;
    if (!contactName) {
      contactName = [firstName, lastName].filter(Boolean).join(' ');
    }
    if (!contactName) {
      contactName = `Contact ${idx + 1}`;
    }

    const jobFunction = [title, role].filter(Boolean).join(' - ');

    let mobile = '';
    let landline = '';

    phones.forEach(p => {
      const isCell = p.type.includes('CELL') || p.type.includes('MOBILE') || p.type.includes('GSM');
      if (isCell) {
        if (!mobile) mobile = p.number;
      } else {
        if (!landline) landline = p.number;
        else if (!mobile) mobile = p.number;
      }
    });

    if (phones.length === 1 && !mobile && !landline) {
      const num = phones[0].number;
      const cleanNum = num.replace(/\D/g, '');
      if (cleanNum.startsWith('7') || cleanNum.startsWith('8') || cleanNum.startsWith('9') || cleanNum.startsWith('06') || cleanNum.startsWith('07')) {
        mobile = num;
      } else {
        landline = num;
      }
    }

    results.push({
      id: `vcf_${idx}_${Date.now()}`,
      contact: contactName,
      entity: org,
      terrain: '',
      function: jobFunction,
      landline: formatPhone(landline),
      mobile: formatPhone(mobile),
      email: emails[0] || '',
      comments: [note, adr].filter(Boolean).join(' | '),
      selected: true
    });
  });

  return results;
}

export function AnnuaireMR({ user }: { user?: User }) {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerrainFilter, setSelectedTerrainFilter] = useState<string | null>(null);
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string | null>(null);

  // Edit / Add state
  const [editingCell, setEditingCell] = useState<{ id: string; col: keyof DirectoryEntry } | null>(null);
  const [enteringCustomTerrainForId, setEnteringCustomTerrainForId] = useState<string | null>(null);
  const [enteringCustomEntityForId, setEnteringCustomEntityForId] = useState<string | null>(null);

  const isDSO = user?.trigram === 'DSO' || user?.role === 'admin';
  const isMRMGAAgent = user?.entity === 'MR-MGA' || isDSO;
  const canEdit = isMRMGAAgent;

  // Load directory entries from server
  const fetchEntries = () => {
    setLoading(true);
    fetch('/api/mr_directory')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEntries(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching mr_directory:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // Compute available Terrains & Entities for dropdowns (only from existing entries in directory)
  const availableTerrains = useMemo(() => {
    const fromEntries = entries.map(e => (e.terrain || '').trim()).filter(Boolean);
    const set = new Set(fromEntries);
    return Array.from(set);
  }, [entries]);

  const availableEntities = useMemo(() => {
    const fromEntries = entries.map(e => (e.entity || '').trim()).filter(Boolean);
    const set = new Set(fromEntries);
    return Array.from(set);
  }, [entries]);

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      // Terrain filter
      if (selectedTerrainFilter && item.terrain !== selectedTerrainFilter) {
        return false;
      }
      // Entity filter
      if (selectedEntityFilter && item.entity !== selectedEntityFilter) {
        return false;
      }
      // Rapid text search (contact, function, email, comments)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const contactMatch = (item.contact || '').toLowerCase().includes(q);
        const functionMatch = (item.function || '').toLowerCase().includes(q);
        const mailMatch = (item.email || '').toLowerCase().includes(q);
        const commentsMatch = (item.comments || '').toLowerCase().includes(q);
        const landlineMatch = (item.landline || '').toLowerCase().includes(q);
        const mobileMatch = (item.mobile || '').toLowerCase().includes(q);
        if (!contactMatch && !functionMatch && !mailMatch && !commentsMatch && !landlineMatch && !mobileMatch) {
          return false;
        }
      }
      return true;
    });
  }, [entries, selectedTerrainFilter, selectedEntityFilter, searchQuery]);

  // Add new contact
  const handleAddContact = () => {
    if (!canEdit) return;

    const initialTerrain = availableTerrains[0] || '';
    const initialEntity = availableEntities[0] || '';

    const newContact: Omit<DirectoryEntry, 'id'> = {
      terrain: initialTerrain,
      entity: initialEntity,
      contact: 'Nouveau Contact',
      function: '',
      landline: '',
      mobile: '',
      email: '',
      comments: ''
    };

    fetch('/api/mr_directory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newContact)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.id) {
          const created: DirectoryEntry = {
            id: String(resData.id),
            ...newContact
          };
          setEntries(prev => [...prev, created]);
          if (!initialTerrain) {
            setEnteringCustomTerrainForId(created.id);
          } else if (!initialEntity) {
            setEnteringCustomEntityForId(created.id);
          } else {
            setEditingCell({ id: created.id, col: 'contact' });
          }
        }
      })
      .catch(err => console.error("Error creating contact:", err));
  };

  // Update existing contact
  const handleUpdateContact = (id: string, col: keyof DirectoryEntry, val: string) => {
    if (!canEdit) return;

    let finalValue = val;
    if (col === 'landline' || col === 'mobile') {
      finalValue = formatPhone(val);
    }

    const currentItem = entries.find(e => e.id === id);
    if (!currentItem) return;

    const updatedItem = {
      ...currentItem,
      [col]: finalValue
    };

    // Optimistic UI update
    setEntries(prev => prev.map(e => e.id === id ? updatedItem : e));

    // Save to backend
    fetch('/api/mr_directory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedItem)
    }).catch(err => console.error("Error updating contact:", err));
  };

  // Delete contact
  const handleDeleteContact = (id: string) => {
    if (!canEdit) return;

    if (window.confirm("Voulez-vous vraiment supprimer ce contact de l'annuaire ?")) {
      fetch(`/api/mr_directory/${id}`, {
        method: 'DELETE'
      })
        .then(() => {
          setEntries(prev => prev.filter(e => e.id !== id));
        })
        .catch(err => console.error("Error deleting contact:", err));
    }
  };

  // VCF Import state
  const [vcfModalOpen, setVcfModalOpen] = useState(false);
  const [parsedVCards, setParsedVCards] = useState<ParsedVCardContact[]>([]);
  const [vcfFileName, setVcfFileName] = useState<string>('');
  const [isImportingVcf, setIsImportingVcf] = useState(false);
  const [defaultTerrainForVcf, setDefaultTerrainForVcf] = useState<string>('');
  const [defaultEntityForVcf, setDefaultEntityForVcf] = useState<string>('');
  const [enteringCustomDefaultTerrain, setEnteringCustomDefaultTerrain] = useState(false);
  const [enteringCustomDefaultEntity, setEnteringCustomDefaultEntity] = useState(false);
  const [enteringCustomTerrainForCardId, setEnteringCustomTerrainForCardId] = useState<string | null>(null);
  const [enteringCustomEntityForCardId, setEnteringCustomEntityForCardId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVcfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVcfFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const cards = parseVCFContent(text);
        if (cards.length === 0) {
          alert("Aucun contact valide n'a été trouvé dans ce fichier .vcf");
        } else {
          setParsedVCards(cards);
          setVcfModalOpen(true);
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleToggleSelectCard = (id: string) => {
    setParsedVCards(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const handleToggleSelectAllVCards = () => {
    const allSelected = parsedVCards.every(c => c.selected);
    setParsedVCards(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  };

  const handleApplyDefaultTerrain = (terrainVal: string) => {
    setDefaultTerrainForVcf(terrainVal);
    setParsedVCards(prev => prev.map(c => ({ ...c, terrain: terrainVal })));
  };

  const handleApplyDefaultEntity = (entityVal: string) => {
    setDefaultEntityForVcf(entityVal);
    setParsedVCards(prev => prev.map(c => ({ ...c, entity: entityVal })));
  };

  const handleUpdateParsedField = (id: string, field: keyof ParsedVCardContact, val: any) => {
    setParsedVCards(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const handleConfirmImportVCF = () => {
    const selectedCards = parsedVCards.filter(c => c.selected);
    if (selectedCards.length === 0) {
      alert("Veuillez sélectionner au moins un contact à importer.");
      return;
    }

    setIsImportingVcf(true);

    const itemsToInsert = selectedCards.map(c => ({
      terrain: c.terrain,
      entity: c.entity,
      contact: c.contact,
      function: c.function,
      landline: c.landline,
      mobile: c.mobile,
      email: c.email,
      comments: c.comments
    }));

    fetch('/api/mr_directory/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: itemsToInsert })
    })
      .then(res => res.json())
      .then(data => {
        setIsImportingVcf(false);
        if (data.success && Array.isArray(data.items)) {
          setEntries(data.items);
          setVcfModalOpen(false);
          setParsedVCards([]);
          alert(`${selectedCards.length} contact(s) importé(s) avec succès dans l'annuaire.`);
        } else {
          alert("Une erreur s'est produite lors de l'importation.");
        }
      })
      .catch(err => {
        setIsImportingVcf(false);
        console.error("Error bulk importing vcards:", err);
        alert("Erreur réseau ou serveur lors de l'importation.");
      });
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for VCF upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".vcf,.vcard" 
        onChange={handleVcfFileSelect} 
        className="hidden" 
      />

      {/* Title section */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black text-white rounded-2xl">
              <UserIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Annuaire MR</h2>
              <p className="text-xs text-gray-500 font-medium">Répertoire des contacts et intervenants par Terrain & Entité</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!canEdit && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              Lecture seule (Édition réservée aux agents MR-MGA)
            </span>
          )}

          {canEdit && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-gray-300 shadow-sm active:scale-95"
                title="Importer des contacts depuis un fichier vCard (.vcf)"
              >
                <FileUp size={16} className="text-gray-700" />
                <span>Importer VCF</span>
              </button>

              <button
                onClick={handleAddContact}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-gray-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                <Plus size={16} />
                <span>Nouveau Contact</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter banner */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rapid Search Input */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
              Recherche rapide :
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Contact, fonction, mail, téléphone..."
                className="w-full pl-10 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-black focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Terrain Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
              Filtrer par Terrain :
            </label>
            <select
              value={selectedTerrainFilter || ''}
              onChange={e => setSelectedTerrainFilter(e.target.value || null)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-black focus:bg-white transition-all"
            >
              <option value="">Tous les terrains ({entries.length})</option>
              {availableTerrains.map(t => {
                const count = entries.filter(e => e.terrain === t).length;
                return (
                  <option key={t} value={t}>
                    {t} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Entity Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
              Filtrer par Entité :
            </label>
            <select
              value={selectedEntityFilter || ''}
              onChange={e => setSelectedEntityFilter(e.target.value || null)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-black focus:bg-white transition-all"
            >
              <option value="">Toutes les entités ({entries.length})</option>
              {availableEntities.map(e => {
                const count = entries.filter(item => item.entity === e).length;
                return (
                  <option key={e} value={e}>
                    {e} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Active filters pill list */}
        {(selectedTerrainFilter || selectedEntityFilter || searchQuery) && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filtres actifs :</span>
            {selectedTerrainFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-white rounded-lg text-xs font-bold">
                Terrain: {selectedTerrainFilter}
                <button onClick={() => setSelectedTerrainFilter(null)} className="hover:text-amber-300">
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedEntityFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-white rounded-lg text-xs font-bold">
                Entité: {selectedEntityFilter}
                <button onClick={() => setSelectedEntityFilter(null)} className="hover:text-amber-300">
                  <X size={12} />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 text-white rounded-lg text-xs font-bold">
                Recherche: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-amber-300">
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedTerrainFilter(null);
                setSelectedEntityFilter(null);
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline ml-2"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3 px-3 w-[120px] max-w-[120px] text-center border-r border-gray-200">
                  <div className="flex items-center justify-center gap-1.5">
                    <MapPin size={13} className="text-gray-400" />
                    <span>Terrain</span>
                  </div>
                </th>
                <th className="py-3 px-2 w-[80px] max-w-[80px] text-center border-r border-gray-200">
                  <div className="flex items-center justify-center gap-1.5">
                    <Building2 size={13} className="text-gray-400" />
                    <span>Entité</span>
                  </div>
                </th>
                <th className="py-3 px-3 w-[180px] max-w-[180px] border-r border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <UserIcon size={13} className="text-gray-400" />
                    <span>Contact</span>
                  </div>
                </th>
                <th className="py-3 px-3 w-[160px] max-w-[160px] border-r border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={13} className="text-gray-400" />
                    <span>Fonction</span>
                  </div>
                </th>
                <th className="py-3 px-2 w-[110px] max-w-[110px] text-center border-r border-gray-200">
                  <div className="flex items-center justify-center gap-1.5">
                    <Phone size={13} className="text-gray-400" />
                    <span>Fixe</span>
                  </div>
                </th>
                <th className="py-3 px-2 w-[110px] max-w-[110px] text-center border-r border-gray-200">
                  <div className="flex items-center justify-center gap-1.5">
                    <Phone size={13} className="text-gray-400" />
                    <span>GSM</span>
                  </div>
                </th>
                <th className="py-3 px-3 w-[180px] max-w-[180px] border-r border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <Mail size={13} className="text-gray-400" />
                    <span>Mail</span>
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[150px]">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-gray-400" />
                    <span>Commentaires</span>
                  </div>
                </th>
                {canEdit && <th className="py-3 px-2 w-10 text-center"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} className="py-12 text-center text-gray-400 font-medium">
                    Chargement de l'annuaire...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} className="py-12 text-center text-gray-400 font-medium">
                    {entries.length === 0 ? "Aucun contact enregistré dans l'annuaire." : "Aucun contact ne correspond aux filtres."}
                  </td>
                </tr>
              ) : (
                filteredEntries.map(item => {
                  const isEditingTerrain = editingCell?.id === item.id && editingCell?.col === 'terrain';
                  const isEditingEntity = editingCell?.id === item.id && editingCell?.col === 'entity';
                  const isEditingContact = editingCell?.id === item.id && editingCell?.col === 'contact';
                  const isEditingFunction = editingCell?.id === item.id && editingCell?.col === 'function';
                  const isEditingLandline = editingCell?.id === item.id && editingCell?.col === 'landline';
                  const isEditingMobile = editingCell?.id === item.id && editingCell?.col === 'mobile';
                  const isEditingEmail = editingCell?.id === item.id && editingCell?.col === 'email';
                  const isEditingComments = editingCell?.id === item.id && editingCell?.col === 'comments';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                      {/* TERRAIN */}
                      <td className="py-2 px-2 border-r border-gray-200 text-center font-semibold text-gray-900">
                        {canEdit && (isEditingTerrain || enteringCustomTerrainForId === item.id) ? (
                          enteringCustomTerrainForId === item.id ? (
                            <input
                              type="text"
                              autoFocus
                              defaultValue={item.terrain}
                              onBlur={e => {
                                handleUpdateContact(item.id, 'terrain', e.target.value);
                                setEnteringCustomTerrainForId(null);
                                setEditingCell(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleUpdateContact(item.id, 'terrain', e.currentTarget.value);
                                  setEnteringCustomTerrainForId(null);
                                  setEditingCell(null);
                                }
                              }}
                              className="w-full px-2 py-1 border border-black rounded text-xs focus:outline-none bg-white text-center font-semibold"
                            />
                          ) : (
                            <select
                              autoFocus
                              value={item.terrain}
                              onChange={e => {
                                if (e.target.value === '__NEW__') {
                                  setEnteringCustomTerrainForId(item.id);
                                } else {
                                  handleUpdateContact(item.id, 'terrain', e.target.value);
                                  setEditingCell(null);
                                }
                              }}
                              onBlur={() => setEditingCell(null)}
                              className="w-full px-1 py-1 border border-black rounded text-xs focus:outline-none bg-white font-semibold text-center"
                            >
                              {!item.terrain && <option value="">-- Sélectionner --</option>}
                              {availableTerrains.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                              <option value="__NEW__">+ Nouveau terrain...</option>
                            </select>
                          )
                        ) : (
                          <div
                            onClick={() => canEdit && setEditingCell({ id: item.id, col: 'terrain' })}
                            className={`py-1 px-2 rounded hover:bg-gray-100 ${canEdit ? 'cursor-pointer' : ''}`}
                          >
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-bold text-[11px]">
                              {item.terrain || '-'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ENTITY */}
                      <td className="py-2 px-2 border-r border-gray-200 text-center font-bold text-gray-900">
                        {canEdit && (isEditingEntity || enteringCustomEntityForId === item.id) ? (
                          enteringCustomEntityForId === item.id ? (
                            <input
                              type="text"
                              autoFocus
                              defaultValue={item.entity}
                              onBlur={e => {
                                handleUpdateContact(item.id, 'entity', e.target.value);
                                setEnteringCustomEntityForId(null);
                                setEditingCell(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleUpdateContact(item.id, 'entity', e.currentTarget.value);
                                  setEnteringCustomEntityForId(null);
                                  setEditingCell(null);
                                }
                              }}
                              className="w-full px-2 py-1 border border-black rounded text-xs focus:outline-none bg-white text-center font-bold"
                            />
                          ) : (
                            <select
                              autoFocus
                              value={item.entity}
                              onChange={e => {
                                if (e.target.value === '__NEW__') {
                                  setEnteringCustomEntityForId(item.id);
                                } else {
                                  handleUpdateContact(item.id, 'entity', e.target.value);
                                  setEditingCell(null);
                                }
                              }}
                              onBlur={() => setEditingCell(null)}
                              className="w-full px-1 py-1 border border-black rounded text-xs focus:outline-none bg-white font-bold text-center"
                            >
                              {!item.entity && <option value="">-- Sélectionner --</option>}
                              {availableEntities.map(e => (
                                <option key={e} value={e}>{e}</option>
                              ))}
                              <option value="__NEW__">+ Nouvelle entité...</option>
                            </select>
                          )
                        ) : (
                          <div
                            onClick={() => canEdit && setEditingCell({ id: item.id, col: 'entity' })}
                            className={`py-1 px-1 rounded hover:bg-gray-100 ${canEdit ? 'cursor-pointer' : ''}`}
                          >
                            <span className="inline-block px-1.5 py-0.5 bg-black text-white rounded font-extrabold text-[10px]">
                              {item.entity || '-'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* CONTACT */}
                      <td className="py-2 px-3 border-r border-gray-200 font-bold text-gray-900">
                        {canEdit && isEditingContact ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={item.contact}
                            onBlur={e => {
                              handleUpdateContact(item.id, 'contact', e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleUpdateContact(item.id, 'contact', e.currentTarget.value);
                                setEditingCell(null);
                              }
                            }}
                            className="w-full px-2 py-1 border border-black rounded text-xs focus:outline-none bg-white font-bold"
                          />
                        ) : (
                          <div
                            onClick={() => canEdit && setEditingCell({ id: item.id, col: 'contact' })}
                            className={`py-1 px-1 rounded hover:bg-gray-100 ${canEdit ? 'cursor-pointer' : ''}`}
                          >
                            {item.contact || <span className="text-gray-300 italic">Non renseigné</span>}
                          </div>
                        )}
                      </td>

                      {/* FUNCTION */}
                      <td className="py-2 px-3 border-r border-gray-200 text-gray-700">
                        {canEdit && isEditingFunction ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={item.function}
                            onBlur={e => {
                              handleUpdateContact(item.id, 'function', e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleUpdateContact(item.id, 'function', e.currentTarget.value);
                                setEditingCell(null);
                              }
                            }}
                            className="w-full px-2 py-1 border border-black rounded text-xs focus:outline-none bg-white"
                          />
                        ) : (
                          <div
                            onClick={() => canEdit && setEditingCell({ id: item.id, col: 'function' })}
                            className={`py-1 px-1 rounded hover:bg-gray-100 ${canEdit ? 'cursor-pointer' : ''}`}
                          >
                            {item.function || <span className="text-gray-300 italic">-</span>}
                          </div>
                        )}
                      </td>

                      {/* FIXE */}
                      <td className="py-2 px-2 border-r border-gray-200 text-center font-mono text-gray-800">
                        {canEdit && isEditingLandline ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={item.landline}
                            onBlur={e => {
                              handleUpdateContact(item.id, 'landline', e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleUpdateContact(item.id, 'landline', e.currentTarget.value);
                                setEditingCell(null);
                              }
                            }}
                            className="w-full px-1 py-1 border border-black rounded text-xs text-center font-mono focus:outline-none bg-white"
                            placeholder="XX XX XX"
                          />
                        ) : (
                          <div
                            onClick={() => canEdit && setEditingCell({ id: item.id, col: 'landline' })}
                            className={`py-1 px-1 rounded hover:bg-gray-100 ${canEdit ? 'cursor-pointer' : ''}`}
                          >
                            {item.landline ? (
                              <a href={`tel:${item.landline.replace(/\s/g, '')}`} className="hover:underline hover:text-indigo-600">
                                {formatPhone(item.landline)}
                              </a>
                            ) : (
                              <span className="text-gray-300 italic">-</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* GSM */}
                      <td className="py-2 px-2 border-r border-gray-200 text-center font-mono text-gray-800 font-semibold">
                        {canEdit && isEditingMobile ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={item.mobile}
                            onBlur={e => {
                              handleUpdateContact(item.id, 'mobile', e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleUpdateContact(item.id, 'mobile', e.currentTarget.value);
                                setEditingCell(null);
                              }
                            }}
                            className="w-full px-1 py-1 border border-black rounded text-xs text-center font-mono focus:outline-none bg-white"
                            placeholder="XX XX XX"
                          />
                        ) : (
                          <div
                            onClick={() => canEdit && setEditingCell({ id: item.id, col: 'mobile' })}
                            className={`py-1 px-1 rounded hover:bg-gray-100 ${canEdit ? 'cursor-pointer' : ''}`}
                          >
                            {item.mobile ? (
                              <a href={`tel:${item.mobile.replace(/\s/g, '')}`} className="hover:underline hover:text-indigo-600">
                                {formatPhone(item.mobile)}
                              </a>
                            ) : (
                              <span className="text-gray-300 italic">-</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* MAIL */}
                      <td className="py-2 px-3 border-r border-gray-200 text-gray-800">
                        {canEdit && isEditingEmail ? (
                          <input
                            type="email"
                            autoFocus
                            defaultValue={item.email}
                            onBlur={e => {
                              handleUpdateContact(item.id, 'email', e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleUpdateContact(item.id, 'email', e.currentTarget.value);
                                setEditingCell(null);
                              }
                            }}
                            className="w-full px-2 py-1 border border-black rounded text-xs focus:outline-none bg-white"
                            placeholder="xx@xx.xx"
                          />
                        ) : (
                          <div
                            onClick={() => canEdit && setEditingCell({ id: item.id, col: 'email' })}
                            className={`py-1 px-1 rounded hover:bg-gray-100 ${canEdit ? 'cursor-pointer' : ''}`}
                          >
                            {item.email ? (
                              <a href={`mailto:${item.email}`} className="hover:underline text-indigo-600 font-medium truncate block max-w-[170px]">
                                {item.email}
                              </a>
                            ) : (
                              <span className="text-gray-300 italic">-</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* COMMENTS */}
                      <td className="py-2 px-3 text-gray-600">
                        {canEdit && isEditingComments ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={item.comments}
                            onBlur={e => {
                              handleUpdateContact(item.id, 'comments', e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleUpdateContact(item.id, 'comments', e.currentTarget.value);
                                setEditingCell(null);
                              }
                            }}
                            className="w-full px-2 py-1 border border-black rounded text-xs focus:outline-none bg-white"
                          />
                        ) : (
                          <div
                            onClick={() => canEdit && setEditingCell({ id: item.id, col: 'comments' })}
                            className={`py-1 px-1 rounded hover:bg-gray-100 ${canEdit ? 'cursor-pointer' : ''}`}
                          >
                            {item.comments || <span className="text-gray-300 italic">-</span>}
                          </div>
                        )}
                      </td>

                      {/* ACTIONS */}
                      {canEdit && (
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleDeleteContact(item.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Supprimer ce contact"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VCF IMPORT MODAL */}
      {vcfModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl">
                  <FileUp size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Aperçu de l'import VCF</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Fichier : <span className="font-bold text-gray-700">{vcfFileName}</span> — {parsedVCards.length} contact(s) extrait(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVcfModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Batch defaults bar */}
            <div className="p-4 bg-gray-100/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-gray-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold">Terrain par défaut :</span>
                  {enteringCustomDefaultTerrain ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nouveau terrain..."
                        value={defaultTerrainForVcf}
                        onChange={(e) => handleApplyDefaultTerrain(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-black rounded-lg text-xs font-bold text-gray-800 focus:outline-none w-36"
                      />
                      <button
                        onClick={() => setEnteringCustomDefaultTerrain(false)}
                        className="p-1 text-gray-500 hover:text-black"
                        title="Retour à la liste"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={defaultTerrainForVcf}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setEnteringCustomDefaultTerrain(true);
                        } else {
                          handleApplyDefaultTerrain(e.target.value);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black w-40"
                    >
                      <option value="">-- Choisir --</option>
                      {availableTerrains.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      {defaultTerrainForVcf && !availableTerrains.includes(defaultTerrainForVcf) && (
                        <option value={defaultTerrainForVcf}>{defaultTerrainForVcf}</option>
                      )}
                      <option value="__NEW__">+ Nouveau terrain...</option>
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold">Entité par défaut :</span>
                  {enteringCustomDefaultEntity ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nouvelle entité..."
                        value={defaultEntityForVcf}
                        onChange={(e) => handleApplyDefaultEntity(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-black rounded-lg text-xs font-bold text-gray-800 focus:outline-none w-36"
                      />
                      <button
                        onClick={() => setEnteringCustomDefaultEntity(false)}
                        className="p-1 text-gray-500 hover:text-black"
                        title="Retour à la liste"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={defaultEntityForVcf}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setEnteringCustomDefaultEntity(true);
                        } else {
                          handleApplyDefaultEntity(e.target.value);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black w-40"
                    >
                      <option value="">-- Choisir --</option>
                      {availableEntities.map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                      {defaultEntityForVcf && !availableEntities.includes(defaultEntityForVcf) && (
                        <option value={defaultEntityForVcf}>{defaultEntityForVcf}</option>
                      )}
                      <option value="__NEW__">+ Nouvelle entité...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSelectAllVCards}
                  className="px-3 py-1.5 bg-white hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 transition-colors"
                >
                  {parsedVCards.every(c => c.selected) ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
            </div>

            {/* Modal Body / Table preview */}
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-extrabold">
                    <th className="py-2 px-2 text-center w-10">
                      <input
                        type="checkbox"
                        checked={parsedVCards.length > 0 && parsedVCards.every(c => c.selected)}
                        onChange={handleToggleSelectAllVCards}
                        className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                      />
                    </th>
                    <th className="py-2 px-3">Contact</th>
                    <th className="py-2 px-3">Terrain</th>
                    <th className="py-2 px-3">Entité</th>
                    <th className="py-2 px-3">Fonction</th>
                    <th className="py-2 px-3">Fixe</th>
                    <th className="py-2 px-3">GSM</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Commentaires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedVCards.map((card) => (
                    <tr
                      key={card.id}
                      className={`hover:bg-gray-50/80 transition-colors ${!card.selected ? 'opacity-40 bg-gray-50' : ''}`}
                    >
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={card.selected}
                          onChange={() => handleToggleSelectCard(card.id)}
                          className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={card.contact}
                          onChange={e => handleUpdateParsedField(card.id, 'contact', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-bold text-gray-900 focus:border-black focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        {enteringCustomTerrainForCardId === card.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={card.terrain}
                            onChange={e => handleUpdateParsedField(card.id, 'terrain', e.target.value)}
                            onBlur={() => setEnteringCustomTerrainForCardId(null)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') setEnteringCustomTerrainForCardId(null);
                            }}
                            placeholder="Nouveau terrain"
                            className="w-full px-2 py-1 border border-black rounded text-xs font-semibold text-gray-800 focus:outline-none bg-white"
                          />
                        ) : (
                          <select
                            value={card.terrain}
                            onChange={e => {
                              if (e.target.value === '__NEW__') {
                                setEnteringCustomTerrainForCardId(card.id);
                              } else {
                                handleUpdateParsedField(card.id, 'terrain', e.target.value);
                              }
                            }}
                            className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs font-semibold text-gray-800 focus:border-black focus:outline-none bg-white"
                          >
                            <option value="">-- Aucun --</option>
                            {availableTerrains.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                            {card.terrain && !availableTerrains.includes(card.terrain) && (
                              <option value={card.terrain}>{card.terrain}</option>
                            )}
                            <option value="__NEW__">+ Nouveau...</option>
                          </select>
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        {enteringCustomEntityForCardId === card.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={card.entity}
                            onChange={e => handleUpdateParsedField(card.id, 'entity', e.target.value)}
                            onBlur={() => setEnteringCustomEntityForCardId(null)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') setEnteringCustomEntityForCardId(null);
                            }}
                            placeholder="Nouvelle entité"
                            className="w-full px-2 py-1 border border-black rounded text-xs font-semibold text-gray-800 focus:outline-none bg-white"
                          />
                        ) : (
                          <select
                            value={card.entity}
                            onChange={e => {
                              if (e.target.value === '__NEW__') {
                                setEnteringCustomEntityForCardId(card.id);
                              } else {
                                handleUpdateParsedField(card.id, 'entity', e.target.value);
                              }
                            }}
                            className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs font-semibold text-gray-800 focus:border-black focus:outline-none bg-white"
                          >
                            <option value="">-- Aucune --</option>
                            {availableEntities.map(e => (
                              <option key={e} value={e}>{e}</option>
                            ))}
                            {card.entity && !availableEntities.includes(card.entity) && (
                              <option value={card.entity}>{card.entity}</option>
                            )}
                            <option value="__NEW__">+ Nouvelle...</option>
                          </select>
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={card.function}
                          placeholder="Fonction"
                          onChange={e => handleUpdateParsedField(card.id, 'function', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:border-black focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={card.landline}
                          placeholder="Fixe"
                          onChange={e => handleUpdateParsedField(card.id, 'landline', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:border-black focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={card.mobile}
                          placeholder="GSM"
                          onChange={e => handleUpdateParsedField(card.id, 'mobile', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:border-black focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={card.email}
                          placeholder="Email"
                          onChange={e => handleUpdateParsedField(card.id, 'email', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:border-black focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={card.comments}
                          placeholder="Commentaires"
                          onChange={e => handleUpdateParsedField(card.id, 'comments', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:border-black focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-500 font-medium">
                <span className="font-bold text-gray-900">{parsedVCards.filter(c => c.selected).length}</span> sur {parsedVCards.length} contact(s) sélectionné(s)
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVcfModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImportVCF}
                  disabled={isImportingVcf || parsedVCards.filter(c => c.selected).length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  {isImportingVcf ? (
                    <span>Importation...</span>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Valider et importer ({parsedVCards.filter(c => c.selected).length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
