import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, Entity, TDSEntry, Role, MarqueeMessage, ConnectionLog, TDSValidation } from './types';
import { Promess } from './components/Promess';
import { ProjectsTasks } from './components/ProjectsTasks';
import { AnnuaireMR } from './components/AnnuaireMR';
import { BilanAE } from './components/BilanAE';
import { MissionsEquipements } from './components/MissionsEquipements';
import { IcsImportModal } from './components/IcsImportModal';
import { 
  LayoutDashboard, 
  Calendar, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  FileText,
  FileUp,
  Download,
  Printer,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Trash2,
  Bell,
  ArrowUp,
  ArrowDown,
  GripVertical,
  HelpCircle,
  List,
  Clock,
  Search,
  BookOpen,
  MousePointer2,
  Info,
  Palette,
  Database,
  ArrowUpRight,
  Zap,
  RefreshCw,
  AlertCircle,
  Mail,
  Send,
  Users,
  Check,
  Save,
  LockOpen,
  Wrench,
  ClipboardList,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx';

const APP_VERSION = "TDS-1.8.13";
const APP_VERSION_DATE = "17-06-2026 à 16h48 locale";

// --- Helpers ---

const getPaques = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  const month = Math.floor(n / 31);
  const day = (n % 31) + 1;
  return new Date(year, month - 1, day);
};

const getNCHolidays = (year: number): Record<string, string> => {
  const holidays: Record<string, string> = {
    [`${year}-01-01`]: "Jour de l'An",
    [`${year}-05-01`]: "Fête du Travail",
    [`${year}-05-08`]: "Victoire 1945",
    [`${year}-07-14`]: "Fête Nationale",
    [`${year}-08-15`]: "Assomption",
    [`${year}-09-24`]: "Citoyenneté NC",
    [`${year}-11-01`]: "Toussaint",
    [`${year}-11-11`]: "Armistice 1918",
    [`${year}-12-25`]: "Noël",
  };

  const paques = getPaques(year);
  
  // Lundi de Pâques
  const lundiPaques = new Date(paques);
  lundiPaques.setDate(paques.getDate() + 1);
  holidays[formatDateLocal(lundiPaques)] = "Lundi de Pâques";

  // Ascension (Pâques + 39 jours)
  const ascension = new Date(paques);
  ascension.setDate(paques.getDate() + 39);
  holidays[formatDateLocal(ascension)] = "Ascension";

  // Lundi de Pentecôte (Pâques + 50 jours)
  const pentecote = new Date(paques);
  pentecote.setDate(paques.getDate() + 50);
  holidays[formatDateLocal(pentecote)] = "Lundi de Pentecôte";

  return holidays;
};

const formatDateLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getWeekStr = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const MR_MGA_EQUIPMENTS = [
  { id: -201, trigram: 'CEV', firstname: 'Équipement', lastname: 'CEV', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -202, trigram: 'VOR MGA', firstname: 'Équipement', lastname: 'VOR MGA', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -203, trigram: 'DME MGA', firstname: 'Équipement', lastname: 'DME MGA', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -204, trigram: 'NDB MG', firstname: 'Équipement', lastname: 'NDB MG', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -205, trigram: 'NDB MD', firstname: 'Équipement', lastname: 'NDB MD', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -206, trigram: 'NDB KO', firstname: 'Équipement', lastname: 'NDB KO', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -207, trigram: 'NDB IP', firstname: 'Équipement', lastname: 'NDB IP', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -208, trigram: 'NDB OA', firstname: 'Équipement', lastname: 'NDB OA', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -209, trigram: 'NDB MR', firstname: 'Équipement', lastname: 'NDB MR', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -210, trigram: 'NDB BL', firstname: 'Équipement', lastname: 'NDB BL', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -211, trigram: 'NDB LU', firstname: 'Équipement', lastname: 'NDB LU', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -212, trigram: 'NDB KQ', firstname: 'Équipement', lastname: 'NDB KQ', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -213, trigram: 'Mont-Dore', firstname: 'Équipement', lastname: 'Mont-Dore', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -214, trigram: 'Fréquences MGA', firstname: 'Équipement', lastname: 'Fréquences MGA', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -215, trigram: 'Gonio Tjibaou', firstname: 'Équipement', lastname: 'Gonio Tjibaou', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -216, trigram: 'Gonio Lifou', firstname: 'Équipement', lastname: 'Gonio Lifou', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -217, trigram: 'Tour Lifou', firstname: 'Équipement', lastname: 'Tour Lifou', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -218, trigram: 'AA Lifou', firstname: 'Équipement', lastname: 'AA Lifou', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -219, trigram: 'Koné', firstname: 'Équipement', lastname: 'Koné', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -220, trigram: 'CLEOPATRE', firstname: 'Équipement', lastname: 'CLEOPATRE', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -221, trigram: 'WAM Amédée', firstname: 'Équipement', lastname: 'WAM Amédée', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -222, trigram: 'WAM Montravel', firstname: 'Équipement', lastname: 'WAM Montravel', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -223, trigram: 'WAM Ouen', firstname: 'Équipement', lastname: 'WAM Ouen', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -224, trigram: 'WAM Lifou', firstname: 'Équipement', lastname: 'WAM Lifou', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -225, trigram: 'WAM Mont-Dore', firstname: 'Équipement', lastname: 'WAM Mont-Dore', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -226, trigram: 'WAM Ouvéa', firstname: 'Équipement', lastname: 'WAM Ouvéa', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -227, trigram: 'WAM Maré', firstname: 'Équipement', lastname: 'WAM Maré', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -228, trigram: 'WAM IdP', firstname: 'Équipement', lastname: 'WAM IdP', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -229, trigram: 'WAM Uéré', firstname: 'Équipement', lastname: 'WAM Uéré', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },
  { id: -230, trigram: 'TRESCAL', firstname: 'Équipement', lastname: 'TRESCAL', entity: 'MR-MGA', role: 'equipment', subCategory: 'CNS/ATM' },

  // Equipements SE
  { id: -301, trigram: 'Amédée', firstname: 'Équipement', lastname: 'Amédée (SE)', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -302, trigram: 'IdP', firstname: 'Équipement', lastname: 'IdP (SE)', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -303, trigram: 'Koné', firstname: 'Équipement', lastname: 'Koné (SE)', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -304, trigram: 'Koniambo', firstname: 'Équipement', lastname: 'Koniambo', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -305, trigram: 'Koumac', firstname: 'Équipement', lastname: 'Koumac', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -306, trigram: 'Lifou', firstname: 'Équipement', lastname: 'Lifou (SE)', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -307, trigram: 'Magenta-Alims', firstname: 'Équipement', lastname: 'Magenta-Alims', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -308, trigram: 'Magenta-IHM', firstname: 'Équipement', lastname: 'Magenta-IHM', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -309, trigram: 'Magenta-Solaire', firstname: 'Équipement', lastname: 'Magenta-Solaire', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -310, trigram: 'Maré', firstname: 'Équipement', lastname: 'Maré (SE)', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -311, trigram: 'Mont-Dore', firstname: 'Équipement', lastname: 'Mont-Dore (SE)', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -312, trigram: 'Ouen', firstname: 'Équipement', lastname: 'Ouen (SE)', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -313, trigram: 'Ouvéa', firstname: 'Équipement', lastname: 'Ouvéa (SE)', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -314, trigram: 'Touho', firstname: 'Équipement', lastname: 'Touho', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' },
  { id: -315, trigram: 'Uéré', firstname: 'Équipement', lastname: 'Uéré (SE)', entity: 'MR-MGA', role: 'equipment', subCategory: 'SE' }
];

export const getEquipmentTargetValue = (trigram: string, subCategory?: string): number => {
  if (subCategory === 'SE') {
    const seTargets: Record<string, number> = {
      'Amédée': 3, 'IdP': 3, 'Koné': 3, 'Koniambo': 2,
      'Koumac': 3, 'Lifou': 3, 'Magenta-Alims': 1, 'Magenta-IHM': 2,
      'Magenta-Solaire': 3, 'Maré': 3, 'Mont-Dore': 2, 'Ouen': 2,
      'Ouvéa': 3, 'Touho': 3, 'Uéré': 12
    };
    return seTargets[trigram] ?? 1;
  }
  const targets: Record<string, number> = {
    'CEV': 1, 'VOR MGA': 2, 'DME MGA': 2, 'DME GMA': 2,
    'NDB MG': 1, 'NDB MD': 1, 'NDB KO': 1, 'NDB IP': 1,
    'NDB OA': 1, 'NDB MR': 1, 'NDB BL': 1, 'NDB LU': 1,
    'NDB KQ': 1, 'Mont-Dore': 2, 'Fréquences MGA': 1,
    'Gonio Tjibaou': 2, 'Gonio Lifou': 2, 'Tour Lifou': 2,
    'AA Lifou': 2, 'Koné': 2, 'CLEOPATRE': 1, 'WAM Amédée': 1,
    'WAM Montravel': 1, 'WAM Ouen': 1, 'WAM Lifou': 1,
    'WAM Mont-Dore': 1, 'WAM Ouvéa': 1, 'WAM Maré': 1,
    'WAM IdP': 1, 'WAM Uéré': 1, 'TRESCAL': 1
  };
  return targets[trigram] ?? 1;
};

const formatTTAComment = (comment: string): string => {
  if (!comment) return '';
  const words = comment.replace(/\n/g, ' ').split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    if (word.length > 10) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      let remaining = word;
      while (remaining.length > 10) {
        lines.push(remaining.slice(0, 10));
        remaining = remaining.slice(10);
      }
      currentLine = remaining;
    } else {
      if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= 10) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 3).join('\n');
};

const getStatusColor = (status: string, isSandbox = false, entity?: string) => {
  switch(status) {
    // Équipements MR-MGA specific manual statuses
    case 'PRV': return 'bg-sky-500 text-white border-sky-600 font-bold'; // Prévision
    case 'ORG': return 'bg-amber-500 text-white border-amber-600 font-bold'; // Organisé
    case 'REA': return 'bg-emerald-500 text-white border-emerald-600 font-bold'; // Réalisé

    // Codes Hebdomadaires (TDS) - Darker and more readable
    case 'C': return 'bg-green-500 text-white border-green-600'; // Congé
    case 'P': return 'bg-sky-200 text-sky-900 border-sky-300'; // MS
    case 'S': return 'bg-sky-200 text-sky-950 border-sky-300'; // MO
    case 'W': return 'bg-orange-200 text-orange-900 border-orange-300'; // RIT WE
    case 'A': return 'bg-lime-200 text-lime-900 border-lime-300'; // RIT Après WE
    case 'F': return 'bg-violet-500 text-white border-violet-600'; // Formation
    case 'I': return 'bg-red-200 text-red-900 border-red-300'; // Indisponible
    case 'M': return 'bg-purple-200 text-purple-900 border-purple-300'; // Mission
    case 'Q': return 'bg-violet-200 text-violet-900 border-violet-300'; // RIT 7J
    case 'AE': return 'bg-pink-200 text-pink-900 border-pink-300 font-bold'; // Astreinte Électrique
    case 'MS': return 'bg-yellow-300 text-black border-yellow-400 font-bold'; // Maintenance Spécialisée
    case 'MO': return 'bg-[#BAE6FD] text-sky-950 border-sky-305 font-bold';
    case 'MO+RIT': return 'bg-[#ff9a55] text-black border-orange-400 font-bold';
    case 'MS+RIT': return 'bg-yellow-400 text-black border-yellow-500 font-black';
    
    // Sandbox MR-TTA specific cycles
    case '1': return 'bg-[#4FB6E1] text-white border-[#3fa6d1]';
    case '2': return 'bg-[#1B6486] text-white border-[#155476]';
    case '3': return 'bg-[#E77E31] text-white border-[#d76e21]';
    case 'Abs': return 'bg-gray-400 text-white border-gray-500 font-bold';
    case 'EPI': return 'bg-teal-200 text-teal-900 border-teal-300 font-bold';
    
    // Codes Quotidiens (Planning) - Darker and more readable
    case 'CA': return 'bg-[#00C950] text-white border-[#009e3f]'; // Congé
    case 'RTT': return 'bg-blue-100 text-blue-800 border-blue-200'; // RTT
    case 'REC': return 'bg-blue-50 text-blue-700 border-blue-100'; // REC
    case 'CET': return 'bg-cyan-50 text-cyan-700 border-cyan-100'; // CET
    case 'OFF': return 'bg-gray-200 text-gray-800 border-gray-400';
    case 'OFF+RIT': return 'bg-transparent text-black border-gray-400 font-bold';
    case 'PER': return 'bg-emerald-200 text-emerald-900 border-emerald-300'; // Permanence
    case 'RIT': return 'bg-[#E77E31] text-white border-[#d76e21] font-bold'; // Astreinte RIT (Using orange matching Cycle 3 branding!)
    case 'ASE': case 'AST': return 'bg-yellow-200 text-yellow-900 border-yellow-300'; // Astreinte
    case 'FOR': 
      if (entity === 'MR-TTA') {
        return 'bg-[#8E51FF] text-white border-[#8E51FF] font-bold';
      }
      return 'bg-indigo-200 text-indigo-900 border-indigo-300'; // Formation
    case 'SEC': case 'TRV': case 'PRE': return 'bg-green-200 text-green-900 border-green-300'; // Service
    case 'MIS': return 'bg-purple-200 text-purple-900 border-purple-300'; // Mission
    case 'TLT': return 'bg-cyan-200 text-cyan-900 border-cyan-300'; // Télétravail
    case 'ABS': case 'ABS_V': 
      if (entity === 'MR-TTA') {
        return 'bg-gray-300 text-gray-800 border-gray-400 font-bold';
      }
      return 'bg-rose-200 text-rose-900 border-rose-300'; // Absence Validée
    case 'ABS_D': 
      if (entity === 'MR-TTA') {
        return 'bg-gray-200 text-gray-700 border-gray-300 font-medium';
      }
      return 'bg-rose-100 text-rose-800 border-rose-200'; // Absence Demande
    case 'EXC': return 'bg-slate-200 text-slate-900 border-slate-300'; // Absence Exceptionnelle
    
    default: return 'bg-white text-gray-300 border-gray-200';
  }
};

const getPrintCellStyles = (status: string, borderColor?: string, isSandbox = false, entity?: string) => {
  const isOutlineOnly = false;

  if (isOutlineOnly) {
    const defaultColor = (s: string) => {
      switch (s) {
        case 'MS': return '#eab308';
        case 'MO': return '#f59e0b';
        case 'MO+RIT': return '#f97316';
        case 'MS+RIT': return '#ca8a04';
        case 'RIT': return '#eab308';
        default: return '#cbd5e1';
      }
    };
    const finalBorderColor = borderColor || defaultColor(status);
    return {
      style: {
        backgroundColor: '#ffffff',
        borderColor: finalBorderColor,
        borderWidth: '2.5px',
        borderStyle: 'solid',
        color: '#1f2937'
      }
    };
  }

  // If there is a cycle border color, use it as the background color (just like the BAS weekly views are colored)
  if (borderColor) {
    let textColor = '#000000';
    // Deep dark blue needs white text for contrast and accessibility
    if (borderColor === '#1B6486') {
      textColor = '#ffffff';
    } else if (borderColor === '#E77E31') {
      textColor = '#ffffff';
    } else if (borderColor === '#4FB6E1') {
      textColor = '#000000';
    }
    return {
      style: { backgroundColor: borderColor, color: textColor, border: '1px solid black' }
    };
  }

  // Otherwise, fallback to status based background colors
  let bg = '#ffffff';
  let text = '#1f2937';

  switch (status) {
    case 'C': bg = '#22c55e'; text = '#ffffff'; break;
    case 'P': bg = '#bae6fd'; text = '#0369a1'; break;
    case 'S': bg = '#fde68a'; text = '#78350f'; break;
    case 'W': bg = '#fed7aa'; text = '#c2410c'; break;
    case 'A': bg = '#d9f99d'; text = '#4d7c0f'; break;
    case 'F': bg = '#8b5cf6'; text = '#ffffff'; break;
    case 'I': bg = '#fecaca'; text = '#991b1b'; break;
    case 'M': bg = '#e9d5ff'; text = '#6b21a8'; break;
    case 'Q': bg = '#ddd6fe'; text = '#5b21b6'; break;
    case 'MS': bg = '#fde047'; text = '#000000'; break;
    case 'MO': bg = '#bae6fd'; text = '#78350f'; break;
    case 'MO+RIT':
      return {
        style: { background: 'linear-gradient(to bottom right, #BAE6FD 50%, #E77E31 50%)', color: '#000000', border: '1px solid black' }
      };
    case 'MS+RIT':
      return {
        style: { background: 'linear-gradient(to bottom right, #FFDF20 50%, #E77E31 50%)', color: '#000000', border: '1px solid black' }
      };
    case 'OFF+RIT':
      return {
        style: { background: 'linear-gradient(to bottom right, #ffffff 50%, #E77E31 50%)', color: '#000000', border: '1px solid #d76e21' }
      };
    
    // Sandbox MR-TTA specific cycle numbers
    case '1': bg = '#4FB6E1'; text = '#000000'; break;
    case '2': bg = '#1B6486'; text = '#ffffff'; break;
    case '3': bg = '#E77E31'; text = '#ffffff'; break;
    case 'Abs': bg = '#94a3b8'; text = '#ffffff'; break;
    case 'EPI': bg = '#99f6e4'; text = '#0f766e'; break;
    
    // Daily/planning codes
    case 'CA': bg = '#00C950'; text = '#ffffff'; break;
    case 'RTT': bg = '#dbeafe'; text = '#1e40af'; break;
    case 'REC': bg = '#eff6ff'; text = '#1d4ed8'; break;
    case 'CET': bg = '#ecfeff'; text = '#0e7490'; break;
    case 'OFF': bg = '#e5e7eb'; text = '#1f2937'; break;
    case 'PER': bg = '#a7f3d0'; text = '#064e3b'; break;
    case 'RIT': bg = '#E77E31'; text = '#ffffff'; break;
    case 'ASE': case 'AST': bg = '#fef08a'; text = '#713f12'; break;
    case 'AE': bg = '#fbcfe8'; text = '#831843'; break; // Astreinte Électrique
    case 'FOR': 
      if (entity === 'MR-TTA') {
        bg = '#8E51FF';
        text = '#ffffff';
      } else {
        bg = '#c7d2fe';
        text = '#3730a3';
      }
      break;
    case 'SEC': case 'TRV': case 'PRE': bg = '#bbf7d0'; text = '#15803d'; break;
    case 'MIS': bg = '#e9d5ff'; text = '#6b21a8'; break;
    case 'TLT': bg = '#a5f3fc'; text = '#0e7490'; break;
    case 'ABS': case 'ABS_V': 
      if (entity === 'MR-TTA') {
        bg = '#d1d5db'; text = '#1f2937';
      } else {
        bg = '#fecdd3'; text = '#9f1239';
      }
      break;
    case 'ABS_D': 
      if (entity === 'MR-TTA') {
        bg = '#e5e7eb'; text = '#374151';
      } else {
        bg = '#ffe4e6'; text = '#9f1239';
      }
      break;
    case 'EXC': bg = '#e2e8f0'; text = '#334155'; break;
  }

  return {
    style: { backgroundColor: bg, color: text, border: '1px solid black' }
  };
};

const getDayNameFr = (date: Date) => {
  const day = date.getDay();
  const mapping = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return mapping[day];
};

const getTDSDisplayStatus = (status: string, date: Date, entity: string) => {
  if (entity !== 'MR-TTA') {
    if (status === 'MS') return '';
    return status.startsWith('ABS_') ? 'ABS' : status;
  }

  const day = date.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  
  if (status === '1') {
    if (day === 1 || day === 2) return 'MO';
    if (day === 3 || day === 4) return '';
    return 'OFF';
  }
  if (status === '2') {
    if (day === 1) return 'OFF';
    if (day === 2) return '';
    if (day === 3 || day === 4) return 'MO';
    if (day === 5) return 'MO+RIT';
    return 'RIT';
  }
  if (status === '3') {
    if (day >= 1 && day <= 4) return 'MS+RIT';
    return 'OFF';
  }
  if (status === 'C' || status === 'CA' || status === 'F' || status === 'MS') return '';
  if (status === 'OFF+RIT') return 'OFF + RIT';
  
  return status.startsWith('ABS_') ? 'ABS' : status;
};

const getOverrideStyleForHebdoCell = (status: string, border_color: string | undefined, date: Date, entity: string) => {
  if (entity !== 'MR-TTA') return null;
  
  // Identify if Cycle 1, 2, or 3
  const isCycle1 = status === '1' || border_color === '#4FB6E1';
  const isCycle2 = status === '2' || border_color === '#1B6486';
  
  const displayStatus = getTDSDisplayStatus(status, date, entity);
  
  if (isCycle1) {
    if (displayStatus === '') {
      // empty cases of color #4FB6E1 -> #FFDF20
      return {
        backgroundColor: '#FFDF20',
        borderColor: '#FFDF20',
        color: '#000000'
      };
    }
  }
  
  if (isCycle2) {
    if (displayStatus === '') {
      // empty cases of color #1B6486 -> #FFDF20
      return {
        backgroundColor: '#FFDF20',
        borderColor: '#FFDF20',
        color: '#000000'
      };
    }
    if (displayStatus === 'RIT') {
      // RIT cases of color #1B6486 -> #E77E31
      return {
        backgroundColor: '#E77E31',
        borderColor: '#E77E31',
        color: '#ffffff'
      };
    }
  }
  
  return null;
};

const getYearlyDisplayStatus = (status: string, entity: string) => {
  if (entity === 'MR-TTA' && ['1', '2', '3', 'C', 'F', 'MS'].includes(status)) {
    return '';
  }
  return status.startsWith('ABS_') ? 'ABS' : status;
};

const resolveActiveLeaves = (allDayLeaves: any[]) => {
  if (allDayLeaves.length <= 1) return allDayLeaves;
  const getRank = (status: string) => {
    switch (status) {
      case 'approved_dt': return 3;
      case 'approved_chef': return 2;
      case 'pending': return 1;
      default: return 0;
    }
  };
  const sorted = [...allDayLeaves].sort((a, b) => getRank(b.status) - getRank(a.status));
  return [sorted[0]];
};

const getStatusList = (entity: Entity) => {
  if (entity === 'MR-TTA') {
    return [
      { code: 'SEC', label: 'Section', description: 'Service en section technique' },
      { code: '1', label: 'Cycle 1', description: 'Lundi, Mardi en MO / Mercredi, Jeudi en MS' },
      { code: '2', label: 'Cycle 2', description: 'Mardi en MS / Mercredi, Jeudi, Vendredi en MO / RIT' },
      { code: '3', label: 'Cycle 3', description: 'Lundi à Jeudi MS + RIT' },
      { code: 'MS', label: 'De service', description: 'De service' },
      { code: 'MO', label: 'MO', description: 'Maintenance Opérationnelle' },
      { code: 'OFF', label: 'Jour OFF', description: 'Jour de repos ou chômé' },
      { code: 'CA', label: 'Congés', description: 'Congés Annuels' },
      { code: 'RTT', label: 'RTT', description: 'Réduction du Temps de Travail' },
      { code: 'REC', label: 'Récupération', description: 'Récupération d\'heures' },
      { code: 'FOR', label: 'Formation', description: 'Formation professionnelle' },
      { code: 'RIT', label: 'Astreinte', description: 'Réserve d\'Intervention Technique' },
      { code: 'OFF+RIT', label: 'OFF + RIT', description: 'Jour OFF + Astreinte RIT' },
      { code: 'MS+RIT', label: 'MS + RIT', description: 'Maintenance Spécialisée + Astreinte RIT' },
      { code: 'MO+RIT', label: 'MO + RIT', description: 'Maintenance Opérationnelle + Astreinte RIT' },
      { code: 'MIS', label: 'Mission', description: 'Mission extérieure' },
      { code: 'TLT', label: 'Télétravail', description: 'Travail à distance' },
      { code: 'ABS', label: 'Absence', description: 'Absence diverse' },
      { code: 'AE', label: 'Astreinte Élec.', description: 'Astreinte Électrique' },
    ];
  }
  if (entity === 'MR-MGA') {
    return [
      { code: 'TRV', label: 'Travail', description: 'Service normal' },
      { code: 'OFF', label: 'Jour OFF', description: 'Jour de repos ou chômé' },
      { code: 'TLT', label: 'Télétravail', description: 'Travail à distance' },
      { code: 'CET', label: 'CET', description: 'Compte Épargne Temps' },
      { code: 'ABS_D', label: 'Absence (Demande)', description: 'Demande d\'absence en cours' },
      { code: 'ABS_V', label: 'Absence (Validé)', description: 'Absence validée' },
      { code: 'EXC', label: 'Abs. Exceptionnelle', description: 'Absence exceptionnelle' },
      { code: 'FOR', label: 'Formation', description: 'Formation professionnelle' },
      { code: 'MIS', label: 'Mission', description: 'Mission extérieure' },
      { code: 'AE', label: 'Astreinte Élec.', description: 'Astreinte Électrique' },
      { code: 'EPI', label: 'EPI', description: 'EPI' },
    ];
  }
  return [
    { code: 'PRE', label: 'Présence', description: 'Présence au siège' },
    { code: 'MIS', label: 'Mission', description: 'Mission extérieure' },
    { code: 'TLT', label: 'Télétravail', description: 'Travail à distance' },
    { code: 'CA', label: 'Congés', description: 'Congés Annuels' },
    { code: 'CET', label: 'CET', description: 'Compte Épargne Temps' },
    { code: 'RTT', label: 'RTT', description: 'Réduction du Temps de Travail' },
    { code: 'REC', label: 'Récupération', description: 'Récupération d\'heures' },
    { code: 'FOR', label: 'Formation', description: 'Formation professionnelle' },
    { code: 'ABS', label: 'Absence', description: 'Absence diverse' },
  ];
};

const translateUpdate = (summary: string, details: string) => {
  return { summary: summary || '', details: details || '' };
};

const _unused_translateUpdate = (summary: string, details: string) => {
  let frSummary = summary || '';
  let frDetails = details || '';

  const summaryMap: Record<string, string> = {
    "chore(i18n): update translation map for commit history": "chore(i18n) : mise à jour du dictionnaire de traduction pour le journal des mises à jour",
    "chore(i18n) : update translation map for commit history": "chore(i18n) : mise à jour du dictionnaire de traduction pour le journal des mises à jour",
    "feat: add circuit breaker for Gemini translation": "feat : ajout d'un coupe-circuit pour la traduction Gemini",
    "feat : add circuit breaker for Gemini translation": "feat : ajout d'un coupe-circuit pour la traduction Gemini",
    "refactor: improve update date logic and cleanup": "refactor : amélioration de la logique des dates de mise à jour et nettoyage",
    "refactor : improve update date logic and cleanup": "refactor : amélioration de la logique des dates de mise à jour et nettoyage",
    "chore: improve commit message translation parsing": "chore : amélioration du traitement des traductions de messages de commits",
    "chore : improve commit message translation parsing": "chore : amélioration du traitement des traductions de messages de commits",
    "feat: add Gemini translation and dynamic versioning": "feat : intégration de l'API Gemini et versionnage dynamique",
    "feat : add Gemini translation and dynamic versioning": "feat : intégration de l'API Gemini et versionnage dynamique",
    "fix: adjust comment styling for MR-MGA entity": "fix : ajustement du style des commentaires pour l'entité MR-MGA",
    "fix : adjust comment styling for MR-MGA entity": "fix : ajustement du style des commentaires pour l'entité MR-MGA",
    "fix: adjust legend layout for MR-MGA in print mode": "fix : ajustement de la disposition de la légende pour MR-MGA à l'impression",
    "fix : adjust legend layout for MR-MGA in print mode": "fix : ajustement de la disposition de la légende pour MR-MGA à l'impression",
    "feat(ui): display status label in tooltip for MR-MGA": "feat(ui) : affichage du libellé de statut dans l'infobulle pour MR-MGA",
    "feat(ui) : display status label in tooltip for MR-MGA": "feat(ui) : affichage du libellé de statut dans l'infobulle pour MR-MGA",
    "refactor: simplify status priority logic": "refactor : simplification de la logique de priorité des statuts",
    "refactor : simplify status priority logic": "refactor : simplification de la logique de priorité des statuts",
    "fix(shifts): exclude weekends from weekly entry counts": "fix(shifts) : exclusion des week-ends des totaux d'entrées hebdomadaires",
    "fix(shifts) : exclude weekends from weekly entry counts": "fix(shifts) : exclusion des week-ends des totaux d'entrées hebdomadaires",
    "fix: update display logic for MR-MGA off-days": "fix : mise à jour de la logique d'affichage des jours de repos de MR-MGA",
    "fix : update display logic for MR-MGA off-days": "fix : mise à jour de la logique d'affichage des jours de repos de MR-MGA",
    "feat: add EPI status and update auto-fill logic": "feat : ajout du statut EPI et mise à jour des priorités de remplissage",
    "feat : add EPI status and update auto-fill logic": "feat : ajout du statut EPI et mise à jour des priorités de remplissage",
    "feat: add automated expiry alerts and UI styling": "feat : alertes d'expiration automatiques et mise en style de l'IHM",
    "feat : add automated expiry alerts and UI styling": "feat : alertes d'expiration automatiques et mise en style de l'IHM",
    "refactor: fix synthesized status logic in App.tsx": "refactor : correction de la logique de synthèse des statuts dans App.tsx",
    "refactor : fix synthesized status logic in App.tsx": "refactor : correction de la logique de synthèse des statuts dans App.tsx",
    "refactor: remove redundant weekly entry cleanup": "refactor : nettoyage de la suppression redondante des entrées de semaine",
    "refactor : remove redundant weekly entry cleanup": "refactor : nettoyage de la suppression redondante des entrées de semaine",
    "fix: clear database entries for empty weekly status": "fix : nettoyage en base des entrées pour les statuts hebdomadaires vides",
    "fix : clear database entries for empty weekly status": "fix : nettoyage en base des entrées pour les statuts hebdomadaires vides",
    "fix: restrict weekly entry matching for MR-MGA": "fix : restriction de la correspondance d'entrée hebdomadaire pour MR-MGA",
    "fix : restrict weekly entry matching for MR-MGA": "fix : restriction de la correspondance d'entrée hebdomadaire pour MR-MGA",
    "feat(mail): implement email workflow and template management": "feat(mail) : intégration du flux d'e-mails et de la gestion des modèles",
    "feat(mail) : implement email workflow and template management": "feat(mail) : intégration du flux d'e-mails et de la gestion des modèles",
    "fix: adjust trigram header sizing for MR-TTA print": "fix : ajustement de la taille de l'en-tête du trigramme à l'impression pour MR-TTA",
    "fix : adjust trigram header sizing for MR-TTA print": "fix : ajustement de la taille de l'en-tête du trigramme à l'impression pour MR-TTA",
    "style: increase font size for MR-TTA trigrams": "style : agrandissement de la police des trigrammes de MR-TTA",
    "style : increase font size for MR-TTA trigrams": "style : agrandissement de la police des trigrammes de MR-TTA",
    "style(ui): update absence colors for MR-TTA entity": "style(ui) : couleurs d'absences mises à jour pour MR-TTA",
    "style(ui) : update absence colors for MR-TTA entity": "style(ui) : couleurs d'absences mises à jour pour MR-TTA",
    "fix: hide comments for MR-TTA entity in service display": "fix : masquage des commentaires pour MR-TTA dans l'affichage du service",
    "fix : hide comments for MR-TTA entity in service display": "fix : masquage des commentaires pour MR-TTA dans l'affichage du service",
    "fix(ui): prevent comment display for MR-TTA entity": "fix(ui) : blocage de l'affichage des commentaires pour MR-TTA",
    "fix(ui) : prevent comment display for MR-TTA entity": "fix(ui) : blocage de l'affichage des commentaires pour MR-TTA",
    "feat: apply specific style for FOR in MR-TTA": "feat : style spécifique appliqué au statut FOR pour MR-TTA",
    "feat : apply specific style for FOR in MR-TTA": "feat : style spécifique appliqué au statut FOR pour MR-TTA",
    "fix(ui): adjust font sizes for MR-TTA print layout": "fix(ui) : ajustement des tailles de police pour la mise en page de MR-TTA",
    "fix(ui) : adjust font sizes for MR-TTA print layout": "fix(ui) : ajustement des tailles de police pour la mise en page de MR-TTA",
    "feat(ui): enhance MR-TTA header layout": "feat(ui) : amélioration de la mise en page de l'en-tête de MR-TTA",
    "feat(ui) : enhance MR-TTA header layout": "feat(ui) : amélioration de la mise en page de l'en-tête de MR-TTA",
    "feat: add bulk annual MGA update functionality": "feat : fonction de mise à jour annuelle groupée pour MGA",
    "feat : add bulk annual MGA update functionality": "feat : fonction de mise à jour annuelle groupée pour MGA",
    "refactor(email): remove inline styles from email template": "refactor(email) : suppression des styles en ligne dans le modèle d'e-mail",
    "refactor(email) : remove inline styles from email template": "refactor(email) : suppression des styles en ligne dans le modèle d'e-mail",
    "style: update MR-MGA week separator styling": "style : mise à jour du style des séparateurs de semaine de MR-MGA",
    "style : update MR-MGA week separator styling": "style : mise à jour du style des séparateurs de semaine de MR-MGA",
    "feat(ui): add weekly separator for MR-MGA entity": "feat(ui) : séparateurs de semaine ajoutés pour MR-MGA",
    "feat(ui) : add weekly separator for MR-MGA entity": "feat(ui) : séparateurs de semaine ajoutés pour MR-MGA",
    "refactor: remove conditional border styling in table": "refactor : suppression des styles de bordure de cellule du tableau",
    "refactor : remove conditional border styling in table": "refactor : suppression des styles de bordure de cellule du tableau",
    "feat: add support for Siège entity status mapping": "feat : ajouter le support pour le mappage des statuts pour l'entité Siège",
    "feat : add support for Siège entity status mapping": "feat : ajouter le support pour le mappage des statuts pour l'entité Siège",
    "fix: update email action link paths": "fix : mise à jour des chemins des liens d'action par e-mail",
    "fix : update email action link paths": "fix : mise à jour des chemins des liens d'action par e-mail",
    "chore(i18n): update commit message translation map": "chore(i18n) : mise à jour du dictionnaire de traduction pour le journal des mises à jour",
    "chore(i18n) : update commit message translation map": "chore(i18n) : mise à jour du dictionnaire de traduction pour le journal des mises à jour",

    // Existing / Older ones
    "style: update MO color and add new service codes": "style : mise à jour de la couleur MO et ajout de nouveaux codes de service",
    "style : update MO color and add new service codes": "style : mise à jour de la couleur MO et ajout de nouveaux codes de service",
    "feat: add custom status legend for MR-MGA entity": "feat : ajouter une légende de statuts personnalisée pour l'entité MR-MGA",
    "feat : add custom status legend for MR-MGA entity": "feat : ajouter une légende de statuts personnalisée pour l'entité MR-MGA",
    "feat: allow MR-MGA entity to use simplified entry lookup": "feat : permettre à l'entité MR-MGA d'utiliser la recherche simplifiée des saisies",
    "feat : allow MR-MGA entity to use simplified entry lookup": "feat : permettre à l'entité MR-MGA d'utiliser la recherche simplifiée des saisies",
    "feat: initial commit": "feat : premier commit (initialisation)",
    "feat : initial commit": "feat : premier commit (initialisation)",
    "initial commit": "initialisation du projet",
    "feat : add dynamic expiry status indicator": "feat : ajout d'un indicateur dynamique du statut d'expiration",
    "feat: add dynamic expiry status indicator": "feat : ajout d'un indicateur dynamique du statut d'expiration",
    "feat(ui): optimize schedule popover positioning": "feat(ui) : optimiser le positionnement de l'infobulle du planning",
    "feat(ui) : optimize schedule popover positioning": "feat(ui) : optimiser le positionnement de l'infobulle du planning",
    "feat : improve hover visibility for schedule cells": "feat : améliorer la visibilité au survol des cellules du planning",
    "feat: improve hover visibility for schedule cells": "feat : améliorer la visibilité au survol des cellules du planning",
    "docs: add MR-MGA business rules and update version": "docs : ajout des règles de gestion MR-MGA et mise à jour de la version",
    "docs : add MR-MGA business rules and update version": "docs : ajout des règles de gestion MR-MGA et mise à jour de la version",
    "fix(ui): adjust tooltip position for cell hover": "fix(ui) : ajuster la position de l'infobulle au survol des cellules",
    "fix(ui) : adjust tooltip position for cell hover": "fix(ui) : ajuster la position de l'infobulle au survol des cellules",
    "refactor: extract getSiegeWeekDetails logic": "refactor : extraire la logique de getSiegeWeekDetails",
    "refactor : extract getSiegeWeekDetails logic": "refactor : extraire la logique de getSiegeWeekDetails"
  };

  const detailsMap: Record<string, string> = {
    "Add new entries to the translation dictionary to support recent localization updates for documentation, UI fixes, and refactoring tasks.":
      "Ajouter de nouvelles entrées au dictionnaire de traduction pour prendre en charge les récentes mises à jour de localisation pour la documentation, les correctifs d'interface utilisateur et les tâches de refactorisation.",
    "Disable Gemini API calls automatically when encountering invalid API key errors to prevent repeated failed requests and ensure fallback to dictionary-based translation.":
      "Désactiver automatiquement les appels à l'API Gemini en cas d'erreurs de clé d'API non valide afin d'éviter la répétition des requêtes échouées et assurer le basculement vers la traduction du dictionnaire.",
    "Sort app updates by ID to ensure the latest version is identified.\n- Enhance date parsing robustness with manual fallback formats.\n- Remove redundant translation logic in the server.":
      "Trier les mises à jour par ID pour identifier la dernière version.\n- Renforcer la lecture des dates par des formats de secours.\n- Retirer les traitements de traduction superflus côté serveur.",
    "Update regex patterns to support flexible spacing around colons and parentheses, and add new mappings to the translation dictionary to improve support for commit log localization.":
      "Mettre à jour les expressions régulières pour accepter des espacements souples autour des deux-points et parenthèses, et enrichir le dictionnaire pour la localisation du journal des modifications.",
    "Integrate Google Gemini API for automated French translation of commit messages.\n- Implement dynamic version and date display in the UI based on repository updates.\n- Update GitHub repository configuration.\n- Document specific business logic rules for MR-MGA in AGENTS.md.":
      "Intégrer l'API Google Gemini pour la traduction automatique en français des messages de commits.\n- Mettre en œuvre l'affichage dynamique de la version et de sa date dans l'IHM selon l'historique.\n- Configurer l'accès au dépôt GitHub.\n- Spécifier les règles métier de MR-MGA dans AGENTS.md.",
    "Update comment display formatting to improve readability for the MR-MGA entity by enabling word wrapping and adjusting font sizing.":
      "Ajuster le rendu visuel des commentaires de MR-MGA pour faciliter leur lecture en activant le retour à la ligne et en calibrant la taille des de polices de caractères.",
    "Hide the legend column for MR-MGA when printing to optimize document space and layout.":
      "Masquer la section de légende pour les agents MR-MGA lors de l'impression afin d'utiliser au mieux l'espace disponible de la page imprimée.",
    "Enhance the tooltip functionality for MR-MGA entries to show the status label alongside the optional comment, improving readability and information clarity.":
      "Enrichir le contenu des infobulles annuelles de MR-MGA pour afficher la description complète et officielle du statut en plus de l'éventuel commentaire enregistré.",
    "Replace manual conditional checks with an ordered array lookup to improve maintainability and readability of status priority assignment.":
      "Rationaliser la recherche des priorités de statuts par une indexation ordonnée dans un tableau plutôt que par une série de conditions manuelles imbriquées.",
    "Update entry filtering logic to ignore Saturdays and Sundays when calculating weekly totals for users.":
      "Ajuster le décompte d'activité hebdomadaire de MR-MGA pour filtrer et exclure systématiquement les week-ends (samedis et dimanches) de la somme de présences.",
    "Adjust the display conditions for 'OFF' statuses in MR-MGA to ensure consistent rendering within the service schedule.":
      "Harmoniser les conditions de rendu graphique du code 'OFF' au sein du tableau de service hebdomadaire de l'entité MR-MGA.",
    "Include EPI in the status list and refine the auto-fill priority rankings to support a wider range of statuses for MGA scheduling.":
      "Intégrer le code EPI dans le barème des présences et mettre au point l'ordre d'auto-remplissage pour gérer une plus grande panoplie de statuts de l'entité MGA.",
    "Implement database tracking for professional title expiry alerts and update the UI with color-coded status indicators to improve monitoring of upcoming deadlines.":
      "Développer le suivi en base de données pour les dates d'expiration des habilitations et titres professionnels, et ajouter des jalons colorés au planning pour signaler les dates d'échéances critiques.",
    "Adjust the scope of status synthesis to ensure current saved entries are processed correctly even when no valid daily counts exist.":
      "Ajuster le calcul de synthèse de statut pour veiller à valoriser les saisies enregistrées même si aucun relevé journalier n'est rattaché.",
    "Remove logic that explicitly clears weekly entries when no valid status is provided, as it is no longer required for the current state management.":
      "Retirer le processus de purge explicite des données de semaine d'un agent si aucun statut n'est en cours, pour correspondre au nouveau cycle d'état.",
    "Ensure that when no valid status is provided for a week, any existing entry in the database is cleared to maintain data consistency.":
      "Garantir la cohérence des données en effaçant l'enregistrement d'une semaine en base de données des entrées de l'agent si aucun statut n'est affecté.",
    "Exclude weekly entry fallback logic for MR-MGA users to ensure correct daily entry resolution in the service schedule.":
      "Désactiver la logique de secours hebdomadaire par défaut pour l'entité MR-MGA de sorte à prioriser la saisie journalière dans le planning de service.",
    "Added backend mail routing logic for operational/test modes and created a configuration interface in the admin panel to customize mail templates, subjects, and recipients.":
      "Ajouter une couche d'envoi et de routage des courriels (e-mails) sous forme opérationnelle ou bac à sable, et intégrer un panneau d'administration pour configurer les modèles et listes d'expédition.",
    "Update CSS and header classes to ensure correct font sizing for MR-TTA entities during print operations.":
      "Corriger l'affichage CSS et les éléments d'en-tête pour avoir des gabarits de textes optimaux à l'impression pour la division MR-TTA.",
    "Adjust the print text size for MR-TTA trigram headers to improve readability in printed reports.":
      "Modifier l'échelle typographique des en-têtes de trigrammes pour MR-TTA pour bonifier la lisibilité sur support papier.",
    "Apply specific gray-themed styling for absence statuses (ABS, ABS_V, ABS_D) when the entity is set to MR-TTA.":
      "Appliquer des couleurs grises caractéristiques aux différents types de congés et d'absences spécifiques à l'entité TTA.",
    "Disable comment tooltips and indicators for the MR-TTA entity to align with specific display requirements.":
      "Masquer tous les drapeaux d'indicateurs et les textes de commentaires pour MR-TTA selon ses politiques de confidentialité de données.",
    "Restricts the visibility of entry comments specifically for the MR-TTA entity in the service table display.":
      "Empêcher formellement la lecture ou l'affichage de commentaires d'entrées pour les structures opérationnelles de l'entité TTA.",
    "Update getStatusColor to handle entity-specific styling, using a distinct color for Formation (FOR) when the entity is MR-TTA.":
      "Attribuer une coloration jaune orangée unique au code Formation FOR spécifiquement pour le personnel MR-TTA.",
    "Standardize print font sizes and improve text readability for the MR-TTA entity by increasing font scale in print mode.":
      "Homogénéiser et agrandir les polices à l'impression pour le planning d'affectation hebdomadaire de l'entité MR-TTA.",
    "Update the print header for MR-TTA to improve readability by highlighting the week number in a dedicated badge and restructuring the date display.":
      "Embellir et réouvrir l'en-tête d'impression de MR-TTA, en plaçant le numéro de la semaine dans une étiquette visuelle bien identifiée.",
    "Implement server-side endpoint and client-side logic to automatically populate and update annual TDS entries for the MGA division based on defined status priorities.":
      "Créer un point d'accès côté serveur pour remplir et recalculer automatiquement toutes les entrées de l'année pour les équipes MGA en appliquant la grille des priorités.",
    "Clean up email HTML template by removing unused inline CSS styles to improve code maintainability.":
      "Supprimer les styles CSS superflus et épurations d'e-mails pour simplifier l'intégration technique.",
    "Improve visual distinction for MR-MGA week separators by updating background and border styles.":
      "Donner un meilleur aspect de démarcation pour les discontinuités de semaine de MR-MGA en redessinant les bordures.",
    "Extend the weekly separator display logic to include MR-MGA and apply specific styling for better visual distinction.":
      "Appliquer l'affichage du séparateur de semaines pour la commission MR-MGA pour faciliter la lecture rythmique.",
    "Clean up the table cell rendering by removing the specific MR-MGA weekend styling to maintain a consistent UI across all entities.":
      "Supprimer la surcharge de bordure de week-end pour l'entité MR-MGA afin de standardiser le look général des tableaux de service.",
    "Move weekly schedule calculation logic to a dedicated function to improve maintainability and handle daily versus weekly entry resolution for the Siege entity.":
      "Déplacer la logique de calcul du planning hebdomadaire dans une fonction isolée afin d'assurer la séparation des rôles et de mieux arbitrer entre saisies journalières et hebdomadaires de l'entité Siège.",
    "Update status resolution logic to correctly handle Siège-specific codes (CA/FOR) and update the repository.":
      "Mettre à jour la résolution de statuts pour la prise en charge correcte des types de codes propres à l'entité Siège comme Congés Annuels (CA) et Formation (FOR).",
    "Standardize email redirection paths to root-based URLs to ensure consistent navigation within the application.":
      "Standardiser les chemins de redirection des e-mails vers des URL basées sur la racine afin de garantir une navigation cohérente au sein de l'application.",
    "Expand the translation dictionary to include recent feature, fix, and refactor commit messages for better UI localization.":
      "Enrichir le dictionnaire de traduction pour inclure les récents messages de commit (fonctionnalités, corrections et refactorisations) afin d'améliorer la localisation de l'interface utilisateur.",

    // Existing ones
    "Adjust the color for MO code and register Abs and EPI service codes to improve visual clarity and coverage in the service schedule.": 
      "Ajuster la couleur du code MO et enregistrer les codes de service Abs et EPI pour améliorer la clarté visuelle et la couverture dans le planning de service.",
    "Define a specific status legend for the MR-MGA entity to accurately reflect its work patterns and types of absence, separating it from the logic used for other entities.": 
      "Définir une légende de statut spécifique pour l'entité MR-MGA afin de refléter fidèlement ses rythmes de travail et types d'absence, en la séparant de la logique utilisée pour les autres entités.",
    "Update getWeekEntry to support MR-MGA entity logic, ensuring consistent entry retrieval for agents in that department.": 
      "Mettre à jour getWeekEntry pour prendre en charge la logique de l'entité MR-MGA, garantissant une récupération de données cohérente pour les agents de ce service.",
    "Implement renderExpiryCell to display color-coded visual alerts for qualification expiration dates, improving visibility of critical deadlines.":
      "Implémenter l'affichage dynamique d'alertes visuelles colorées pour les dates d'expiration des qualifications, améliorant ainsi la visibilité des échéances critiques.",
    "Adjust popover display logic to prevent overflow by detecting when rows are near the bottom of the container.":
      "Ajuster la logique d'affichage des infobulles/popovers pour éviter les débordements en détectant quand les lignes sont proches du bas du tableau.",
    "Add hover:z-50 to td elements to ensure cell overlays are fully visible when hovered.":
      "Ajouter la propriété 'hover:z-50' aux éléments de cellule (td) pour s'assurer que les infobulles de planification soient entièrement visibles au survol.",
    "Document specific calculation and display rules for the MR-MGA entity and update the application version to 1.8.13.":
      "Documenter les règles spécifiques de calcul et d'affichage pour l'entité MR-MGA, et mettre à jour la version de l'application en 1.8.13.",
    "Move the tooltip below the cell to prevent it from being obscured by overflow or being off-screen when hovering over elements at the top of the grid.":
      "Déplacer l'infobulle sous la cellule pour éviter qu'elle ne soit masquée par un débordement ou positionnée hors de l'écran lors du survol d'éléments en haut de la grille.",
    "extract getSiegeWeekDetails logic":
      "Extraire la logique de getSiegeWeekDetails."
  };

  const cleanSummary = (summary || '').trim();
  const cleanDetails = (details || '').trim();

  if (summaryMap[cleanSummary]) {
    frSummary = summaryMap[cleanSummary];
  } else {
    frSummary = frSummary
      .replace(/^feat\s*:\s*/i, "feat : ")
      .replace(/^fix\s*:\s*/i, "fix : ")
      .replace(/^style\s*:\s*/i, "style : ")
      .replace(/^refactor\s*:\s*/i, "refactor : ")
      .replace(/^chore\s*:\s*/i, "chore : ")
      .replace(/^docs\s*:\s*/i, "docs : ")
      .replace(/add dynamic expiry status indicator/gi, "ajout d'un indicateur dynamique du statut d'expiration")
      .replace(/optimize schedule popover positioning/gi, "optimiser le positionnement de l'infobulle du planning")
      .replace(/improve hover visibility for schedule cells/gi, "améliorer la visibilité au survol des cellules du planning")
      .replace(/update MO color and add new service codes/gi, "mise à jour de la couleur de la MO et ajout de nouveaux codes de service")
      .replace(/add custom status legend for MR-MGA entity/gi, "ajout d'une légende de statuts personnalisée pour l'entité MR-MGA")
      .replace(/allow MR-MGA entity to use simplified entry lookup/gi, "permettre à l'entité MR-MGA d'utiliser la recherche simplifiée des saisies")
      .replace(/update getWeekEntry to support MR-MGA entity logic/gi, "mettre à jour getWeekEntry pour prendre en charge la logique de l'entité MR-MGA")
      .replace(/add MR-MGA business rules and update version/gi, "ajout des règles de gestion MR-MGA et mise à jour de la version")
      .replace(/adjust tooltip position for cell hover/gi, "ajuster la position de l'infobulle au survol des cellules")
      .replace(/extract getSiegeWeekDetails logic/gi, "extraire la logique de getSiegeWeekDetails")
      .replace(/add support for Siège entity status mapping/gi, "ajouter le support de la correspondance des statuts de l'entité Siège")
      .replace(/update translation map for commit history/gi, "mettre à jour la table de traduction du journal des modifications")
      .replace(/add circuit breaker for Gemini translation/gi, "ajouter un coupe-circuit pour la traduction Gemini")
      .replace(/improve update date logic and cleanup/gi, "améliorer la logique des dates de mise à jour et nettoyage")
      .replace(/improve commit message translation parsing/gi, "améliorer l'analyse des traductions des messages de commits")
      .replace(/add Gemini translation and dynamic versioning/gi, "ajouter la traduction Gemini et le versionnage dynamique")
      .replace(/adjust comment styling for MR-MGA entity/gi, "ajuster le style des commentaires pour l'entité MR-MGA")
      .replace(/adjust legend layout for MR-MGA in print mode/gi, "ajuster la mise en page de la légende MR-MGA pour l'impression")
      .replace(/display status label in tooltip for MR-MGA/gi, "afficher le libellé de statut dans l'infobulle MR-MGA")
      .replace(/simplify status priority logic/gi, "simplifier la logique de priorité des statuts")
      .replace(/exclude weekends from weekly entry counts/gi, "exclure les week-ends du décompte hebdomadaire")
      .replace(/update display logic for MR-MGA off-days/gi, "mettre à jour la logique d'affichage des jours de repos MR-MGA")
      .replace(/add EPI status and update auto-fill logic/gi, "ajouter le statut EPI et mettre à jour le remplissage de sécurité")
      .replace(/add automated expiry alerts and UI styling/gi, "ajouter les alertes d'expiration automatiques et le style d'IHM")
      .replace(/fix synthesized status logic in App.tsx/gi, "corriger la logique de calcul de statut combiné dans App.tsx")
      .replace(/remove redundant weekly entry cleanup/gi, "enlever le vidage redondant des entrées hebdomadaires")
      .replace(/clear database entries for empty weekly status/gi, "nettoyer en base les statuts de semaine vides")
      .replace(/restrict weekly entry matching for MR-MGA/gi, "restreindre les équivalences d'entrées de semaine pour MR-MGA")
      .replace(/implement email workflow and template management/gi, "intégrer le processus de courriels et les gabarits de messages")
      .replace(/adjust trigram header sizing for MR-TTA print/gi, "ajuster l'en-tête de trigramme de MR-TTA pour l'impression")
      .replace(/increase font size for MR-TTA trigrams/gi, "agrandir le texte des trigrammes MR-TTA")
      .replace(/update absence colors for MR-TTA entity/gi, "actualiser la couleur des absences de MR-TTA")
      .replace(/hide comments for MR-TTA entity in service display/gi, "masquer les notes MR-TTA du tableau de service")
      .replace(/prevent comment display for MR-TTA entity/gi, "bloquer l'affichage des notes d'agents pour MR-TTA")
      .replace(/apply specific style for FOR in MR-TTA/gi, "marquer d'un style propre les formations (FOR) dans MR-TTA")
      .replace(/adjust font sizes for MR-TTA print layout/gi, "calibrer l'échelle typographique d'impression pour MR-TTA")
      .replace(/enhance MR-TTA header layout/gi, "améliorer les en-têtes d'état de MR-TTA")
      .replace(/add bulk annual MGA update functionality/gi, "déployer la mise à jour annuelle groupée de MGA")
      .replace(/remove inline styles from email template/gi, "alléger les styles du modèle d'e-mail")
      .replace(/update MR-MGA week separator styling/gi, "modifier les séparateurs de semaines de MR-MGA")
      .replace(/add weekly separator for MR-MGA entity/gi, "ajouter un marquage hebdomadaire pour MR-MGA")
      .replace(/remove conditional border styling in table/gi, "retirer la bordure conditionnelle des cellules du tableau")
      .replace(/update email action link paths/gi, "mise à jour des chemins des liens d'action par e-mail")
      .replace(/update commit message translation map/gi, "mise à jour du dictionnaire de traduction pour le journal des mises à jour")
      .replace(/initial commit/gi, "premier commit");
  }

  if (detailsMap[cleanDetails]) {
    frDetails = detailsMap[cleanDetails];
  } else {
    frDetails = frDetails
      .replace(/Implement renderExpiryCell to display color-coded visual alerts for qualification expiration dates, improving visibility of critical deadlines\./gi, "Implémenter l'affichage dynamique d'alertes visuelles colorées pour les dates d'expiration des qualifications, améliorant ainsi la visibilité des échéances critiques.")
      .replace(/Adjust popover display logic to prevent overflow by detecting when rows are near the bottom of the container\./gi, "Ajuster la logique d'affichage des infobulles/popovers pour éviter les débordements en détectant quand les lignes sont proches du bas du tableau.")
      .replace(/Add hover:z-50 to td elements to ensure cell overlays are fully visible when hovered\./gi, "Ajouter la propriété 'hover:z-50' aux éléments de cellule (td) pour s'assurer que les infobulles de planification soient entièrement visibles au survol.")
      .replace(/Adjust the color for MO code and register Abs and EPI service codes to improve visual clarity and coverage in the service schedule\./gi, "Ajuster la couleur du code MO et enregistrer les codes de service Abs et EPI pour améliorer la clarté visuelle et la couverture dans le planning de service.")
      .replace(/Define a specific status legend for the MR-MGA entity to accurately reflect its work patterns and types of absence, separating it from the logic used for other entities\./gi, "Définir une légende de statuts spécifique pour l'entité MR-MGA afin de refléter fidèlement ses rythmes de travail et types d'absence, en la séparant de la logique des autres entités.")
      .replace(/Update getWeekEntry to support MR-MGA entity logic, ensuring consistent entry retrieval for agents in that department\./gi, "Mettre à jour getWeekEntry pour prendre en charge la logique de l'entité MR-MGA, assurant une récupération cohérente des saisies pour les agents de ce service.")
      .replace(/Document specific calculation and display rules for the MR-MGA entity and update the application version to 1\.8\.13\./gi, "Documenter les règles spécifiques de calcul et d'affichage pour l'entité MR-MGA, et mettre à jour la version de l'application en 1.8.13.")
      .replace(/Move the tooltip below the cell to prevent it from being obscured by overflow or being off-screen when hovering over elements at the top of the grid\./gi, "Déplacer l'infobulle sous la cellule pour éviter qu'elle ne soit masquée par un débordement ou positionnée hors de l'écran lors du survol d'éléments en haut de la grille.")
      .replace(/extract getSiegeWeekDetails logic/gi, "extraire la logique de getSiegeWeekDetails")
      .replace(/Add new entries to the translation dictionary to support recent localization updates for documentation, UI fixes, and refactoring tasks\./gi, "Ajouter de nouvelles entrées au dictionnaire de traduction pour prendre en charge les récentes localisations pour la documentation, les correctifs d'interface utilisateur et les tâches de refactorisation.")
      .replace(/Disable Gemini API calls automatically when encountering invalid API key errors to prevent repeated failed requests and ensure fallback to dictionary-based translation\./gi, "Désactiver automatiquement les appels à l'API Gemini en cas d'erreurs d'API key invalide afin d'éviter la répétition des requêtes échouées et assurer la traduction de secours du dictionnaire.")
      .replace(/Sort app updates by ID to ensure the latest version is identified\./gi, "Trier les mises à jour par ID pour identifier la dernière version.")
      .replace(/Enhance date parsing robustness with manual fallback formats\./gi, "Renforcer l'analyse des dates avec des formats de secours.")
      .replace(/Remove redundant translation logic in the server\./gi, "Retirer la logique de traduction redondante sur le serveur.")
      .replace(/Update regex patterns to support flexible spacing around colons and parentheses, and add new mappings to the translation dictionary to improve support for commit log localization\./gi, "Mettre à jour les regex pour accepter des espacements souples autour des deux-points et parenthèses, et enrichir le dictionnaire pour la localisation du journal des modifications.")
      .replace(/Integrate Google Gemini API for automated French translation of commit messages\./gi, "Intégrer l'API Google Gemini pour la traduction automatique en français des messages de commits.")
      .replace(/Implement dynamic version and date display in the UI based on repository updates\./gi, "Mettre en œuvre l'affichage dynamique de la version et de sa date dans l'IHM selon l'historique.")
      .replace(/Update GitHub repository configuration\./gi, "Mettre à jour la configuration du dépôt GitHub.")
      .replace(/Document specific business logic rules for MR-MGA in AGENTS.md\./gi, "Spécifier les règles métier de MR-MGA dans AGENTS.md.")
      .replace(/Update comment display formatting to improve readability for the MR-MGA entity by enabling word wrapping and adjusting font sizing\./gi, "Améliorer la lisibilité des commentaires pour l'entité MR-MGA en activant les retours automatiques à la ligne et en calibrant la taille des polices.")
      .replace(/Hide the legend column for MR-MGA when printing to optimize document space and layout\./gi, "Masquer la section de légende pour les agents MR-MGA lors de l'impression afin d'utiliser au mieux l'espace de la page.")
      .replace(/Enhance the tooltip functionality for MR-MGA entries to show the status label alongside the optional comment, improving readability and information clarity\./gi, "Enrichir le contenu des infobulles de MR-MGA pour afficher la description complète du statut en plus de l'éventuel commentaire.")
      .replace(/Replace manual conditional checks with an ordered array lookup to improve maintainability and readability of status priority assignment\./gi, "Remplacer les tests conditionnels manuels par une recherche d'index ordonnée dans un tableau pour améliorer la maintenabilité.")
      .replace(/Update entry filtering logic to ignore Saturdays and Sundays when calculating weekly totals for users\./gi, "Filtrer et exclure systématiquement les week-ends (samedis et dimanches) de la somme de présences.")
      .replace(/Adjust the display conditions for 'OFF' statuses in MR-MGA to ensure consistent rendering within the service schedule\./gi, "Optimiser le rendu graphique du statut 'OFF' au sein du tableau de service de l'entité MR-MGA.")
      .replace(/Include EPI in the status list and refine the auto-fill priority rankings to support a wider range of statuses for MGA scheduling\./gi, "Intégrer le code EPI dans la liste des statuts et affiner les priorités automatiques pour l'entité MGA.")
      .replace(/Implement database tracking for professional title expiry alerts and update the UI with color-coded status indicators to improve monitoring of upcoming deadlines\./gi, "Développer le suivi pour les d'échéances d'habilitations et ajouter des jalons colorés d'expiration sur l'échelle de temps.")
      .replace(/Adjust the scope of status synthesis to ensure current saved entries are processed correctly even when no valid daily counts exist\./gi, "Ajuster la synthèse pour s'assurer que les entrées enregistrées soient traitées même si aucun relevé journalier n'existe.")
      .replace(/Remove logic that explicitly clears weekly entries when no valid status is provided, as it is no longer required for the current state management\./gi, "Retirer le nettoyage automatique des entrées de semaine vides.")
      .replace(/Ensure that when no valid status is provided for a week, any existing entry in the database is cleared to maintain data consistency\./gi, "Garantir la cohérence des données en vidant l'entrée de semaine s'il n'y a pas de statut actif.")
      .replace(/Exclude weekly entry fallback logic for MR-MGA users to ensure correct daily entry resolution in the service schedule\./gi, "Éviter la logique de secours hebdomadaire par défaut pour MR-MGA pour donner la priorité au planning journalier.")
      .replace(/Added backend mail routing logic for operational\/test modes and created a configuration interface in the admin panel to customize mail templates, subjects, and recipients\./gi, "Développer le système d'expédition des e-mails en mode bac à sable ou production et ajouter le panneau d'administration des gabarits.")
      .replace(/Update CSS and header classes to ensure correct font sizing for MR-TTA entities during print operations\./gi, "Corriger l'en-tête et les styles pour assurer des tailles de fonts idéales lors de l'impression de MR-TTA.")
      .replace(/Adjust the print text size for MR-TTA trigram headers to improve readability in printed reports\./gi, "Ajuster l'échelle de texte d'en-tête d'impression de MR-TTA pour l'impression finale.")
      .replace(/Apply specific gray-themed styling for absence statuses \(ABS, ABS_V, ABS_D\) when the entity is set to MR-TTA\./gi, "Assigner des teintes grises significatives aux absences de l'entité TTA.")
      .replace(/Disable comment tooltips and indicators for the MR-TTA entity to align with specific display requirements\./gi, "Masquer les bulles d'aide et les commentaires d'agents de MR-TTA.")
      .replace(/Restricts the visibility of entry comments specifically for the MR-TTA entity in the service table display\./gi, "Restreindre l'affichage des commentaires d'entrée pour la division TTA.")
      .replace(/Update getStatusColor to handle entity-specific styling, using a distinct color for Formation \(FOR\) when the entity is MR-TTA\./gi, "Donner un jaune unique d'affichage au code Formation de l'entité MR-TTA.")
      .replace(/Standardize print font sizes and improve text readability for the MR-TTA entity by increasing font scale in print mode\./gi, "Harmoniser et agrandir l'échelle typographique à l'impression pour MR-TTA.")
      .replace(/Update the print header for MR-TTA to improve readability by highlighting the week number in a dedicated badge and restructuring the date display\./gi, "Améliorer l'en-tête d'impression de MR-TTA en valorisant le numéro de la semaine par un badge.")
      .replace(/Implement server-side endpoint and client-side logic to automatically populate and update annual TDS entries for the MGA division based on defined status priorities\./gi, "Mettre en place la mise à jour globale annuelle en lot de MGA selon l'échelle logique de préséance.")
      .replace(/Clean up email HTML template by removing unused inline CSS styles to improve code maintainability\./gi, "Simplifier les styles pour le modèle HTML d'expédition des courriels.")
      .replace(/Improve visual distinction for MR-MGA week separators by updating background and border styles\./gi, "Peaufiner les limites visuelles de semaines pour MR-MGA.")
      .replace(/Extend the weekly separator display logic to include MR-MGA and apply specific styling for better visual distinction\./gi, "Activer la séparation par semaine pour MR-MGA pour faciliter la lecture rythmique.")
      .replace(/Clean up the table cell rendering by removing the specific MR-MGA weekend styling to maintain a consistent UI across all entities\./gi, "Enlever la stylisation particulière de week-ends pour MR-MGA afin de conserver des grilles standardisées.")
      .replace(/Move weekly schedule calculation logic to a dedicated function to improve maintainability and handle daily versus weekly entry resolution for the Siege entity\./gi, "Déplacer le calcul d'équivalent hebdo du Siège vers une fonction isolée afin de pérenniser le code.")
      .replace(/Update status resolution logic to correctly handle Siège-specific codes \(CA\/FOR\) and update the repository\./gi, "Compléter la résolution logique pour s'adapter aux statuts Congés Annuels (CA) ou Formation (FOR) exclusifs au Siège.")
      .replace(/Standardize email redirection paths to root-based URLs to ensure consistent navigation within the application\./gi, "Standardiser les chemins de redirection des e-mails vers des URL basées sur la racine afin de garantir une navigation cohérente au sein de l'application.")
      .replace(/Expand the translation dictionary to include recent feature, fix, and refactor commit messages for better UI localization\./gi, "Enrichir le dictionnaire de traduction pour inclure les récents messages de commit (fonctionnalités, corrections et refactorisations) afin d'améliorer la localisation de l'interface utilisateur.");
  }

  return { summary: frSummary, details: frDetails };
};

// --- Components ---

const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [trigram, setTrigram] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRecover, setShowRecover] = useState(false);
  const [recoverTrigram, setRecoverTrigram] = useState('');
  const [recoverMessage, setRecoverMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigram, password }),
    });
    if (res.ok) {
      const user = await res.json();
      onLogin(user);
    } else {
      setError('Identifiants invalides');
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigram: recoverTrigram }),
    });
    const data = await res.json();
    if (res.ok) {
      setRecoverMessage(data.message);
      setError('');
    } else {
      setError(data.error);
    }
  };

  return (
   <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
  {/* Image de fond avec avion */}
  <div 
    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
    style={{ 
     backgroundImage: 'url("https://www.magnific.com/fr/photos/arabe")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: 'brightness(0.5)' // 👈 Assombrit légèrement le fond pour faire ressortir la boîte de connexion
    }}
  />

  {/* Boîte de connexion blanche au centre */}
  <div className="bg-white/90 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20 z-10">
    ...
  </div>
</div>
        }}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20 z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-6 shadow-inner p-1 border border-gray-100 overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Logo DAC-NC" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900">Gestion TDS DT</h1>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">DAC-NC/SNA/DT</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Trigramme</label>
            <input 
              type="text" 
              value={trigram}
              onChange={(e) => setTrigram(e.target.value.toUpperCase())}
              maxLength={3}
              className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-mono uppercase text-lg font-bold"
              placeholder="EX: FCH"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-lg"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98] text-sm"
          >
            Se connecter
          </button>
          <div className="text-center">
            <button 
              type="button"
              onClick={() => setShowRecover(true)}
              className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
            >
              Mot de passe oublié ?
            </button>
          </div>
        </form>

        <AnimatePresence>
          {showRecover && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100"
              >
              <h2 className="text-xl font-black mb-4">Récupération de compte</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">Saisissez votre trigramme pour recevoir un mot de passe temporaire par email.</p>
              
              {recoverMessage ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-100">
                    {recoverMessage}
                  </div>
                  <button 
                    onClick={() => { setShowRecover(false); setRecoverMessage(""); }}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold"
                  >
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecover} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Trigramme</label>
                    <input 
                      type="text" 
                      value={recoverTrigram}
                      onChange={(e) => setRecoverTrigram(e.target.value.toUpperCase())}
                      maxLength={3}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none font-mono uppercase"
                      placeholder="EX: CHN"
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowRecover(false)}
                      className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
};

const getMondayOfISOWeek = (weekNum: number, year: number): Date => {
  const simple = new Date(year, 0, 4, 12, 0, 0, 0); // Noon of January 4 is always in Week 1
  const dayOfWeek = simple.getDay(); // 0 is Sunday, 1 is Monday ...
  const dayDiff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
  const mondayOfW1 = new Date(year, 0, 4 - dayDiff, 12, 0, 0, 0); // Noon
  
  const targetMonday = new Date(mondayOfW1);
  targetMonday.setDate(mondayOfW1.getDate() + (weekNum - 1) * 7);
  return targetMonday;
};

const isWeekWithHoliday = (week: number, year: number) => {
  const holidays = getNCHolidays(year);
  const startOfWeek = getMondayOfISOWeek(week, year);
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    d.setHours(12, 0, 0, 0);
    if (holidays[formatDateLocal(d)]) return true;
  }
  return false;
};

const isNCSchoolHolidayDate = (date: Date): boolean => {
  const y = date.getFullYear();
  const mNum = date.getMonth(); // 0-indexed
  const dNum = date.getDate();
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${y}-${pad(mNum + 1)}-${pad(dNum)}`;

  if (y === 2024) {
    if (dateStr >= "2024-01-01" && dateStr <= "2024-02-18") return true;
    if (dateStr >= "2024-04-06" && dateStr <= "2024-04-21") return true;
    if (dateStr >= "2024-06-01" && dateStr <= "2024-06-16") return true;
    if (dateStr >= "2024-08-03" && dateStr <= "2024-08-18") return true;
    if (dateStr >= "2024-10-05" && dateStr <= "2024-10-20") return true;
    if (dateStr >= "2024-12-14" && dateStr <= "2024-12-31") return true;
  } else if (y === 2025) {
    if (dateStr >= "2025-01-01" && dateStr <= "2025-02-16") return true;
    if (dateStr >= "2025-04-05" && dateStr <= "2025-04-20") return true;
    if (dateStr >= "2025-05-31" && dateStr <= "2025-06-15") return true;
    if (dateStr >= "2025-08-02" && dateStr <= "2025-08-17") return true;
    if (dateStr >= "2025-10-04" && dateStr <= "2025-10-19") return true;
    if (dateStr >= "2025-12-13" && dateStr <= "2025-12-31") return true;
  } else if (y === 2026) {
    if (dateStr >= "2026-01-01" && dateStr <= "2026-02-15") return true;
    if (dateStr >= "2026-04-04" && dateStr <= "2026-04-19") return true;
    if (dateStr >= "2026-06-06" && dateStr <= "2026-06-21") return true;
    if (dateStr >= "2026-08-08" && dateStr <= "2026-08-23") return true;
    if (dateStr >= "2026-10-10" && dateStr <= "2026-10-25") return true;
    if (dateStr >= "2026-12-19" && dateStr <= "2026-12-31") return true;
  } else if (y === 2027) {
    if (dateStr >= "2027-01-01" && dateStr <= "2027-02-14") return true;
    if (dateStr >= "2027-04-03" && dateStr <= "2027-04-18") return true;
    if (dateStr >= "2027-06-05" && dateStr <= "2027-06-20") return true;
    if (dateStr >= "2027-08-07" && dateStr <= "2027-08-22") return true;
    if (dateStr >= "2027-10-09" && dateStr <= "2027-10-24") return true;
    if (dateStr >= "2027-12-18" && dateStr <= "2027-12-31") return true;
  } else if (y === 2028) {
    if (dateStr >= "2028-01-01" && dateStr <= "2028-02-13") return true;
    if (dateStr >= "2028-04-08" && dateStr <= "2028-04-23") return true;
    if (dateStr >= "2028-06-10" && dateStr <= "2028-06-25") return true;
    if (dateStr >= "2028-08-12" && dateStr <= "2028-08-27") return true;
    if (dateStr >= "2028-10-14" && dateStr <= "2028-10-29") return true;
    if (dateStr >= "2028-12-16" && dateStr <= "2028-12-31") return true;
  } else {
    // General recurrence formula fallback
    if (mNum === 0 || (mNum === 1 && dNum <= 15)) return true;
    if (mNum === 3 && dNum >= 5 && dNum <= 20) return true;
    if ((mNum === 4 && dNum >= 31) || (mNum === 5 && dNum <= 15)) return true;
    if (mNum === 7 && dNum >= 1 && dNum <= 16) return true;
    if (mNum === 9 && dNum >= 3 && dNum <= 18) return true;
    if (mNum === 11 && dNum >= 12) return true;
  }
  return false;
};

const isSchoolHolidayWeek = (week: number, year: number): boolean => {
  const monday = getMondayOfISOWeek(week, year);
  let schoolHolidayDaysCount = 0;
  for (let i = 0; i < 5; i++) { // Monday to Friday (5 working days)
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(12, 0, 0, 0); // Guarantee noon hours to prevent transition shifts
    if (isNCSchoolHolidayDate(d)) {
      schoolHolidayDaysCount++;
    }
  }
  return schoolHolidayDaysCount >= 3;
};

const getSchoolHolidayName = (week: number, year: number): string | undefined => {
  if (!isSchoolHolidayWeek(week, year)) return undefined;
  
  const monday = getMondayOfISOWeek(week, year);
  // Look for any day in the week that falls inside a holiday, to see which period it belongs to
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(12, 0, 0, 0); // Force noon
    if (isNCSchoolHolidayDate(d)) {
      const m = d.getMonth();
      if (m === 3) return "Vacances Scolaires (Période 1)";
      if (m === 4 || m === 5) return "Vacances Scolaires (Période 2)";
      if (m === 7) return "Vacances Scolaires (Période 3)";
      if (m === 9 || m === 10) return "Vacances Scolaires (Période 4)";
    }
  }
  return "Vacances Scolaires (Grande Vacances / Été)";
};

const getWeekStrFromDailyDate = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('-W')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return getWeekStr(d);
};

const getSiegeWeekDetails = (
  userId: number,
  weekNum: number,
  currentYear: number,
  entries: any[],
  leaves: any[],
  userObj?: any
) => {
  const dateStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
  const mon = getMondayOfISOWeek(weekNum, currentYear);
  const detailDays = [];
  const dayNamesShort = ['lun', 'mar', 'mer', 'jeu', 'ven'];

  // Check if there are daily entries in the DB for this agent and this week
  const hasAnyDailyDbEntry = entries.some(e => e.user_id == userId && getWeekStrFromDailyDate(e.date) === dateStr);
  const directWeeklyEntry = entries.find(e => e.user_id == userId && e.date === dateStr);

  // If NO daily entries in the DB but there is a direct weekly entry
  if (!hasAnyDailyDbEntry && directWeeklyEntry && directWeeklyEntry.status) {
    let status = directWeeklyEntry.status;
    if (status === 'C') status = 'CA';
    if (status === 'F') status = 'FOR';
    for (let i = 0; i < 5; i++) {
      detailDays.push({
        shortName: dayNamesShort[i],
        status: status
      });
    }
    return detailDays;
  }

  // Otherwise, compute day-by-day detail
  for (let i = 0; i < 5; i++) {
    const date = new Date(mon);
    date.setDate(mon.getDate() + i);
    const dayStr = formatDateLocal(date);

    // Solve leaves
    const rawDayLeaves = leaves.filter(l => 
      l.user_id === userId && 
      dayStr >= l.start_date && 
      dayStr <= l.end_date &&
      l.status !== 'rejected'
    );
    const dayLeaves = resolveActiveLeaves(rawDayLeaves);
    const hasActiveLeave = dayLeaves && dayLeaves.length > 0;

    let status = '';

    // Check entry
    const dbEntry = entries.find(e => e.user_id == userId && e.date === dayStr);
    if (dbEntry && dbEntry.status) {
      status = dbEntry.status;
    } else if (hasActiveLeave) {
      status = dayLeaves[0].type; // e.g. C, CA, RTT, REC, CET
    } else {
      // Check TLT default
      const isTltDayDefault = userObj && userObj.tlt_day && userObj.tlt_day !== 'Aucun' && getDayNameFr(date) === userObj.tlt_day;
      if (isTltDayDefault) {
        status = 'TLT';
      } else {
        status = 'PRE';
      }
    }

    // Normalize status format for Siège
    if (status === 'C') status = 'CA';
    if (status === 'F') status = 'FOR';

    detailDays.push({
      shortName: dayNamesShort[i],
      status: status || 'PRE'
    });
  }

  return detailDays;
};

const getSiegeWeekSynthesis = (detailDays: Array<{ shortName: string, status: string }>) => {
  const counts: Record<string, number> = {
    'PRE': 0,
    'MIS': 0,
    'CA': 0,
    'FOR': 0,
    'REC': 0
  };

  detailDays.forEach(d => {
    const s = d.status;
    if (s === 'PRE' || s === 'TLT') {
      counts['PRE']++;
    } else if (s === 'MIS') {
      counts['MIS']++;
    } else if (s === 'CA' || s === 'RTT' || s === 'CET') {
      counts['CA']++;
    } else if (s === 'FOR') {
      counts['FOR']++;
    } else if (s === 'REC') {
      counts['REC']++;
    } else {
      counts['PRE']++; // fallback
    }
  });

  let bestStatus = 'PRE';
  let maxCount = -1;
  const priority = ['PRE', 'REC', 'FOR', 'MIS', 'CA']; // higher index = higher priority in tie

  Object.keys(counts).forEach(s => {
    const count = counts[s];
    if (count > maxCount) {
      maxCount = count;
      bestStatus = s;
    } else if (count === maxCount) {
      if (priority.indexOf(s) > priority.indexOf(bestStatus)) {
        bestStatus = s;
      }
    }
  });

  return bestStatus;
};

const formatSiegeWeekTooltip = (detailDays: Array<{ shortName: string, status: string }>) => {
  const labelMap: Record<string, string> = {
    'PRE': 'PRÉSENCE',
    'MIS': 'MISSION',
    'CA': 'CA',
    'FOR': 'FORMATION',
    'REC': 'RÉCUPÉRATION',
    'TLT': 'TÉLÉTRAVAIL',
    'RTT': 'RTT',
    'CET': 'CET',
    'OFF': 'OFF'
  };

  const groups: Array<{ days: string[], status: string }> = [];
  let currentGroup: { days: string[], status: string } | null = null;

  detailDays.forEach(d => {
    if (!currentGroup || currentGroup.status !== d.status) {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = { days: [d.shortName], status: d.status };
    } else {
      currentGroup.days.push(d.shortName);
    }
  });
  if (currentGroup) {
    groups.push(currentGroup);
  }

  const parts = groups.map(g => {
    const daysStr = g.days.join('-');
    const label = labelMap[g.status] || g.status;
    return `${daysStr}->${label}`;
  });

  return parts.join(' ');
};

const getWeekEntry = (userId: number, weekNum: number, currentYear: number, entries: any[], isSandbox: boolean, agentEntity?: string, leaves: any[] = [], userObj?: any) => {
  const dateStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
  
  if (agentEntity === 'Siège') {
    const details = getSiegeWeekDetails(userId, weekNum, currentYear, entries, leaves, userObj);
    const synthStatus = getSiegeWeekSynthesis(details);
    const hoverTooltip = formatSiegeWeekTooltip(details);

    const direct = entries.find(e => e.user_id == userId && e.date === dateStr);
    let finalStatus = synthStatus;

    const dailyComments = entries
      .filter(e => e.user_id == userId && getWeekStrFromDailyDate(e.date) === dateStr && e.comment)
      .map(e => e.comment)
      .filter(Boolean);
    if (direct?.comment) {
      dailyComments.push(direct.comment);
    }
    const uniqueComments = Array.from(new Set(dailyComments));
    const finalComment = uniqueComments.join(' / ');

    return {
      status: finalStatus,
      comment: finalComment,
      hoverTooltip,
      detailDays: details
    };
  }

  if (isSandbox || agentEntity === 'MR-MGA') {
    const direct = entries.find(e => e.user_id == userId && e.date === dateStr);
    return direct;
  }
  
  // Try direct weekly matches first
  const directEntry = entries.find(e => e.user_id == userId && e.date === dateStr);
  if (directEntry) return directEntry;

  const weekEntries = entries.filter(e => {
    if (e.user_id != userId) return false;
    return getWeekStrFromDailyDate(e.date) === dateStr;
  });
  
  if (weekEntries.length === 0) return null;
  
  // Check if any of these daily entries have a cycle border color for MR-TTA
  const cycle1Entry = weekEntries.find(e => e.border_color === '#4FB6E1');
  if (cycle1Entry) {
    return {
      status: '1',
      border_color: '#4FB6E1',
      comment: cycle1Entry.comment || weekEntries.map(e => e.comment).filter(Boolean).join(' / ') || ''
    };
  }
  
  const cycle2Entry = weekEntries.find(e => e.border_color === '#1B6486');
  if (cycle2Entry) {
    return {
      status: '2',
      border_color: '#1B6486',
      comment: cycle2Entry.comment || weekEntries.map(e => e.comment).filter(Boolean).join(' / ') || ''
    };
  }
  
  const cycle3Entry = weekEntries.find(e => e.border_color === '#E77E31');
  if (cycle3Entry) {
    return {
      status: '3',
      border_color: '#E77E31',
      comment: cycle3Entry.comment || weekEntries.map(e => e.comment).filter(Boolean).join(' / ') || ''
    };
  }
  
  // Look for most frequent non-OFF daily status
  const statusCounts: Record<string, number> = {};
  let bestComment = '';
  for (const e of weekEntries) {
    if (e.status && e.status !== 'OFF') {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    }
    if (e.comment) {
      bestComment = e.comment;
    }
  }
  
  const sortedStatuses = Object.keys(statusCounts).sort((a, b) => statusCounts[b] - statusCounts[a]);
  if (sortedStatuses.length > 0) {
    let weekStatus = sortedStatuses[0];
    if (agentEntity === 'Siège') {
      if (weekStatus === 'C') weekStatus = 'CA';
      if (weekStatus === 'F') weekStatus = 'FOR';
    } else {
      if (weekStatus === 'CA') weekStatus = 'C';
      if (weekStatus === 'FOR') weekStatus = 'F';
    }
    return {
      status: weekStatus,
      comment: bestComment
    };
  }
  
  const hasOff = weekEntries.some(e => e.status === 'OFF');
  if (hasOff) {
    return {
      status: 'OFF',
      comment: bestComment
    };
  }
  
  const firstWithStatus = weekEntries.find(e => e.status);
  if (firstWithStatus) {
    let finalStatus = firstWithStatus.status;
    if (agentEntity === 'Siège') {
      if (finalStatus === 'C') finalStatus = 'CA';
      if (finalStatus === 'F') finalStatus = 'FOR';
    }
    return {
      status: finalStatus,
      comment: firstWithStatus.comment || ''
    };
  }
  
  return null;
};

const YearlyGrid = ({ entity, user, isSandbox = false, title, onUpdate, showNotification }: { entity: Entity, user: User, isSandbox?: boolean, title: string, onUpdate?: () => void, showNotification?: (msg: string, type?: 'success' | 'error') => void }) => {
  const [entries, setEntries] = useState<TDSEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [validations, setValidations] = useState<TDSValidation[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ userId: number, week: number, x: number, y: number } | null>(null);
  const [tempComment, setTempComment] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [hoveredEqCell, setHoveredEqCell] = useState<{ eqId: number, week: number } | null>(null);

  const runAutoFillMga = async (currUsers: User[], currEntries: any[]) => {
    const updatesToMake: Array<{ user_id: number; date: string; status: string; comment: string; is_sandbox: number }> = [];
    const allowedStatuses = ['TRV', 'OFF', 'TLT', 'CET', 'ABS_D', 'ABS_V', 'EXC', 'FOR', 'MIS', 'AE', 'EPI'];
    const localWeeks = Array.from({ length: 53 }, (_, i) => i + 1);
    
    const getPriorityValue = (status: string): number => {
      const order = ['OFF', 'ABS_D', 'CET', 'EXC', 'ABS_V', 'MIS', 'FOR', 'TLT', 'TRV', 'EPI', 'AE'];
      const idx = order.indexOf(status);
      return idx !== -1 ? idx + 1 : 0;
    };

    currUsers.forEach(u => {
      for (const weekNum of localWeeks) {
        const weekStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
        
        // Filter daily entries matching parent week (excluding weekends)
        const weekDailyEntries = currEntries.filter(e => {
          if (e.user_id !== u.id || e.date.includes('-W') || getWeekStrFromDailyDate(e.date) !== weekStr) {
            return false;
          }
          const parts = e.date.split('-');
          if (parts.length !== 3) return false;
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const day = d.getDay();
          return day !== 0 && day !== 6; // Exclude Saturdays (6) and Sundays (0)
        });
        
        const counts: Record<string, number> = {};
        allowedStatuses.forEach(s => counts[s] = 0);
        
        let validCount = false;
        weekDailyEntries.forEach(e => {
          if (allowedStatuses.includes(e.status)) {
            counts[e.status]++;
            validCount = true;
          }
        });
        
        let synthesizedStatus = '';
        if (validCount) {
          let maxCount = 0;
          allowedStatuses.forEach(s => {
            if (counts[s] > maxCount) {
              maxCount = counts[s];
            }
          });
          
          if (maxCount > 0) {
            const candidates = allowedStatuses.filter(s => counts[s] === maxCount);
            
            // Sort based on priority rules
            candidates.sort((a, b) => {
              const pA = getPriorityValue(a);
              const pB = getPriorityValue(b);
              if (pA !== pB) return pB - pA;
              // Deterministic tie breaker for AE and EPI
              if (a === 'AE' || b === 'AE') {
                return a === 'AE' ? -1 : 1;
              }
              return a.localeCompare(b);
            });
            
            synthesizedStatus = candidates[0];
          }
        }
        
        const currentSavedWeeklyEntry = currEntries.find(e => 
          e.user_id === u.id && 
          e.date === weekStr
        );
        
        const currentSavedStatus = currentSavedWeeklyEntry?.status || '';
        const currentSavedComment = currentSavedWeeklyEntry?.comment || '';
        
        if (synthesizedStatus !== currentSavedStatus) {
          updatesToMake.push({
            user_id: u.id,
            date: weekStr,
            status: synthesizedStatus,
            comment: currentSavedComment,
            is_sandbox: isSandbox ? 1 : 0
          });
        }
      }
    });

    if (updatesToMake.length > 0) {
      console.log(`[AUTO-FILL MR-MGA] Propagating ${updatesToMake.length} auto-fill updates for year ${currentYear}...`);
      try {
        const response = await fetch('/api/tds/bulk-update-annual-mga', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: updatesToMake })
        });
        if (response.ok) {
          const entriesRes = await fetch(`/api/tds?entity=${entity}&is_sandbox=${isSandbox}`);
          if (entriesRes.ok) {
            setEntries(await entriesRes.json());
          }
          if (onUpdate) onUpdate();
        }
      } catch (err) {
        console.error('[AUTO-FILL MR-MGA] Error in bulk-update API call', err);
      }
    }
  };

  const fetchData = async () => {
    try {
      let filteredUsers: User[] = [];
      const [usersRes, entriesRes, validationsRes, leavesRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/tds?entity=${entity}&is_sandbox=${isSandbox}`),
        fetch('/api/validations'),
        fetch('/api/leaves')
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // Filter out secretaries and agents from other entities
        filteredUsers = Array.isArray(usersData) ? usersData.filter((u: any) => 
          u.role !== 'secretary' && 
          u.entity === entity &&
          !['secrétaire', 'secretaire'].includes((u.profil || '').toLowerCase()) &&
          !(u.lastname || '').toUpperCase().includes('SECRETAIRE')
        ) : [];
        setUsers(filteredUsers);
      }
      
      if (entriesRes.ok) {
        const fetchedEntries = await entriesRes.json();
        setEntries(fetchedEntries);
        
        if (entity === 'MR-MGA') {
          await runAutoFillMga(filteredUsers, fetchedEntries);
        }
      }

      if (validationsRes.ok) setValidations(await validationsRes.json());
      if (leavesRes.ok) setLeaves(await leavesRes.json());
    } catch (e) {
      console.error("[YEARLY FETCH ERROR]", e);
    }
  };

  const handleValidateWeek = async (weekNum: number, role: 'MR' | 'DT') => {
    const weekStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
    try {
      const res = await fetch('/api/tds/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity,
          week_str: weekStr,
          role,
          validator_trigram: user.trigram
        })
      });
      if (res.ok) {
        if (showNotification) {
          showNotification(`Semaine ${weekNum} validée en tant que Chef ${role}`);
        }
        fetchData();
        if (onUpdate) onUpdate();
      } else {
        const err = await res.json();
        if (showNotification) showNotification(err.error || "Erreur de validation", 'error');
      }
    } catch (e) {
      if (showNotification) showNotification("Erreur lors de la validation", 'error');
    }
  };

  const handleUnvalidateWeek = async (weekNum: number, role: 'MR' | 'DT') => {
    const weekStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
    try {
      const res = await fetch('/api/tds/unvalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity,
          week_str: weekStr,
          role
        })
      });
      if (res.ok) {
        if (showNotification) {
          showNotification(`Validation Chef ${role} annulée pour la semaine ${weekNum}`);
        }
        fetchData();
        if (onUpdate) onUpdate();
      } else {
        const err = await res.json();
        if (showNotification) showNotification(err.error || "Erreur lors de l'annulation", 'error');
      }
    } catch (e) {
      if (showNotification) showNotification("Erreur lors de l'annulation", 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, [entity, isSandbox, currentYear]);

  const handleStatusChange = async (userId: number, week: number, status: string, comment: string = '') => {
    const dateStr = `${currentYear}-W${String(week).padStart(2, '0')}`;
    const res = await fetch('/api/tds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, date: dateStr, status, comment, is_sandbox: isSandbox }),
    });
    if (res.ok) {
      // Auto-complétion pour le Bac à Sable : cycle 1 -> 2 -> 3
      if (isSandbox && entity === 'MR-TTA' && status === '1') {
        const chain = [
          { w: week + 1, s: '2' },
          { w: week + 2, s: '3' }
        ];
        
        for (const item of chain) {
          if (item.w <= 53) {
            const nextDateStr = `${currentYear}-W${String(item.w).padStart(2, '0')}`;
            await fetch('/api/tds', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId, date: nextDateStr, status: item.s, comment: '', is_sandbox: isSandbox }),
            });
          }
        }
      }

      setEditingCell(null);
      setTempComment('');
      fetchData();
      if (onUpdate) onUpdate();
    }
  };

  const statusLegend = entity === 'MR-MGA' ? [
    { code: 'TRV', label: 'Travail' },
    { code: 'OFF', label: 'Jour OFF' },
    { code: 'TLT', label: 'Télétravail' },
    { code: 'CET', label: 'CET' },
    { code: 'ABS_D', label: 'Absence (Demande)' },
    { code: 'ABS_V', label: 'Absence (Validé)' },
    { code: 'EXC', label: 'Abs. Exceptionnelle' },
    { code: 'FOR', label: 'Formation' },
    { code: 'MIS', label: 'Mission' },
    { code: 'AE', label: 'Astreinte Élec.' },
    { code: 'EPI', label: 'EPI' },
  ] : (entity === 'MR-TTA' ? [
    { code: '1', label: 'Cycle 1 (MO/MS)' },
    { code: '2', label: 'Cycle 2 (MO/MS/RIT)' },
    { code: '3', label: 'Cycle 3 (MS/RIT)' },
    { code: 'C', label: 'Congés' },
    { code: 'F', label: 'Formation' },
    { code: 'MS', label: 'De service' },
    { code: 'AE', label: 'Astreinte Électrique' },
    { code: 'Abs', label: 'Absence' },
    { code: 'OFF+RIT', label: 'OFF + RIT' },
    { code: 'MS+RIT', label: 'MS + RIT' },
    { code: 'MO+RIT', label: 'MO + RIT' },
  ] : (entity === 'Siège' ? [
    { code: 'PRE', label: 'Présence' },
    { code: 'MIS', label: 'Mission' },
    { code: 'CA', label: 'Congé annuel' },
    { code: 'FOR', label: 'Formation' },
    { code: 'REC', label: 'Récupération' },
  ] : [
    { code: 'P', label: 'MS (Maint. Spéc.)' },
    { code: 'S', label: 'MO (Maint. Opér.)' },
    { code: 'W', label: 'RIT WE (Astreinte)' },
    { code: 'A', label: 'RIT Après WE' },
    { code: 'Q', label: 'RIT 7J (Astreinte)' },
    { code: 'F', label: 'Formation' },
    { code: 'C', label: 'Congée' },
    { code: 'AE', label: 'Astreinte Électrique' },
    { code: 'RTT', label: 'RTT' },
    { code: 'REC', label: 'Récupération' },
    { code: 'CET', label: 'CET' },
    { code: 'I', label: 'Indisponible' },
    { code: 'M', label: 'Mission' },
  ]));

  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);
  const currentWeekStr = getWeekStr(new Date());

  // Sector grouping for MR-TTA
  const getSector = (ua: User) => {
    if (entity !== 'MR-TTA') return null;
    const p = (ua.profil || '').toUpperCase();
    if (p.includes('CHEF')) return 'CHEF';
    if (p.includes('ATM')) return 'ATM';
    if (p.includes('CNS')) return 'CNS';
    if (p.includes('SE') || p.includes('ELECTROTECH')) return 'SE';
    return 'ATM';
  };

  const sectorsGrid = entity === 'MR-TTA' ? [
    { id: 'CHEF', fullName: 'Chef MR-TTA', borderColor: 'border-l-blue-500', rowBg: 'bg-blue-50/30' },
    { id: 'ATM', fullName: 'ATM', borderColor: 'border-l-emerald-500', rowBg: 'bg-emerald-50/20' },
    { id: 'CNS', fullName: 'CNS', borderColor: 'border-l-orange-500', rowBg: 'bg-orange-50/20' },
    { id: 'SE', fullName: 'SE', borderColor: 'border-l-purple-500', rowBg: 'bg-purple-50/20' },
  ] : [];

  const groupedUsers = entity === 'MR-TTA' ? sectorsGrid.map(s => ({
    ...s,
    usersByGroup: users.filter(u => getSector(u) === s.id)
  })).filter(g => g.usersByGroup.length > 0) : [{ id: 'none', fullName: '', borderColor: '', rowBg: '', usersByGroup: users }];

  // Helper to get month name for a week
  const getMonthForWeek = (week: number) => {
    const monday = getMondayOfISOWeek(week, currentYear);
    const d = new Date(monday);
    d.setDate(monday.getDate() + 3); // Thursday of the week
    return d.toLocaleString('fr-FR', { month: 'short' }).toUpperCase().substring(0, 3);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-300 overflow-hidden mb-4">
      <div className="bg-gray-100 p-2 border-b border-gray-300 flex items-center justify-between px-6">
        <button 
          onClick={() => setCurrentYear(prev => prev - 1)}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
          title="Année précédente"
        >
          <ChevronLeft size={20} />
        </button>

        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
          {title} <span className="text-sm font-normal italic text-gray-500">({currentYear})</span>
        </h2>

        <button 
          onClick={() => setCurrentYear(prev => prev + 1)}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
          title="Année suivante"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="overflow-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-gray-50 uppercase tracking-widest text-gray-500">
              <th className="border border-gray-300 p-2 sticky left-0 z-40 bg-gray-50 min-w-[100px] text-[10px] font-black shadow-[2px_0_10px_rgba(0,0,0,0.05)] text-center">Agent</th>
              {weeks.map(w => {
                const isCurrentWeek = `${currentYear}-W${String(w).padStart(2, '0')}` === currentWeekStr;
                const isHoveredCol = hoveredEqCell?.week === w;
                return (
                  <th key={w} className={`border border-gray-300 p-1 min-w-[22px] text-center font-black relative ${isHoveredCol ? 'bg-teal-50 text-teal-950 font-black outline outline-2 outline-teal-500 z-30 shadow-lg' : isCurrentWeek ? 'bg-black text-white' : isSchoolHolidayWeek(w, currentYear) ? 'bg-yellow-200 text-yellow-950 font-black' : 'bg-white'}`} title={getSchoolHolidayName(w, currentYear)}>
                    {isCurrentWeek && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-blue-500 text-[6px] text-white px-1.5 py-0.5 rounded-full font-black animate-pulse shadow-lg border border-white z-10">
                        NOW
                      </div>
                    )}
                    <div className={`text-[7px] border-b mb-0.5 leading-tight ${isCurrentWeek ? 'border-gray-700 text-gray-400 font-bold' : 'border-gray-100 text-gray-300'}`}>{getMonthForWeek(w)}</div>
                    <span className={isCurrentWeek ? 'text-white' : ''}>{String(w).padStart(2, '0')}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {!isSandbox && entity !== 'Siège' && (
              <>
                <tr className="bg-indigo-50/10 hover:bg-indigo-50/20 font-semibold border-b border-gray-300">
                  <td className="border border-gray-400 p-1 font-extrabold sticky left-0 z-30 bg-indigo-50/90 text-center text-[11px] text-indigo-900 border-l-4 border-l-indigo-500 shadow-[2px_0_10px_rgba(0,0,0,0.05)] uppercase tracking-wider whitespace-nowrap" title="Validation MR">
                    VAL. MR
                  </td>
                  {weeks.map(weekNum => {
                    const weekStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
                    const validation = validations.find(v => v.entity === entity && v.week_str === weekStr);
                    const mrValidated = validation ? validation.mr_chef_validated : false;
                    const canValidateMR = (user.role === 'admin') || ((user.profil || '').toUpperCase().includes('CHEF') && user.entity === entity);
                    const isCurrentWeek = weekStr === currentWeekStr;

                    const isHoveredCol = hoveredEqCell?.week === weekNum;
                    return (
                      <td 
                        key={`mr-${weekNum}`} 
                        className={`border border-gray-400 p-0.5 text-center relative max-h-7 group/val ${isHoveredCol ? 'border-x-2 border-x-teal-500 bg-teal-50/20 z-10' : isCurrentWeek ? 'bg-blue-50/30 font-bold border-x-2 border-x-blue-500/30' : ''}`}
                      >
                        <div className="w-full h-full flex items-center justify-center min-h-[22px]">
                          {mrValidated ? (
                            <div className="relative flex items-center justify-center group/tooltip">
                              <span 
                                className="px-1 py-0.5 bg-green-500 text-white rounded text-[8px] font-black tracking-tighter shadow-sm flex items-center justify-center min-w-[18px]"
                                title={validation?.mr_signature}
                              >
                                VM
                              </span>
                              
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-[99] pointer-events-none animate-in fade-in zoom-in duration-150">
                                <div className="bg-gray-900 text-white text-[9px] py-1 px-3 rounded-lg whitespace-nowrap shadow-2xl border border-white/10 relative">
                                  {validation?.mr_signature}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>

                              {user.role === 'admin' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnvalidateWeek(weekNum, 'MR');
                                  }}
                                  className="absolute -top-1 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0 flex items-center justify-center w-3 h-3 hover:scale-125 transition-transform shadow"
                                  title="Annuler la validation Chef MR"
                                >
                                  <span className="text-[7px] font-bold leading-none">×</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            canValidateMR ? (
                              <button
                                onClick={() => handleValidateWeek(weekNum, 'MR')}
                                className="px-1 py-0.5 bg-amber-500 text-white rounded text-[8px] font-black hover:bg-amber-600 active:scale-90 transition-all uppercase tracking-tighter shadow-sm cursor-pointer flex items-center justify-center min-w-[18px]"
                                title="Cliquer pour valider la semaine en tant que Chef MR (VM)"
                              >
                                VM
                              </button>
                            ) : (
                              <span className="text-[9px] text-gray-300 font-bold tracking-tight" title="Validation MR en attente">-</span>
                            )
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                <tr className="bg-indigo-50/5 hover:bg-indigo-50/10 font-semibold border-b border-gray-350">
                  <td className="border border-gray-400 p-1 font-extrabold sticky left-0 z-30 bg-indigo-50/90 text-center text-[11px] text-indigo-900 border-l-4 border-l-sky-500 shadow-[2px_0_10px_rgba(0,0,0,0.05)] uppercase tracking-wider whitespace-nowrap" title="Validation DT">
                    VAL. DT
                  </td>
                  {weeks.map(weekNum => {
                    const weekStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
                    const validation = validations.find(v => v.entity === entity && v.week_str === weekStr);
                    const mrValidated = validation ? validation.mr_chef_validated : false;
                    const dtValidated = validation ? validation.dt_chef_validated : false;
                    const canValidateDT = (user.role === 'admin') || (user.profil === 'Chef DT');
                    const isCurrentWeek = weekStr === currentWeekStr;

                    const isHoveredCol = hoveredEqCell?.week === weekNum;
                    return (
                      <td 
                        key={`dt-${weekNum}`} 
                        className={`border border-gray-400 p-0.5 text-center relative max-h-7 group/val ${isHoveredCol ? 'border-x-2 border-x-teal-500 bg-teal-50/20 z-10' : isCurrentWeek ? 'bg-blue-50/30 font-bold border-x-2 border-x-blue-500/30' : ''}`}
                      >
                        <div className="w-full h-full flex items-center justify-center min-h-[22px]">
                          {dtValidated ? (
                            <div className="relative flex items-center justify-center group/tooltip">
                              <span 
                                className="px-1 py-0.5 bg-sky-500 text-white rounded text-[8px] font-black tracking-tighter shadow-sm flex items-center justify-center min-w-[18px]"
                                title={validation?.dt_signature}
                              >
                                VD
                              </span>
                              
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-[99] pointer-events-none animate-in fade-in zoom-in duration-150">
                                <div className="bg-gray-900 text-white text-[9px] py-1 px-3 rounded-lg whitespace-nowrap shadow-2xl border border-white/10 relative">
                                  {validation?.dt_signature}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>

                              {user.role === 'admin' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnvalidateWeek(weekNum, 'DT');
                                  }}
                                  className="absolute -top-1 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0 flex items-center justify-center w-3 h-3 hover:scale-125 transition-transform shadow"
                                  title="Annuler la validation Chef DT"
                                >
                                  <span className="text-[7px] font-bold leading-none">×</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            mrValidated ? (
                              canValidateDT ? (
                                <button
                                  onClick={() => handleValidateWeek(weekNum, 'DT')}
                                  className="px-1 py-0.5 bg-indigo-600 text-white rounded text-[8px] font-black hover:bg-indigo-700 active:scale-90 transition-all uppercase tracking-tighter shadow-sm cursor-pointer flex items-center justify-center min-w-[18px]"
                                  title="Cliquer pour valider la semaine en tant que Chef DT (VD)"
                                >
                                  VD
                                </button>
                              ) : (
                                <span className="text-[8px] text-amber-600 font-extrabold uppercase tracking-tight" title="En attente de validation Chef DT (VD)">AD</span>
                              )
                            ) : (
                              <span className="text-[9px] text-gray-350 font-black tracking-tight" title="En attente de validation MR d'abord">-</span>
                            )
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </>
            )}
            {groupedUsers.map(group => (
              <React.Fragment key={group.id}>
                {group.usersByGroup.map((u, uIdx) => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${group.rowBg || ''}`}>
                    <td className={`border border-gray-400 p-0.5 font-black sticky left-0 z-30 ${group.rowBg || 'bg-white'} text-center text-xs border-l-4 ${group.borderColor || ''}`} title={`${u.firstname} ${u.lastname}`}>
                      {u.trigram}
                    </td>
                    {weeks.map(weekNum => {
                      const dateStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
                      const entry = getWeekEntry(u.id, weekNum, currentYear, entries, isSandbox, u.entity, leaves, u);
                      const isEditing = editingCell?.userId === u.id && editingCell?.week === weekNum;
                      const isChefOfEntity = (user.profil || '').toUpperCase().includes('CHEF') && user.entity === entity;
                      const isAgentUser = user.role === 'user' && !isChefOfEntity;
                      const isAdmin = user.role === 'admin';
                      const canEdit = isAdmin || 
                                      isChefOfEntity || 
                                      (user.id === u.id && (
                                        entity === 'Siège' || 
                                        isSandbox || 
                                        !isAgentUser
                                      ));

                      const showAbove = (group.usersByGroup.length - uIdx <= 2) && (uIdx > 0);

                      const isHoveredCol = hoveredEqCell?.week === weekNum;
                      return (
                        <td key={weekNum} className={`border border-gray-400 p-0 text-center relative h-7 hover:z-50 ${isHoveredCol ? 'border-x-2 border-x-teal-500 bg-teal-50/20 z-10' : dateStr === currentWeekStr ? 'bg-blue-50/40 border-x-2 border-x-blue-500/30' : isSchoolHolidayWeek(weekNum, currentYear) ? 'bg-yellow-50/20' : ''}`} title={getSchoolHolidayName(weekNum, currentYear)}>
                          <div 
                            onClick={(e) => {
                              if (canEdit) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setEditingCell({ 
                                  userId: u.id, 
                                  week: weekNum,
                                  x: rect.left + rect.width / 2,
                                  y: rect.bottom
                                });
                                setTempComment(entry?.comment || '');
                              }
                            }}
                            className={`group/cell w-full h-full flex flex-col items-center justify-center font-bold cursor-pointer transition-all hover:brightness-95 ${getStatusColor(entry?.status || '', isSandbox)}`}
                            style={entry?.border_color ? { 
                              backgroundColor: entry.border_color, 
                              borderColor: entry.border_color, 
                              color: (entry.border_color === '#4FB6E1' || entry.border_color === '#FDE047' || entry.border_color === '#facc15') ? '#000000' : '#ffffff'
                            } : {}}
                          >
                            <span>{getYearlyDisplayStatus(entry?.status || '', entity)}</span>
                            {entity === 'Siège' && entry && (entry.status || entry.hoverTooltip) ? (
                              <div className={`absolute ${showAbove ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 hidden group-hover/cell:block z-50 pointer-events-none animate-in fade-in zoom-in duration-200`}>
                                <div className="bg-gray-900 text-white text-[10px] py-1.5 px-3 rounded-lg whitespace-nowrap shadow-2xl border border-white/10 relative flex flex-col gap-1 items-center">
                                  <span className="font-extrabold text-[11px] text-yellow-300">DÉTAIL DE LA SEMAINE</span>
                                  <span className="text-[10px] text-white font-mono">{entry.hoverTooltip}</span>
                                  {entry.comment && (
                                    <span className="text-[9px] text-gray-200 border-t border-gray-700 pt-1 w-full text-center whitespace-normal max-w-[220px]">
                                      {entry.comment}
                                    </span>
                                  )}
                                  {showAbove ? (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  ) : (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                                  )}
                                </div>
                              </div>
                            ) : entity === 'MR-MGA' && entry?.status ? (() => {
                              const fullList = getStatusList('MR-MGA');
                              const statusInfo = fullList.find(s => s.code === entry.status);
                              if (!statusInfo) return null;
                              return (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-[99] pointer-events-none animate-in fade-in zoom-in duration-200">
                                  <div className="bg-gray-900 text-white text-[10px] py-1.5 px-3 rounded-lg whitespace-nowrap shadow-2xl border border-white/10 relative flex flex-col gap-1 items-center">
                                    <span className="font-extrabold text-[11px] text-yellow-300">{statusInfo.label} ({statusInfo.code})</span>
                                    {statusInfo.description && (
                                      <span className="text-[9px] text-gray-300">{statusInfo.description}</span>
                                    )}
                                    {entry.comment && (
                                      <span className="text-[9px] text-gray-200 border-t border-gray-700 pt-1 w-full text-center whitespace-pre-wrap">
                                        {entry.comment}
                                      </span>
                                    )}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              );
                            })() : (
                              entry?.comment && entity !== 'MR-TTA' && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-50 pointer-events-none animate-in fade-in zoom-in duration-200">
                                  <div className="bg-gray-900 text-white text-[10px] py-1 px-3 rounded-lg whitespace-nowrap shadow-2xl border border-white/10 relative">
                                    {entry.comment}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              )
                            )}
                            {entry?.comment && entity !== 'MR-TTA' && <div className="w-1 h-1 bg-black/30 rounded-full mt-0.5"></div>}
                          </div>
                        </td>
                  );
                })}
              </tr>
            ))}
          </React.Fragment>
        ))}

        {entity === 'MR-MGA' && (
          <>
            <tr className="bg-gray-200 font-extrabold uppercase tracking-widest text-gray-750 text-[10px]">
              <td className="border border-gray-400 p-0.5 font-black sticky left-0 z-30 bg-gray-200 text-center text-xs border-l-4 border-l-teal-600 select-none uppercase tracking-wider whitespace-nowrap">
                MISSIONS CNS/ATM
              </td>
              {weeks.map(weekNum => {
                const isHoveredCol = hoveredEqCell?.week === weekNum;
                return (
                  <td key={weekNum} className={`border border-gray-400 p-0 text-center relative h-7 bg-gray-200 font-black text-[9px] text-gray-700 ${isHoveredCol ? 'border-x-2 border-x-teal-500 bg-teal-100 text-teal-950 font-black z-10 shadow-lg' : ''}`}>
                    <div className="w-full h-full flex items-center justify-center select-none">
                      {String(weekNum).padStart(2, '0')}
                    </div>
                  </td>
                );
              })}
            </tr>
            {MR_MGA_EQUIPMENTS.filter(eq => !eq.subCategory || eq.subCategory === 'CNS/ATM').map((eq) => {
              const isRowHovered = hoveredEqCell?.eqId === eq.id;
              
              // Count non-empty cells for this equipment in this year
              const eqEntries = entries.filter(e => 
                e.user_id === eq.id && 
                e.status && 
                e.status !== '' && 
                e.date && 
                e.date.startsWith(`${currentYear}-W`)
              );
              const nonEmptyCount = eqEntries.length;
              
              const target = getEquipmentTargetValue(eq.trigram, eq.subCategory);
              
              // Determine color class
              let colorClass = '';
              if (nonEmptyCount === 0) {
                colorClass = 'bg-rose-500 text-white border-l-rose-700';
              } else if (nonEmptyCount >= target) {
                colorClass = 'bg-emerald-500 text-white border-l-emerald-700';
              } else {
                colorClass = 'bg-amber-500 text-white border-l-amber-700';
              }

              return (
                <tr key={eq.id} className="hover:bg-gray-50 transition-colors bg-white">
                  <td className={`border border-gray-400 p-0.5 font-black sticky left-0 z-30 text-center text-xs border-l-4 ${colorClass} ${isRowHovered ? 'outline outline-2 outline-teal-500 shadow-lg z-40' : ''}`} title={`${eq.trigram} (Saisie : ${nonEmptyCount}/${target})`}>
                    {eq.trigram} ({nonEmptyCount}/{target})
                  </td>
                  {weeks.map(weekNum => {
                    const dateStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
                    const entry = getWeekEntry(eq.id, weekNum, currentYear, entries, isSandbox, 'MR-MGA', [], eq);
                    const isEditing = editingCell?.userId === eq.id && editingCell?.week === weekNum;
                    const isChefOfEntity = (user.profil || '').toUpperCase().includes('CHEF') && user.entity === entity;
                    const isAdmin = user.role === 'admin';
                    const canEdit = isAdmin || isChefOfEntity || (user.entity === 'MR-MGA');

                    const isColHovered = hoveredEqCell?.week === weekNum;
                    const isIntersection = isRowHovered && isColHovered;

                    return (
                      <td 
                        key={weekNum} 
                        onMouseEnter={() => setHoveredEqCell({ eqId: eq.id, week: weekNum })}
                        onMouseLeave={() => setHoveredEqCell(null)}
                        className={`border border-gray-400 p-0 text-center relative h-7 hover:z-50 ${
                          isIntersection ? 'outline outline-2 outline-teal-600 z-50 bg-teal-100/40' :
                          isRowHovered ? 'border-y-2 border-y-teal-500 bg-teal-50/15 z-10' :
                          isColHovered ? 'border-x-2 border-x-teal-500 bg-teal-50/15 z-10' :
                          dateStr === currentWeekStr ? 'bg-blue-50/40 border-x-2 border-x-blue-500/30' : 
                          isSchoolHolidayWeek(weekNum, currentYear) ? 'bg-yellow-50/20' : ''
                        }`} 
                        title={getSchoolHolidayName(weekNum, currentYear)}
                      >
                        <div 
                          onClick={(e) => {
                            if (canEdit) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setEditingCell({ 
                                userId: eq.id, 
                                week: weekNum,
                                x: rect.left + rect.width / 2,
                                y: rect.bottom
                              });
                              setTempComment(entry?.comment || '');
                            }
                          }}
                          className={`group/cell w-full h-full flex flex-col items-center justify-center font-bold cursor-pointer transition-all hover:brightness-95 ${getStatusColor(entry?.status || '', isSandbox)}`}
                        >
                          <span>{entry?.status || ''}</span>
                          {entry?.status && (() => {
                            let label = entry.status;
                            let desc = '';
                            if (entry.status === 'PRV') { label = 'PRV'; desc = 'Prévision'; }
                            else if (entry.status === 'ORG') { label = 'ORG'; desc = 'Organisé'; }
                            else if (entry.status === 'REA') { label = 'REA'; desc = 'Réalisé'; }
                            
                            return (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-[99] pointer-events-none animate-in fade-in zoom-in duration-200">
                                <div className="bg-gray-900 text-white text-[10px] py-1.5 px-3 rounded-lg whitespace-nowrap shadow-2xl border border-white/10 relative flex flex-col gap-1 items-center">
                                  <span className="font-extrabold text-[11px] text-yellow-300">{desc} ({label})</span>
                                  {entry.comment && (
                                    <span className="text-[9px] text-gray-200 border-t border-gray-700 pt-1 w-full text-center whitespace-pre-wrap">
                                      {entry.comment}
                                    </span>
                                  )}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            );
                          })()}
                          {entry?.comment && <div className="w-1 h-1 bg-black/30 rounded-full mt-0.5"></div>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="bg-gray-200 font-extrabold uppercase tracking-widest text-gray-750 text-[10px]">
              <td className="border border-gray-400 p-0.5 font-black sticky left-0 z-30 bg-gray-200 text-center text-xs border-l-4 border-l-teal-600 select-none uppercase tracking-wider whitespace-nowrap">
                MISSIONS SE
              </td>
              {weeks.map(weekNum => {
                const isHoveredCol = hoveredEqCell?.week === weekNum;
                return (
                  <td key={weekNum} className={`border border-gray-400 p-0 text-center relative h-7 bg-gray-200 font-black text-[9px] text-gray-700 ${isHoveredCol ? 'border-x-2 border-x-teal-500 bg-teal-100 text-teal-950 font-black z-10 shadow-lg' : ''}`}>
                    <div className="w-full h-full flex items-center justify-center select-none">
                      {String(weekNum).padStart(2, '0')}
                    </div>
                  </td>
                );
              })}
            </tr>
            {MR_MGA_EQUIPMENTS.filter(eq => eq.subCategory === 'SE').map((eq) => {
              const isRowHovered = hoveredEqCell?.eqId === eq.id;
              
              // Count non-empty cells for this equipment in this year
              const eqEntries = entries.filter(e => 
                e.user_id === eq.id && 
                e.status && 
                e.status !== '' && 
                e.date && 
                e.date.startsWith(`${currentYear}-W`)
              );
              const nonEmptyCount = eqEntries.length;
              
              const target = getEquipmentTargetValue(eq.trigram, eq.subCategory);
              
              // Determine color class
              let colorClass = '';
              if (nonEmptyCount === 0) {
                colorClass = 'bg-rose-500 text-white border-l-rose-700';
              } else if (nonEmptyCount >= target) {
                colorClass = 'bg-emerald-500 text-white border-l-emerald-700';
              } else {
                colorClass = 'bg-amber-500 text-white border-l-amber-700';
              }

              return (
                <tr key={eq.id} className="hover:bg-gray-50 transition-colors bg-white">
                  <td className={`border border-gray-400 p-0.5 font-black sticky left-0 z-30 text-center text-xs border-l-4 ${colorClass} ${isRowHovered ? 'outline outline-2 outline-teal-500 shadow-lg z-40' : ''}`} title={`${eq.trigram} (Saisie : ${nonEmptyCount}/${target})`}>
                    {eq.trigram} ({nonEmptyCount}/{target})
                  </td>
                  {weeks.map(weekNum => {
                    const dateStr = `${currentYear}-W${String(weekNum).padStart(2, '0')}`;
                    const entry = getWeekEntry(eq.id, weekNum, currentYear, entries, isSandbox, 'MR-MGA', [], eq);
                    const isEditing = editingCell?.userId === eq.id && editingCell?.week === weekNum;
                    const isChefOfEntity = (user.profil || '').toUpperCase().includes('CHEF') && user.entity === entity;
                    const isAdmin = user.role === 'admin';
                    const canEdit = isAdmin || isChefOfEntity || (user.entity === 'MR-MGA');

                    const isColHovered = hoveredEqCell?.week === weekNum;
                    const isIntersection = isRowHovered && isColHovered;

                    return (
                      <td 
                        key={weekNum} 
                        onMouseEnter={() => setHoveredEqCell({ eqId: eq.id, week: weekNum })}
                        onMouseLeave={() => setHoveredEqCell(null)}
                        className={`border border-gray-400 p-0 text-center relative h-7 hover:z-50 ${
                          isIntersection ? 'outline outline-2 outline-teal-600 z-50 bg-teal-100/40' :
                          isRowHovered ? 'border-y-2 border-y-teal-500 bg-teal-50/15 z-10' :
                          isColHovered ? 'border-x-2 border-x-teal-500 bg-teal-50/15 z-10' :
                          dateStr === currentWeekStr ? 'bg-blue-50/40 border-x-2 border-x-blue-500/30' : 
                          isSchoolHolidayWeek(weekNum, currentYear) ? 'bg-yellow-50/20' : ''
                        }`} 
                        title={getSchoolHolidayName(weekNum, currentYear)}
                      >
                        <div 
                          onClick={(e) => {
                            if (canEdit) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setEditingCell({ 
                                userId: eq.id, 
                                week: weekNum,
                                x: rect.left + rect.width / 2,
                                y: rect.bottom
                              });
                              setTempComment(entry?.comment || '');
                            }
                          }}
                          className={`group/cell w-full h-full flex flex-col items-center justify-center font-bold cursor-pointer transition-all hover:brightness-95 ${getStatusColor(entry?.status || '', isSandbox)}`}
                        >
                          <span>{entry?.status || ''}</span>
                          {entry?.status && (() => {
                            let label = entry.status;
                            let desc = '';
                            if (entry.status === 'PRV') { label = 'PRV'; desc = 'Prévision'; }
                            else if (entry.status === 'ORG') { label = 'ORG'; desc = 'Organisé'; }
                            else if (entry.status === 'REA') { label = 'REA'; desc = 'Réalisé'; }
                            
                            return (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-[99] pointer-events-none animate-in fade-in zoom-in duration-200">
                                <div className="bg-gray-900 text-white text-[10px] py-1.5 px-3 rounded-lg whitespace-nowrap shadow-2xl border border-white/10 relative flex flex-col gap-1 items-center">
                                  <span className="font-extrabold text-[11px] text-yellow-300">{desc} ({label})</span>
                                  {entry.comment && (
                                    <span className="text-[9px] text-gray-200 border-t border-gray-700 pt-1 w-full text-center whitespace-pre-wrap">
                                      {entry.comment}
                                    </span>
                                  )}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            );
                          })()}
                          {entry?.comment && <div className="w-1 h-1 bg-black/30 rounded-full mt-0.5"></div>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </>
        )}
      </tbody>
        </table>
      </div>
      <AnimatePresence>
        {editingCell && (() => {
          const editedUser = editingCell.userId < 0
            ? MR_MGA_EQUIPMENTS.find(eq => eq.id === editingCell.userId)
            : users.find(u => u.id === editingCell.userId);
          const currentEditedEntry = getWeekEntry(editingCell.userId, editingCell.week, currentYear, entries, isSandbox, editedUser?.entity, leaves, editedUser);
          const userDisplayName = editedUser ? `${editedUser.firstname || ''} ${editedUser.lastname || ''}`.trim() : '';
          const isChefOfEntity = (user.profil || '').toUpperCase().includes('CHEF') && user.entity === entity;
          return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={() => setEditingCell(null)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl border-4 border-black p-6 w-full max-w-[340px] max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-8 bg-indigo-600 rounded-full" />
                    <div>
                      <h3 className="text-[12px] font-black text-gray-900 uppercase tracking-[0.2em]">Saisie Statut</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                        {userDisplayName || 'Agent'} <span className="text-gray-300">|</span> Sem. {String(editingCell.week).padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setEditingCell(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-black">
                    <X size={20} />
                  </button>
                </div>

                {(user.role === 'admin' || 
                  (user.role === 'user' && (isSandbox || isChefOfEntity || entity === 'Siège' || editingCell.userId < 0)) || 
                  (isChefOfEntity) || 
                  (isSandbox && (entity === 'MR-TTA' || entity === 'MR-MGA'))) ? (
                  <div className="grid grid-cols-4 gap-2 mb-6 p-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                    {(editingCell.userId < 0 ? [
                      { code: 'PRV', label: 'Prévision' },
                      { code: 'ORG', label: 'Organisé' },
                      { code: 'REA', label: 'Réalisé' }
                    ] : statusLegend).map(s => {
                      const isOFFRIT = s.code === 'OFF+RIT';
                      const isMSRIT = s.code === 'MS+RIT';
                      const isMORIT = s.code === 'MO+RIT';
                      let btnStyle: React.CSSProperties | undefined = undefined;
                      let btnClass = `${getStatusColor(s.code, isSandbox, entity)} shadow-sm hover:shadow-lg`;

                      if (isOFFRIT) {
                        btnStyle = {
                          background: 'linear-gradient(to bottom right, #ffffff 50%, #E77E31 50%)',
                          color: '#000000',
                          borderColor: '#d76e21'
                        };
                        btnClass = 'shadow-sm hover:shadow-lg';
                      } else if (isMSRIT) {
                        btnStyle = {
                          background: 'linear-gradient(to bottom right, #FFDF20 50%, #E77E31 50%)',
                          color: '#000000',
                          borderColor: '#d76e21'
                        };
                        btnClass = 'shadow-sm hover:shadow-lg';
                      } else if (isMORIT) {
                        btnStyle = {
                          background: 'linear-gradient(to bottom right, #BAE6FD 50%, #E77E31 50%)',
                          color: '#000000',
                          borderColor: '#7dd3fc'
                        };
                        btnClass = 'shadow-sm hover:shadow-lg';
                      }

                      return (
                        <button
                          key={s.code}
                          onClick={() => handleStatusChange(editingCell.userId, editingCell.week, s.code, tempComment)}
                          className={`h-10 flex items-center justify-center rounded-xl text-[11px] font-black border transition-all hover:scale-110 active:scale-95 ${btnClass}`}
                          style={btnStyle}
                          title={s.label}
                        >
                          {s.code === 'OFF+RIT' ? 'OFF + RIT' : (s.code === 'MS+RIT' ? 'MS + RIT' : (s.code === 'MO+RIT' ? 'MO + RIT' : s.code))}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between shadow-inner">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Statut actuel:</span>
                    <span className={`px-4 py-1.5 rounded-xl text-[12px] font-black shadow-sm ${getStatusColor(currentEditedEntry?.status || '', isSandbox)}`}>
                      {currentEditedEntry?.status || '-'}
                    </span>
                  </div>
                )}
                
                <div className="space-y-5">
                  {(user.id === editingCell.userId || user.role === 'admin' || (user.profil || '').toUpperCase().includes('CHEF')) && (
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase mb-2.5 ml-1 tracking-[0.2em]">Commentaire / Note</label>
                      <textarea 
                        autoFocus
                        value={tempComment}
                        onChange={(e) => setTempComment(e.target.value)}
                        className="w-full p-4 border-2 border-gray-100 rounded-2xl text-[13px] h-32 resize-none outline-none focus:border-black transition-colors font-medium bg-gray-50/30"
                        placeholder="Note particulière pour cette semaine..."
                      />
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleStatusChange(editingCell.userId, editingCell.week, '', '')}
                      className="flex-1 py-4 rounded-2xl text-[10px] font-black border-2 border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-red-500 hover:border-red-100 uppercase tracking-widest transition-all"
                    >
                      Effacer
                    </button>
                    <button
                      onClick={() => handleStatusChange(editingCell.userId, editingCell.week, currentEditedEntry?.status || '', tempComment)}
                      className="flex-[2] py-4 rounded-2xl text-[10px] font-black bg-black text-white shadow-2xl hover:bg-gray-800 transition-all uppercase tracking-[0.2em] active:scale-95"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

const TDSGrid = ({ entity, user, isSandbox = false, onUpdate, showNotification }: { entity: Entity, user: User, isSandbox?: boolean, onUpdate?: () => void, showNotification: (msg: string, type?: 'success' | 'error') => void }) => {
  const [entries, setEntries] = useState<TDSEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [displayDate, setDisplayDate] = useState(currentDate);
  const [visibleDays, setVisibleDays] = useState<Date[]>([]);
  const [shouldScrollToCurrent, setShouldScrollToCurrent] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [editingCell, setEditingCell] = useState<{ userId: number, date: string } | null>(null);
  const [tempComment, setTempComment] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState({
    userId: user.id,
    startDate: formatDateLocal(new Date()),
    endDate: formatDateLocal(new Date()),
    status: 'SEC',
    comment: ''
  });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [validations, setValidations] = useState<TDSValidation[]>([]);
  const [appUpdates, setAppUpdates] = useState<any[]>([]);
  const [equipmentInterventions, setEquipmentInterventions] = useState<any[]>([]);
  const [selectedEquipments, setSelectedEquipments] = useState<any[]>([]);
  const [mgaMissions, setMgaMissions] = useState<any[]>([]);
  const [mgaEquipments, setMgaEquipments] = useState<any[]>([]);

  const unifiedEquipments = useMemo(() => {
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

  const fetchData = async () => {
    try {
      const [usersRes, entriesRes, leavesRes, validationsRes, updatesRes, interventionsRes, missionsRes, equipmentsRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/tds?entity=${entity}&is_sandbox=${isSandbox}`),
        fetch('/api/leaves'),
        fetch('/api/validations'),
        fetch('/api/updates'),
        fetch(`/api/equipment_interventions?is_sandbox=${isSandbox}`),
        fetch('/api/mga_missions'),
        fetch('/api/mga_equipments')
      ]);

      if (!usersRes.ok || !entriesRes.ok || !leavesRes.ok || !validationsRes.ok) {
        throw new Error("Certaines API n'ont pas répondu correctement.");
      }

      const usersData = await usersRes.json();
      // Filter out secretaries from the schedule view
      setUsers(Array.isArray(usersData) ? usersData.filter((u: any) => u.role !== 'secretary') : []);
      setEntries(await entriesRes.json());
      setLeaves(await leavesRes.json());
      setValidations(await validationsRes.json());
      if (updatesRes.ok) {
        setAppUpdates(await updatesRes.json());
      }
      if (interventionsRes && interventionsRes.ok) {
        setEquipmentInterventions(await interventionsRes.json());
      }
      if (missionsRes && missionsRes.ok) {
        setMgaMissions(await missionsRes.json());
      }
      if (equipmentsRes && equipmentsRes.ok) {
        setMgaEquipments(await equipmentsRes.json());
      }
    } catch (e) {
      console.error("[FETCH ERROR]", e);
      // Ne pas planter l'application, laisser l'état actuel
    }
  };

  const handleValidate = async (role: 'MR' | 'DT') => {
    const weekStr = getWeekStr(displayDate);
    try {
      const res = await fetch('/api/tds/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity,
          week_str: weekStr,
          role,
          validator_trigram: user.trigram
        })
      });
      if (res.ok) {
        showNotification(`Semaine ${weekStr.split('-W')[1]} validée en tant que Chef ${role}`);
        fetchData();
      }
    } catch (e) {
      showNotification("Erreur lors de la validation", 'error');
    }
  };

  const handleNotifyValidation = async () => {
    const weekStr = getWeekStr(displayDate);
    try {
      const res = await fetch('/api/tds/notify-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity,
          week_str: weekStr,
          initiator_trigram: user.trigram
        })
      });
      if (res.ok) {
        showNotification("Notification envoyée aux Chefs MR");
      }
    } catch (e) {
      showNotification("Erreur lors de l'envoi de la notification", 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, [entity, isSandbox]);

  // Initial load of days
  useEffect(() => {
    const initialDays = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - 15); // Start 15 days before
    for (let i = 0; i < 45; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      initialDays.push(d);
    }
    setVisibleDays(initialDays);
    setDisplayDate(currentDate);
    setShouldScrollToCurrent(true);
  }, [currentDate]);

  useEffect(() => {
    if (shouldScrollToCurrent && scrollContainerRef.current && visibleDays.length > 0) {
      const todayStr = formatDateLocal(currentDate);
      const index = visibleDays.findIndex(d => formatDateLocal(d) === todayStr);
      if (index !== -1) {
        // Attempt to find the specific day row DOM element for precise scrolling
        const rowElement = document.getElementById(`row-${todayStr}`);
        if (rowElement && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const thead = container.querySelector('thead');
          const headerHeight = thead ? thead.offsetHeight : 0;
          const containerRect = container.getBoundingClientRect();
          const rowRect = rowElement.getBoundingClientRect();
          // Scroll the row to the very top, minus the sticky header height
          container.scrollTop = container.scrollTop + (rowRect.top - containerRect.top) - headerHeight;
        } else {
          scrollContainerRef.current.scrollTop = index * 64;
        }
        setShouldScrollToCurrent(false);
      }
    }
  }, [visibleDays, shouldScrollToCurrent, currentDate]);

  const handleScroll = () => {
    if (!scrollContainerRef.current || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    // Update display month based on scroll position
    const rowHeight = 64; // h-16
    const index = Math.floor(scrollTop / rowHeight);
    if (visibleDays[index]) {
      const newDisplayDate = visibleDays[index];
      if (newDisplayDate.getMonth() !== displayDate.getMonth() || newDisplayDate.getFullYear() !== displayDate.getFullYear()) {
        setDisplayDate(newDisplayDate);
      }
    }

    // Load more at bottom
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setIsLoadingMore(true);
      const lastDay = visibleDays[visibleDays.length - 1];
      const newDays = [];
      for (let i = 1; i <= 15; i++) {
        const d = new Date(lastDay);
        d.setDate(lastDay.getDate() + i);
        newDays.push(d);
      }
      setVisibleDays(prev => [...prev, ...newDays]);
      setIsLoadingMore(false);
    }

    // Load more at top
    if (scrollTop <= 100) {
      setIsLoadingMore(true);
      const firstDay = visibleDays[0];
      const newDays = [];
      for (let i = 15; i >= 1; i--) {
        const d = new Date(firstDay);
        d.setDate(firstDay.getDate() - i);
        newDays.push(d);
      }
      
      // Maintain scroll position
      const oldScrollHeight = scrollHeight;
      setVisibleDays(prev => [...newDays, ...prev]);
      
      // We need to wait for the DOM to update before adjusting scroll
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const newScrollHeight = scrollContainerRef.current.scrollHeight;
          scrollContainerRef.current.scrollTop = scrollTop + (newScrollHeight - oldScrollHeight);
        }
        setIsLoadingMore(false);
      }, 0);
    }
  };

  const handleStatusChange = async (userId: number, date: string, status: string, comment?: string) => {
    const res = await fetch('/api/tds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, date, status, comment, is_sandbox: isSandbox }),
    });
    if (res.ok) {
      if (entity === 'MR-MGA' && user?.trigram?.toUpperCase() === 'DSO') {
        await fetch('/api/equipment_interventions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, date, equipment_ids: selectedEquipments, is_sandbox: isSandbox }),
        });
      }
      setEditingCell(null);
      fetchData();
      if (onUpdate) onUpdate();
    }
  };

  const days = visibleDays;
  const monthName = displayDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
  const statusLegend = getStatusList(entity);
  const filteredUsers = (Array.isArray(users) ? users : []).filter(u => 
    u.entity === entity && 
    u.role !== 'secretary' &&
    !['secrétaire', 'secretaire'].includes((u.profil || '').toLowerCase()) &&
    !(u.lastname || '').toUpperCase().includes('SECRETAIRE')
  );

  useEffect(() => {
    if (showBulkModal) {
      const legend = getStatusList(entity);
      const defaultAgentId = filteredUsers.some(u => u.id === user.id) 
        ? user.id 
        : (filteredUsers[0]?.id || user.id);
      if (legend && legend.length > 0) {
        setBulkData(prev => ({
          ...prev,
          userId: defaultAgentId,
          status: legend[0].code,
          comment: ''
        }));
      }
    }
  }, [showBulkModal, entity]);

  // Sector grouping for MR-TTA
  const getSector = (u: User) => {
    if (entity !== 'MR-TTA') return null;
    const p = (u.profil || '').toUpperCase();
    if (p.includes('CHEF')) return 'CHEF';
    if (p.includes('ATM')) return 'ATM';
    if (p.includes('CNS')) return 'CNS';
    if (p.includes('SE') || p.includes('ELECTROTECH')) return 'SE';
    return 'ATM';
  };

  const sectors = entity === 'MR-TTA' ? [
    { id: 'CHEF', label: 'CHEF', fullName: 'Chef MR-TTA', color: 'bg-indigo-50', headerColor: 'bg-slate-100 text-slate-500' },
    { id: 'ATM', label: 'ATM', fullName: 'ATM', color: 'bg-blue-50/50', headerColor: 'bg-slate-50 text-slate-400' },
    { id: 'CNS', label: 'CNS', fullName: 'CNS', color: 'bg-green-50/50', headerColor: 'bg-slate-50 text-slate-400' },
    { id: 'SE', label: 'SE', fullName: 'SE', color: 'bg-amber-50/50', headerColor: 'bg-slate-50 text-slate-400' },
  ] : [];

  const groupedUsers = entity === 'MR-TTA' ? sectors.map(s => ({
    ...s,
    users: filteredUsers.filter(u => getSector(u) === s.id)
  })).filter(g => g.users.length > 0) : [{ id: 'none', label: '', fullName: '', users: filteredUsers, color: '', headerColor: '' }];

  const flatGroupedUsers = groupedUsers.flatMap(g => g.users.map(u => ({ ...u, sectorColor: g.color })));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-md border border-gray-300 overflow-hidden">
        <div className="p-8 border-b border-gray-300 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900 capitalize tracking-tight">{monthName}</h2>
              <p className="text-sm text-gray-500 uppercase tracking-[0.2em] font-bold mt-1">{entity} {isSandbox ? '- BAC À SABLE' : ''}</p>
            </div>
            <div className="flex gap-2 ml-4">
              <button onClick={() => {
                const d = new Date(currentDate);
                d.setMonth(d.getMonth() - 1);
                setCurrentDate(d);
              }} className="p-2 hover:bg-white rounded-xl border border-gray-300 shadow-sm transition-all text-gray-700 hover:text-black hover:border-gray-400"><ChevronLeft size={20}/></button>
              <button onClick={() => {
                const d = new Date(currentDate);
                d.setMonth(d.getMonth() + 1);
                setCurrentDate(d);
              }} className="p-2 hover:bg-white rounded-xl border border-gray-300 shadow-sm transition-all text-gray-700 hover:text-black hover:border-gray-400"><ChevronRight size={20}/></button>
              <button onClick={() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                setCurrentDate(d);
                setShouldScrollToCurrent(true);
              }} className="px-4 py-2 hover:bg-white rounded-xl border border-gray-300 shadow-sm transition-all text-xs font-black text-gray-700 hover:text-black ml-2 uppercase tracking-widest">
                AUJOURD'HUI
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            {user.role !== 'secretary' && user.role !== 'user' && (
              <button 
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-800 rounded-xl text-xs font-black hover:bg-gray-200 transition-all border border-gray-300 shadow-sm uppercase tracking-wider"
              >
                <Plus size={16} /> Mise à jour groupée
              </button>
            )}
          </div>
        </div>

        {/* Validation Panel */}
        {entity !== 'Siège' && entity !== 'MR-MGA' && !isSandbox && (
          <div className={`px-8 ${entity === 'MR-TTA' ? 'py-1.5' : 'py-4'} bg-white border-b border-gray-300 flex flex-col ${entity === 'MR-TTA' ? 'gap-1.5' : 'gap-4'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Validation Hebdomadaire</span>
                  <span className="text-sm font-bold text-gray-900">Semaine {getWeekStr(displayDate).split('-W')[1]}</span>
                  {entity !== 'MR-TTA' && (
                    <span className="text-[9px] text-gray-400">Limite: Mer. S{getWeekStr(new Date(new Date(displayDate).getTime() - 14 * 86400000)).split('-W')[1]}</span>
                  )}
                </div>
                <div className="h-8 w-px bg-gray-200 mx-2"></div>
                {entity === 'MR-TTA' ? (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-black/15 shadow-sm shrink-0" style={{ backgroundColor: '#FFDF20' }}></div>
                      <span className="text-[11px] font-black text-gray-750 uppercase tracking-wider">MS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-black/15 shadow-sm shrink-0" style={{ backgroundColor: '#BAE6FD' }}></div>
                      <span className="text-[11px] font-black text-gray-750 uppercase tracking-wider">MO</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-black/15 shadow-sm shrink-0" style={{ backgroundColor: '#E77E31' }}></div>
                      <span className="text-[11px] font-black text-gray-750 uppercase tracking-wider">RIT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-black/15 shadow-sm shrink-0" style={{ backgroundColor: '#FCCEE8' }}></div>
                      <span className="text-[11px] font-black text-gray-750 uppercase tracking-wider">Astreinte E</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-black/15 shadow-sm shrink-0" style={{ backgroundColor: '#00C950' }}></div>
                      <span className="text-[11px] font-black text-gray-750 uppercase tracking-wider">Congé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-black/15 shadow-sm shrink-0" style={{ backgroundColor: '#8E51FF' }}></div>
                      <span className="text-[11px] font-black text-gray-750 uppercase tracking-wider">Formation</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-10">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.mr_chef_validated ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300 animate-pulse'}`}></div>
                        <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Chef MR</span>
                      </div>
                      {validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.mr_signature && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded italic border border-indigo-100">
                          {validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.mr_signature}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.dt_chef_validated ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300 animate-pulse'}`}></div>
                        <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Chef DT</span>
                      </div>
                      {validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.dt_signature && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded italic border border-indigo-100">
                          {validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.dt_signature}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 items-center">
                {(user.role === 'secretary' || user.role === 'admin') && !validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.mr_chef_validated && (
                  <button 
                    onClick={handleNotifyValidation}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm group"
                  >
                    <Bell size={14} className="group-hover:animate-bounce" />
                    Notifier les Chefs MR
                  </button>
                )}
                {(user.profil || '').toUpperCase().includes('CHEF') && user.entity === entity && !validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.mr_chef_validated && (
                  <button 
                    onClick={() => handleValidate('MR')}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Valider par Chef MR
                  </button>
                )}
                {user.profil === 'Chef DT' && !validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.dt_chef_validated && (
                  <button 
                    onClick={() => handleValidate('DT')}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Valider par Chef DT
                  </button>
                )}
                {validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.mr_chef_validated && validations.find(v => v.entity === entity && v.week_str === getWeekStr(displayDate))?.dt_chef_validated && (
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-green-50 border border-green-200 rounded-xl shadow-sm animate-in fade-in zoom-in">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                      <ShieldCheck size={16} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-green-700 uppercase tracking-widest leading-none">TDS VALIDÉ & DIFFUSÉ</span>
                      <span className="text-[8px] text-green-600 font-bold uppercase mt-1 opacity-70">Statut Officiel</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`overflow-auto ${(entity === 'Siège' || entity === 'MR-MGA') ? 'max-h-[850px]' : 'max-h-[750px]'}`}
        >
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20">
              {entity === 'MR-TTA' && (
                <tr className="bg-gray-100 hidden print:table-row">
                  <th className="sticky left-0 z-30 bg-gray-100 border-r border-gray-300 h-10"></th>
                  {groupedUsers.map(g => (
                    <th key={g.id} colSpan={g.users.length} className={`p-2 border-b border-r border-gray-300 text-center ${g.headerColor}`}>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{g.fullName}</span>
                    </th>
                  ))}
                </tr>
              )}
              <tr className="bg-gray-100">
                {entity === 'MR-MGA' ? (
                  <>
                    <th className="sticky left-0 z-30 bg-gray-100 p-2 text-center border-b border-r border-gray-300 w-[60px] min-w-[60px] max-w-[60px]">
                      <span className="text-xs font-black uppercase tracking-widest text-gray-500">Date</span>
                    </th>
                    <th className="sticky left-[60px] z-30 bg-gray-100 p-1 text-center border-b border-r border-gray-300 w-[64px] min-w-[64px] max-w-[64px]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Équip.</span>
                    </th>
                  </>
                ) : (
                  <th className="sticky left-0 z-30 bg-gray-100 p-4 text-left border-b border-r border-gray-300 min-w-[150px]">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Date</span>
                  </th>
                )}
                {flatGroupedUsers.map(u => (
                  <th key={u.id} className={`p-3 border-b border-r border-gray-300 text-center ${entity === 'MR-MGA' ? 'w-[130px] min-w-[130px] max-w-[130px]' : 'min-w-[120px]'} ${u.sectorColor || 'bg-gray-100'}`} title={`${u.firstname} ${u.lastname}`}>
                    <span className="block text-sm font-black text-gray-900 tracking-normal uppercase">{u.trigram}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((date, i) => {
                const dateStr = formatDateLocal(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const holidays = getNCHolidays(date.getFullYear());
                const holidayName = holidays[dateStr];

                const showWeekSeparator = (entity === 'MR-TTA' || entity === 'MR-MGA') && date.getDay() === 0;
                const nextDay = new Date(date);
                nextDay.setDate(date.getDate() + 1);
                const nextWeekNum = getWeekStr(nextDay).split('-W')[1];

                return (
                  <React.Fragment key={i}>
                    <tr id={`row-${dateStr}`} className={`${isWeekend || holidayName ? 'bg-indigo-100/70' : ''} hover:bg-gray-50 transition-colors`}>
                    <td className={`sticky left-0 z-10 ${isWeekend || holidayName ? 'bg-indigo-100/70' : 'bg-white'} ${entity === 'MR-MGA' ? 'p-1' : 'p-2'} border-b border-r border-gray-300 font-mono text-sm font-bold text-gray-800 ${entity === 'MR-MGA' ? 'w-[60px] min-w-[60px] max-w-[60px] h-auto' : 'h-20'}`}>
                      <div className={`flex flex-col ${entity === 'MR-MGA' ? 'min-h-[72px] justify-center items-center text-center gap-0.5' : ''}`}>
                        {entity === 'MR-MGA' ? (
                          <>
                            <span className="text-[12px] font-black text-gray-900 leading-none">{date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                            <span className={`text-[11px] ${isWeekend || holidayName ? 'text-indigo-600' : 'text-gray-400'} font-black uppercase tracking-wider leading-none`}>{date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
                            <span className="text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded font-black leading-none mt-1">S{getWeekStr(date).split('-W')[1]}</span>
                            {holidayName && (
                              <span className="text-[9px] text-red-600 font-black uppercase tracking-tighter bg-red-50 border border-red-100 px-0.5 rounded block max-w-full truncate mt-1" title={holidayName}>
                                Fér.
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-sm">{date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                              <span className="text-[9px] bg-gray-900 text-white px-1.5 py-0.5 rounded font-black">S{getWeekStr(date).split('-W')[1]}</span>
                            </div>
                            <div className="flex flex-col mt-0.5">
                              <span className={`text-[10px] ${isWeekend || holidayName ? 'text-indigo-600' : 'text-gray-400'} font-black uppercase tracking-widest`}>{date.toLocaleDateString('fr-FR', { weekday: 'long' })}</span>
                              {holidayName && (
                                <span className="text-[8px] text-red-600 font-black uppercase tracking-tighter mt-1 bg-red-50 border border-red-100 px-1 rounded inline-block w-fit max-w-full truncate" title={holidayName}>
                                  {holidayName}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    {entity === 'MR-MGA' && (() => {
                      const weekKey = getWeekStr(date);
                      const daysInThisWeek = days.filter(d => getWeekStr(d) === weekKey);
                      
                      const isWeekendDay = date.getDay() === 0 || date.getDay() === 6;
                      const weekDays = daysInThisWeek.filter(d => d.getDay() >= 1 && d.getDay() <= 5);
                      
                      if (isWeekendDay) {
                        return (
                          <td 
                            className="sticky left-[60px] z-10 bg-indigo-100/70 border-b border-r border-gray-300 w-[64px] min-w-[64px] max-w-[64px] h-full"
                          />
                        );
                      }
                      
                      const firstWeekDay = weekDays[0];
                      const isFirstWeekDay = firstWeekDay && formatDateLocal(firstWeekDay) === formatDateLocal(date);
                      
                      if (!isFirstWeekDay) return null;
                      
                      const rowSpanCount = weekDays.length;
                      
                      // Fetch equipments statuses for this week, split by category
                      const activeCNS = MR_MGA_EQUIPMENTS.filter(eq => !eq.subCategory || eq.subCategory === 'CNS/ATM').map(eq => {
                        const eqEntry = entries.find(e => e.user_id === eq.id && e.date === weekKey);
                        return { trigram: eq.trigram, status: eqEntry?.status || '' };
                      }).filter(item => item.status !== '');

                      const activeSE = MR_MGA_EQUIPMENTS.filter(eq => eq.subCategory === 'SE').map(eq => {
                        const eqEntry = entries.find(e => e.user_id === eq.id && e.date === weekKey);
                        return { trigram: eq.trigram, status: eqEntry?.status || '' };
                      }).filter(item => item.status !== '');
 
                      return (
                        <td 
                          rowSpan={rowSpanCount}
                          className="sticky left-[60px] z-10 bg-slate-50 p-1 border-b border-r border-gray-300 w-[64px] min-w-[64px] max-w-[64px] h-full align-middle text-center"
                        >
                          <div className="flex flex-col h-full justify-between gap-1.5 py-0.5">
                            {/* CNS/ATM Upper Part */}
                            <div className="flex-1 flex flex-col justify-start pb-1 border-b border-dashed border-gray-300">
                              <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1 select-none">CNS/ATM</span>
                              {activeCNS.length > 0 ? (
                                <div className="flex flex-col gap-1 text-[10px] text-teal-800 font-bold select-none leading-tight">
                                  {activeCNS.map(ae => (
                                    <div key={ae.trigram} className="flex flex-col items-center gap-0.5 bg-white border border-teal-100/80 rounded p-1 shadow-xs">
                                      <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">{ae.trigram}</span>
                                      <span className="bg-teal-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-black">{ae.status}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-400 italic font-medium">-</span>
                              )}
                            </div>

                            {/* SE Lower Part */}
                            <div className="flex-1 flex flex-col justify-start pt-1">
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 select-none">SE</span>
                              {activeSE.length > 0 ? (
                                <div className="flex flex-col gap-1 text-[10px] text-teal-800 font-bold select-none leading-tight">
                                  {activeSE.map(ae => (
                                    <div key={ae.trigram} className="flex flex-col items-center gap-0.5 bg-white border border-teal-100/80 rounded p-1 shadow-xs">
                                      <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">{ae.trigram}</span>
                                      <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-black">{ae.status}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-400 italic font-medium">-</span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })()}
                    {flatGroupedUsers.map(u => {
                      const rawDayLeaves = leaves.filter(l => 
                        l.user_id === u.id && 
                        dateStr >= l.start_date && 
                        dateStr <= l.end_date &&
                        l.status !== 'rejected'
                      );
                      const dayLeaves = isWeekend
                        ? resolveActiveLeaves(rawDayLeaves).filter(l => l.type !== 'C' && l.type !== 'CA' && l.type !== 'RTT' && l.type !== 'REC' && l.type !== 'CET')
                        : resolveActiveLeaves(rawDayLeaves);

                      const dbEntry = entries.find(e => e.user_id === u.id && e.date === dateStr) || 
                                     (u.entity === 'MR-MGA' ? undefined : entries.find(e => e.user_id === u.id && e.date === getWeekStr(date)));
                      const hasActiveLeave = dayLeaves && dayLeaves.length > 0;
                      const isTltDayDefault = u.entity === 'Siège' && u.tlt_day && u.tlt_day !== 'Aucun' && getDayNameFr(date) === u.tlt_day && !isWeekend && !hasActiveLeave;
                      const entry = ((dbEntry === undefined) && isTltDayDefault)
                        ? { user_id: u.id, date: dateStr, status: 'TLT', comment: '', is_sandbox: (isSandbox ? 1 : 0) }
                        : dbEntry;
                      const isEditing = editingCell?.userId === u.id && editingCell?.date === dateStr;
                      const isChefOfEntity = (user.profil || '').toUpperCase().includes('CHEF') && user.entity === entity;
                      const canEdit = (user.role === 'admin') || 
                                     (user.id === u.id) ||
                                     isChefOfEntity;
                      const statusInfo = statusLegend.find(s => s.code === entry?.status);

                      const isOutlineOnly = false;
                      const isOffDay = (entry?.status === 'OFF' && entity !== 'MR-MGA') || entry?.status === '';
                      const hasActiveConge = (entry?.status === 'C' || entry?.status === 'CA' || entry?.status === 'RTT' || entry?.status === 'REC' || entry?.status === 'CET') || 
                                             (dayLeaves && dayLeaves.some(l => l.type === 'C' || l.type === 'CA' || l.type === 'RTT' || l.type === 'REC' || l.type === 'CET'));
                      const isWeekendCongeCell = isWeekend && hasActiveConge;
                      
                      let cellStyle = {};
                      let cellClassName = `group/cell w-full flex flex-col items-center justify-center rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.02] shadow-sm ${entity === 'MR-MGA' ? 'h-auto min-h-[72px] py-1.5' : 'h-full'}`;

                      if (isOffDay || isWeekendCongeCell) {
                        cellClassName += ` bg-transparent border-transparent shadow-none`;
                      } else if (isOutlineOnly) {
                        const defaultColor = (s: string) => {
                          switch (s) {
                            case 'MS': return '#eab308';
                            case 'MO': return '#f59e0b';
                            case 'MO+RIT': return '#f97316';
                            case 'MS+RIT': return '#ca8a04';
                            case 'RIT': return '#eab308';
                            default: return '#cbd5e1';
                          }
                        };
                        const finalBorderColor = entry?.border_color || defaultColor(entry?.status || '');
                        cellClassName += ' bg-white';
                        cellStyle = {
                          borderColor: finalBorderColor,
                          borderWidth: '3.5px',
                          color: '#1f2937'
                        };
                      } else {
                        const displayStatus = entry?.status ? getTDSDisplayStatus(entry.status, date, entity) : '';
                        const overrideStyle = entry?.status ? getOverrideStyleForHebdoCell(entry.status, entry.border_color, date, entity) : null;
                        const isMSRIT = displayStatus === 'MS+RIT' || entry?.status === 'MS+RIT';
                        const isMORIT = displayStatus === 'MO+RIT' || entry?.status === 'MO+RIT';
                        const isOFFRIT = displayStatus === 'OFF+RIT' || displayStatus === 'OFF + RIT' || entry?.status === 'OFF+RIT' || entry?.status === 'OFF + RIT';

                        if (overrideStyle) {
                          cellClassName += ` font-bold`;
                          cellStyle = overrideStyle;
                        } else if (isMSRIT) {
                          cellClassName += ` font-bold text-black border-[#eab308]`;
                          cellStyle = {
                            background: 'linear-gradient(to bottom right, #FFDF20 50%, #E77E31 50%)',
                            borderColor: '#eab308',
                            color: '#000000'
                          };
                        } else if (isMORIT) {
                          cellClassName += ` font-bold text-sky-950 border-sky-300`;
                          cellStyle = {
                            background: 'linear-gradient(to bottom right, #BAE6FD 50%, #E77E31 50%)',
                            borderColor: '#7dd3fc',
                            color: '#0c4a6e'
                          };
                        } else if (isOFFRIT) {
                          cellClassName += ` font-bold text-black border-[#d76e21]`;
                          cellStyle = {
                            background: 'linear-gradient(to bottom right, #ffffff 50%, #E77E31 50%)',
                            borderColor: '#d76e21',
                            color: '#000000'
                          };
                        } else {
                          const isMO = displayStatus === 'MO' || entry?.status === 'MO' || entry?.status === 'S';

                          if (isMO) {
                            cellClassName += ` bg-sky-200 text-sky-950 border-sky-300 font-bold`;
                            cellStyle = {
                              backgroundColor: '#bae6fd',
                              borderColor: '#7dd3fc',
                              color: '#0c4a6e'
                            };
                          } else {
                            cellClassName += ` ${entry?.status ? getStatusColor(entry.status, isSandbox, entity) : 'bg-white/40 border-transparent opacity-60'}`;
                            if (entry?.border_color) {
                              cellStyle = {
                                backgroundColor: entry.border_color,
                                borderColor: entry.border_color,
                                color: (entry.border_color === '#4FB6E1' || entry.border_color === '#FDE047' || entry.border_color === '#facc15') ? '#000000' : '#ffffff'
                              };
                            }
                          }
                        }
                      }

                      return (
                        <td key={u.id} className={`p-1.5 border-b border-r border-gray-300 text-center relative ${entity === 'MR-MGA' ? 'w-[130px] min-w-[130px] max-w-[130px] h-auto' : 'h-20 min-w-[120px]'} ${u.sectorColor}`}>
                          <div 
                            onClick={() => {
                              if (canEdit) {
                                setEditingCell({ userId: u.id, date: dateStr });
                                setTempComment(entry?.comment || '');
                                if (entity === 'MR-MGA') {
                                  const currentInterventions = (equipmentInterventions || [])
                                    .filter(item => item.user_id === u.id && item.date === dateStr)
                                    .map(item => item.equipment_id);
                                  setSelectedEquipments(currentInterventions);
                                } else {
                                  setSelectedEquipments([]);
                                }
                              }
                            }}
                            title={statusInfo?.description || entry?.status || ''}
                            className={cellClassName}
                            style={cellStyle}
                          >
                            <div className={`flex flex-col items-center justify-center w-full p-1 relative ${entity === 'MR-MGA' ? 'h-auto overflow-visible' : 'h-full overflow-hidden'}`}>
                              {entity === 'MR-MGA' && (equipmentInterventions || []).some(item => item.user_id === u.id && item.date === dateStr) && (
                                <div className="absolute top-0 right-0 p-0.5 z-10" title="Interventions sur équipements enregistrées">
                                  <Wrench size={20} className="text-amber-600 font-black" />
                                </div>
                              )}
                              {entry?.comment && (entry.status !== 'CA' || entity === 'MR-TTA') && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-50 pointer-events-none animate-in fade-in zoom-in duration-200">
                                  <div className="bg-gray-900 text-white text-[10px] py-1 px-3 rounded-lg whitespace-nowrap shadow-2xl border border-white/10 relative">
                                    {entry.comment}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              )}
                              {/* Affichage des congés si pas d'entrée TDS explicite ou en complément */}
                              {!isOffDay && !isWeekendCongeCell && !entry?.status && dayLeaves && dayLeaves.length > 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-50/80 rounded-xl">
                                  {dayLeaves.map((l, idx) => (
                                    <div key={idx} className="flex flex-col items-center">
                                      <span className="text-[10px] font-black text-blue-700 uppercase">{l.type}</span>
                                      <span className="text-[8px] font-bold text-blue-500 uppercase">
                                        {l.status === 'pending' ? 'Attente' : l.status === 'approved_chef' ? 'Validé Chef' : 'Validé DT'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {(isOffDay || isWeekendCongeCell) ? (
                                entry?.comment && (entry.status !== 'CA' || entity === 'MR-TTA') ? (
                                  <span className={`font-bold leading-tight px-1 whitespace-pre-wrap break-words text-center text-gray-500 ${entity === 'MR-MGA' ? 'text-[11px] max-h-none overflow-visible' : 'text-xs max-h-full overflow-hidden'}`}>
                                    {entity === 'MR-TTA' ? formatTTAComment(entry.comment) : entry.comment}
                                  </span>
                                ) : null
                              ) : (
                                <>
                                  {entry?.status && (entry.status !== 'OFF' || entity === 'MR-MGA') && (entry.status !== 'CA' || entity === 'MR-TTA') && (
                                    <span className="text-xs font-black mb-1 tracking-tighter">
                                      {getTDSDisplayStatus(entry.status, date, entity)}
                                    </span>
                                  )}
                                  {entry?.comment && (entry.status !== 'CA' || entity === 'MR-TTA') && (
                                    <span className={`font-bold leading-tight px-1 whitespace-pre-wrap break-words text-center ${entity === 'MR-MGA' ? 'text-[11px] max-h-none overflow-visible' : 'text-xs max-h-full overflow-hidden'}`}>
                                      {entity === 'MR-TTA' ? formatTTAComment(entry.comment) : entry.comment}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <AnimatePresence>
                            {isEditing && (
                              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={() => setEditingCell(null)}>
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`bg-white rounded-3xl shadow-2xl border-4 border-black p-6 w-full max-h-[96vh] overflow-y-auto text-left whitespace-normal ${(entity === 'MR-MGA' && user?.trigram?.toUpperCase() === 'DSO') ? 'max-w-[1250px]' : (entity === 'MR-MGA' ? 'max-w-[420px]' : 'max-w-[340px]')}`}
                                >
                                  <div className="flex justify-between items-center mb-5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2.5 h-8 bg-indigo-600 rounded-full" />
                                      <div>
                                        <h3 className="text-[12px] font-black text-gray-900 uppercase tracking-[0.2em]">Saisie Statut</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                                          {u.fullName || u.username} <span className="text-gray-300">|</span> {(() => {
                                            try {
                                              const dObj = new Date(dateStr);
                                              return dObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                                            } catch (e) {
                                              return dateStr;
                                            }
                                          })()}
                                        </p>
                                      </div>
                                    </div>
                                    <button onClick={() => setEditingCell(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-black">
                                      <X size={20} />
                                    </button>
                                  </div>

                                  {(() => {
                                    const isUserAgentOnly = user.role === 'user' && !isChefOfEntity && (entity === 'MR-TTA' || entity === 'MR-MGA');
                                    const showInterventions = entity === 'MR-MGA' && user?.trigram?.toUpperCase() === 'DSO';
                                    return (
                                      <div className={showInterventions ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" : "space-y-4"}>
                                        <div className={showInterventions ? "lg:col-span-4 space-y-4" : "space-y-4"}>
                                        {(!isUserAgentOnly && user.role !== 'secretary') ? (
                                          <div className="grid grid-cols-3 gap-1.5 mb-6 p-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                                            {statusLegend
                                              .filter(s => {
                                                const isFilterActive = (user && user.role === 'admin') || (u && u.role === 'admin');
                                                if (entity === 'MR-TTA' && ['RTT', 'REC', 'TLT'].includes(s.code)) {
                                                  return false;
                                                }
                                                return !(isFilterActive && ['SEC', '1', '2', '3'].includes(s.code));
                                              })
                                              .map(s => {
                                                const isCA = s.code === 'CA';
                                                const isAdminAndCA = isCA && ((user && user.role === 'admin') || (u && u.role === 'admin'));
                                                const isTTAFor = entity === 'MR-TTA' && s.code === 'FOR';
                                                const textClass = isTTAFor ? '!text-white' : '!text-black/80';
                                                const isOFFRIT = s.code === 'OFF+RIT';
                                                const isMSRIT = s.code === 'MS+RIT';
                                                const isMORIT = s.code === 'MO+RIT';

                                                let btnStyle: React.CSSProperties | undefined = undefined;
                                                let btnClass = `${getStatusColor(s.code, isSandbox, entity)} shadow-sm hover:shadow-lg ${textClass}`;

                                                if (isAdminAndCA) {
                                                  btnStyle = { backgroundColor: '#00C950', color: '#ffffff' };
                                                  btnClass = 'border-green-600 text-white shadow-sm hover:shadow-lg font-black';
                                                } else if (isOFFRIT) {
                                                  btnStyle = {
                                                    background: 'linear-gradient(to bottom right, #ffffff 50%, #E77E31 50%)',
                                                    color: '#000000',
                                                    borderColor: '#d76e21'
                                                  };
                                                  btnClass = 'shadow-sm hover:shadow-lg font-black';
                                                } else if (isMSRIT) {
                                                  btnStyle = {
                                                    background: 'linear-gradient(to bottom right, #FFDF20 50%, #E77E31 50%)',
                                                    color: '#000000',
                                                    borderColor: '#d76e21'
                                                  };
                                                  btnClass = 'shadow-sm hover:shadow-lg font-black';
                                                } else if (isMORIT) {
                                                  btnStyle = {
                                                    background: 'linear-gradient(to bottom right, #BAE6FD 50%, #E77E31 50%)',
                                                    color: '#000000',
                                                    borderColor: '#d76e21'
                                                  };
                                                  btnClass = 'shadow-sm hover:shadow-lg font-black';
                                                }

                                                return (
                                                  <button
                                                    key={s.code}
                                                    title={s.description}
                                                    onClick={() => handleStatusChange(u.id, dateStr, s.code, tempComment)}
                                                    className={`h-11 flex items-center justify-center rounded-xl text-[10px] font-black border transition-all hover:scale-105 active:scale-95 ${btnClass}`}
                                                    style={btnStyle}
                                                  >
                                                    {s.code === 'OFF+RIT' ? 'OFF + RIT' : (s.code === 'MS+RIT' ? 'MS + RIT' : (s.code === 'MO+RIT' ? 'MO + RIT' : (s.code.startsWith('ABS_') ? 'ABS' : s.code)))}
                                                  </button>
                                                );
                                              })}
                                          </div>
                                        ) : (
                                          <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between shadow-inner">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                              {isUserAgentOnly ? 'Statut (Lecture seule) :' : 'Statut (Admin) :'}
                                            </span>
                                            <span className={`px-4 py-1.5 rounded-xl text-[12px] font-black shadow-sm ${getStatusColor(entry?.status || '', isSandbox, entity)}`}>
                                              {entry?.status || 'OFF'}
                                            </span>
                                          </div>
                                        )}
                                        <div className="space-y-4">
                                          <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2.5 ml-1 tracking-[0.2em]">Commentaire / Note</label>
                                            <textarea 
                                              autoFocus
                                              value={tempComment}
                                              onChange={(e) => setTempComment(e.target.value)}
                                              className="w-full p-4 border-2 border-gray-100 rounded-2xl text-[13px] h-32 resize-none outline-none focus:border-black transition-colors font-medium bg-gray-50/30"
                                              placeholder="Ex: Maladie, Maintenance..."
                                            />
                                          </div>
                                          <div className="flex gap-3 pt-2">
                                            <button
                                              onClick={() => handleStatusChange(u.id, dateStr, isUserAgentOnly ? (entry?.status || '') : '', '')}
                                              className="flex-1 py-4 rounded-2xl text-[10px] font-black border-2 border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-red-500 hover:border-red-100 uppercase tracking-widest transition-all"
                                            >
                                              Effacer
                                            </button>
                                            <button
                                              onClick={() => handleStatusChange(u.id, dateStr, entry?.status || '', tempComment)}
                                              className="flex-[2] py-4 rounded-2xl text-[10px] font-black bg-black text-white shadow-2xl hover:bg-gray-800 transition-all uppercase tracking-[0.2em] active:scale-95"
                                            >
                                              Valider
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {showInterventions && (
                                          <div className="lg:col-span-8 border-t lg:border-t-0 lg:border-l border-gray-100 pt-5 lg:pt-0 lg:pl-6 space-y-4 h-full">
                                            <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                                              <Wrench size={16} className="text-indigo-600" />
                                              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-wider">Interventions MS</h4>
                                            </div>
                                            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 relative">
                                              {(() => {
                                                const uTrig = (u?.trigram || '').toUpperCase();
                                                const allowedCategories = ['CNS/ATM', 'SE'].filter(cat => {
                                                  if (['DSO', 'PRI', 'GBT'].includes(uTrig)) {
                                                    return cat === 'CNS/ATM';
                                                  }
                                                  if (['PDO', 'GDN'].includes(uTrig)) {
                                                    return cat === 'SE';
                                                  }
                                                  return true;
                                                });

                                                const allowedMissions = unifiedEquipments.filter(eq => 
                                                  eq.id.startsWith('m-') && 
                                                  allowedCategories.includes(eq.subCategory || 'CNS/ATM')
                                                );
                                                const allowedEquipmentsList = unifiedEquipments.filter(eq => 
                                                  eq.id.startsWith('e-') && 
                                                  allowedCategories.includes(eq.subCategory || 'CNS/ATM')
                                                );

                                                return (
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    {/* Colonne Gauche: Missions (2 colonnes de grilles internes) */}
                                                    <div className="space-y-3">
                                                      <span className="sticky top-0 bg-white z-10 text-[10px] font-black text-emerald-600 uppercase tracking-widest block border-b border-emerald-100 py-2">
                                                        Missions
                                                      </span>
                                                      {allowedMissions.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic">Aucune mission disponible</p>
                                                      ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                          {allowedMissions.map(eq => {
                                                            const isChecked = selectedEquipments.includes(eq.id) || selectedEquipments.includes(Number(eq.id)) || selectedEquipments.includes(String(eq.id));
                                                            return (
                                                              <label 
                                                                key={eq.id} 
                                                                className={`flex items-start gap-2 p-2.5 border rounded-xl cursor-pointer transition-all hover:bg-emerald-50/30 hover:border-emerald-200 text-[11px] font-bold ${
                                                                  isChecked 
                                                                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950' 
                                                                    : 'border-gray-200 text-gray-700'
                                                                }`}
                                                              >
                                                                <input 
                                                                  type="checkbox" 
                                                                  checked={isChecked}
                                                                  onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                      setSelectedEquipments([...selectedEquipments, eq.id]);
                                                                    } else {
                                                                      setSelectedEquipments(selectedEquipments.filter(id => id !== eq.id && String(id) !== String(eq.id)));
                                                                    }
                                                                  }}
                                                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer accent-emerald-600 mt-0.5"
                                                                />
                                                                <span className="break-words text-left leading-tight" title={eq.lastname}>{eq.trigram}</span>
                                                              </label>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                    </div>

                                                    {/* Colonne Droite: Équipements (2 colonnes de grilles internes) */}
                                                    <div className="space-y-3">
                                                      <span className="sticky top-0 bg-white z-10 text-[10px] font-black text-indigo-600 uppercase tracking-widest block border-b border-indigo-100 py-2">
                                                        Équipements
                                                      </span>
                                                      {allowedEquipmentsList.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic">Aucun équipement disponible</p>
                                                      ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                          {allowedEquipmentsList.map(eq => {
                                                            const isChecked = selectedEquipments.includes(eq.id) || selectedEquipments.includes(Number(eq.id)) || selectedEquipments.includes(String(eq.id));
                                                            return (
                                                              <label 
                                                                key={eq.id} 
                                                                className={`flex items-start gap-2 p-2.5 border rounded-xl cursor-pointer transition-all hover:bg-indigo-50/30 hover:border-indigo-200 text-[11px] font-bold ${
                                                                  isChecked 
                                                                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950' 
                                                                    : 'border-gray-200 text-gray-700'
                                                                }`}
                                                              >
                                                                <input 
                                                                  type="checkbox" 
                                                                  checked={isChecked}
                                                                  onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                      setSelectedEquipments([...selectedEquipments, eq.id]);
                                                                    } else {
                                                                      setSelectedEquipments(selectedEquipments.filter(id => id !== eq.id && String(id) !== String(eq.id)));
                                                                    }
                                                                  }}
                                                                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer accent-indigo-600 mt-0.5"
                                                                />
                                                                <span className="break-words text-left leading-tight" title={eq.lastname}>{eq.trigram}</span>
                                                              </label>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </motion.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </td>
                      );
                    })}
                  </tr>
                  {showWeekSeparator && (
                    <tr className={entity === 'MR-MGA' ? "border-black" : "bg-gray-200 border-t border-b border-gray-400"}>
                      <td 
                        colSpan={entity === 'MR-MGA' ? 2 + flatGroupedUsers.length : 1 + flatGroupedUsers.length} 
                        className={entity === 'MR-MGA' 
                          ? "bg-yellow-100 py-2 px-4 text-center font-black text-black text-xs tracking-widest uppercase border-t-2 border-b-2 border-black font-mono" 
                          : "bg-gray-200 py-2.5 px-4 text-center font-black text-gray-700 text-sm tracking-widest uppercase"
                        }
                      >
                        Semaine {nextWeekNum}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-3">
          {statusLegend.map(s => (
            <div key={s.code} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded border text-[8px] font-bold flex items-center justify-center ${getStatusColor(s.code, isSandbox, entity)}`}>
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{s.label} ({s.code})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Update Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-black/5"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Mise à jour groupée</h2>
                <button onClick={() => setShowBulkModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();

                if (new Date(bulkData.startDate) > new Date(bulkData.endDate)) {
                  showNotification("Incohérence des dates : la date de fin est inférieure à la date de début.", 'error');
                  return;
                }

                setIsBulkLoading(true);
                try {
                  const res = await fetch('/api/tds/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      user_id: bulkData.userId,
                      start_date: bulkData.startDate,
                      end_date: bulkData.endDate,
                      status: bulkData.status,
                      comment: bulkData.comment,
                      is_sandbox: isSandbox
                    }),
                  });
                  if (res.ok) {
                    setShowBulkModal(false);
                    fetchData();
                    if (onUpdate) onUpdate();
                  }
                } finally {
                  setIsBulkLoading(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Agent</label>
                  <select 
                    value={bulkData.userId}
                    onChange={e => setBulkData({...bulkData, userId: Number(e.target.value)})}
                    className="w-full p-2 border rounded-lg text-sm"
                    disabled={user.role !== 'admin'}
                  >
                    {filteredUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.firstname} {u.lastname} ({u.trigram})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Du</label>
                    <input 
                      type="date" 
                      value={bulkData.startDate}
                      onChange={e => setBulkData({...bulkData, startDate: e.target.value})}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Au</label>
                    <input 
                      type="date" 
                      value={bulkData.endDate}
                      onChange={e => setBulkData({...bulkData, endDate: e.target.value})}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Statut</label>
                  <select 
                    value={bulkData.status}
                    onChange={e => setBulkData({...bulkData, status: e.target.value})}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    {statusLegend
                      .filter(s => {
                        if (entity === 'MR-TTA' && ['RTT', 'REC', 'TLT'].includes(s.code)) {
                          return false;
                        }
                        return true;
                      })
                      .map(s => (
                        <option key={s.code} value={s.code}>{s.label}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Commentaire</label>
                  <textarea 
                    value={bulkData.comment}
                    onChange={e => setBulkData({...bulkData, comment: e.target.value})}
                    className="w-full p-2 border rounded-lg text-sm h-16 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={isBulkLoading}
                    className="flex-2 px-4 py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isBulkLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Traitement...
                      </>
                    ) : 'Appliquer la mise à jour'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LeaveRequests = ({ user, onUpdate, showNotification }: { user: User, onUpdate?: () => void, showNotification: (msg: string, type?: 'success' | 'error') => void }) => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ start_date: '', end_date: '', type: 'CA' });
  const [editingLeaveId, setEditingLeaveId] = useState<number | null>(null);

  const fetchLeaves = async () => {
    const res = await fetch('/api/leaves');
    const data = await res.json();
    // Filter leaves: Admin Siège sees all, Admin Entity sees their entity, User sees only their own
    const filtered = data.filter((l: any) => {
      if (user.role === 'admin') {
        return user.entity === 'Siège' || l.entity === user.entity;
      }
      return l.user_id === user.id;
    });
    setLeaves(filtered);
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.start_date || !formData.end_date) {
      showNotification("Veuillez sélectionner une date de début et une date de fin.", 'error');
      return;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      showNotification("Format de date invalide.", 'error');
      return;
    }

    if (start > end) {
      showNotification("Incohérence des dates : la date de fin est inférieure à la date de début.", 'error');
      return;
    }

    const url = editingLeaveId ? `/api/leaves/${editingLeaveId}` : '/api/leaves';
    const method = editingLeaveId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, user_id: user.id }),
    });
    if (res.ok) {
      setShowForm(false);
      setEditingLeaveId(null);
      setFormData({ start_date: '', end_date: '', type: 'CA' });
      fetchLeaves();
      showNotification(editingLeaveId ? 'Demande modifiée !' : 'Demande envoyée !');
      if (onUpdate) onUpdate();
    }
  };

  const handleApprove = async (id: number, currentStatus: string) => {
    let nextStatus = '';
    
    const leaveItem = leaves.find(l => l.id === id);
    const leaveEntity = leaveItem ? leaveItem.entity : '';

    if (leaveEntity === 'MR-TTA') {
      // Pour l'entité MR-TTA, la validation par le Chef-MR suffit (devient directement approved_dt)
      nextStatus = 'approved_dt';
    } else if (user.role === 'admin' && user.entity === 'Siège') {
      // Le Chef de la DT valide directement et définitivement
      nextStatus = 'approved_dt';
    } else {
      // Le Chef MR d'Entité fait une validation intermédiaire N+1
      if (currentStatus === 'pending') {
        nextStatus = 'approved_chef';
      }
    }

    if (!nextStatus) return;

    const res = await fetch(`/api/leaves/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      fetchLeaves();
      if (onUpdate) onUpdate();
    }
  };

  const handleReject = async (id: number) => {
    const res = await fetch(`/api/leaves/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    });
    if (res.ok) {
      fetchLeaves();
      if (onUpdate) onUpdate();
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette demande de congé ?")) return;
    const res = await fetch(`/api/leaves/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      fetchLeaves();
      showNotification('Demande supprimée.');
      if (onUpdate) onUpdate();
    }
  };

  const getStatusBadge = (status: string, entity?: string) => {
    switch(status) {
      case 'pending': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded uppercase">En attente Chef</span>;
      case 'approved_chef': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Validé Chef - Attente DT</span>;
      case 'approved_dt': return <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">{entity === 'MR-TTA' ? 'Validé' : 'Validé DT'}</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">Refusé</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Gestion des Congés</h2>
        <button 
          onClick={() => {
            setEditingLeaveId(null);
            setFormData({ start_date: '', end_date: '', type: 'CA' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all shadow-md"
        >
          <Plus size={14}/> Nouvelle Demande
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 overflow-hidden"
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">{editingLeaveId ? 'Modifier la Demande' : 'Nouvelle Demande'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date Début</label>
                <input type="date" required className="w-full p-2 border rounded-lg text-sm" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date Fin</label>
                <input type="date" required className="w-full p-2 border rounded-lg text-sm" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Type</label>
                <select className="w-full p-2 border rounded-lg text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="CA">Congé Annuel</option>
                  <option value="RTT">RTT</option>
                  <option value="REC">Récupération</option>
                  <option value="CET">CET (Compte Épargne Temps)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-black text-white py-2 rounded-lg text-xs font-bold">{editingLeaveId ? 'Mettre à jour' : 'Envoyer'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-xs font-bold">Annuler</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-md border border-gray-300 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Agent</th>
              <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Période</th>
              <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Type</th>
              <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Statut</th>
              <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leaves.map(l => (
              <tr key={l.id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-mono text-xs font-bold text-gray-600" title={`${l.firstname} ${l.lastname}`}>{l.trigram}</div>
                    <span className="text-sm font-bold text-gray-900">{l.firstname} {l.lastname}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {l.start_date && l.end_date && !isNaN(new Date(l.start_date).getTime()) && !isNaN(new Date(l.end_date).getTime()) ? (
                    `Du ${new Date(l.start_date).toLocaleDateString('fr-FR')} au ${new Date(l.end_date).toLocaleDateString('fr-FR')}`
                  ) : (
                    <span className="text-red-400 italic">Période non définie</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-mono font-bold">{l.type}</td>
                <td className="px-6 py-4">{getStatusBadge(l.status, l.entity)}</td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    {/* User Actions (Owner) - Edit pending only */}
                    {l.user_id === user.id && l.status === 'pending' && (
                      <button 
                        onClick={() => {
                          setEditingLeaveId(l.id);
                          setFormData({ 
                            start_date: l.start_date ? new Date(l.start_date).toISOString().split('T')[0] : '', 
                            end_date: l.end_date ? new Date(l.end_date).toISOString().split('T')[0] : '', 
                            type: l.type 
                          });
                          setShowForm(true);
                        }}
                        className="p-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-100 transition-all"
                        title="Modifier"
                      >
                        <Edit2 size={12}/>
                      </button>
                    )}

                    {/* Delete Action (Trash) */}
                    {(() => {
                      const isOwner = l.user_id === user.id;
                      const isChefMR = (user.profil || '').toUpperCase().includes('CHEF') && user.entity === 'MR-TTA' && l.entity === 'MR-TTA';
                      const isAdmin = user.role === 'admin';
                      const canDelete = isOwner || isChefMR || isAdmin;

                      return canDelete ? (
                        <button 
                          onClick={() => handleCancel(l.id)}
                          className="p-2 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={12}/>
                        </button>
                      ) : null;
                    })()}

                    {/* Admin Actions */}
                    {user.role === 'admin' && (
                      <>
                        {/* Valider button rule */}
                        {(() => {
                          const isHqAdmin = user.entity === 'Siège';
                          const isLocalChef = user.entity === l.entity;
                          
                          // Pas d'auto-validation pour les demandes individuelles des chefs (Optionnel, mais logique)
                          // Sauf si le Chef DT souhaite valider son propre congé
                          const isOwnRequest = l.user_id === user.id;

                          // Local Chef can validate pending requests of their own entity (except themselves)
                          if (!isHqAdmin && isLocalChef && l.status === 'pending' && !isOwnRequest) {
                            return (
                              <button 
                                onClick={() => handleApprove(l.id, l.status)}
                                className="px-3 py-1 bg-black text-white text-[10px] font-bold rounded hover:bg-gray-800 transition-all uppercase"
                              >
                                Valider
                              </button>
                            );
                          }
                          
                          // Chef de la DT (HQ Admin) can validate:
                          // 1. approved_chef requests (Validation N+2)
                          // 2. pending requests of Siège agents or entity Chefs (Validation N+1 direct)
                          if (isHqAdmin) {
                            const isDirectValidation = l.status === 'pending' && (l.entity === 'Siège' || l.role === 'admin');
                            const isN2Validation = l.status === 'approved_chef';
                            
                            if (isDirectValidation || isN2Validation) {
                              return (
                                <button 
                                  onClick={() => handleApprove(l.id, l.status)}
                                  className="px-3 py-1 bg-black text-white text-[10px] font-bold rounded hover:bg-gray-800 transition-all uppercase"
                                >
                                  Valider
                                </button>
                              );
                            }
                          }
                          return null;
                        })()}
                        
                        {/* Refuser button rule */}
                        {l.status !== 'approved_dt' && l.status !== 'rejected' && (
                          (() => {
                            const isHqAdmin = user.entity === 'Siège';
                            const isLocalChef = user.entity === l.entity;
                            const isOwnRequest = l.user_id === user.id;
                            
                            if (!isOwnRequest && (isHqAdmin || (isLocalChef && l.status === 'pending'))) {
                              return (
                                <button 
                                  onClick={() => handleReject(l.id)}
                                  className="px-3 py-1 border border-red-200 text-red-500 text-[10px] font-bold rounded hover:bg-red-50 transition-all uppercase"
                                >
                                  Refuser
                                </button>
                              );
                            }
                            return null;
                          })()
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PrintPage = ({ user }: { user: User }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<number>(user.id);
  const [selectedEntity, setSelectedEntity] = useState<Entity>('MR-TTA');
  const [users, setUsers] = useState<User[]>([]);
  const [entries, setEntries] = useState<TDSEntry[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [printType, setPrintType] = useState<'personal' | 'entity'>('entity');
  const [period, setPeriod] = useState<'month' | 'semester' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [isSandbox, setIsSandbox] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));

    fetch('/api/leaves')
      .then(res => res.json())
      .then(data => setLeaves(data));
  }, []);

  useEffect(() => {
    fetch(`/api/tds?entity=${selectedEntity}&is_sandbox=${isSandbox}`).then(res => res.json()).then(setEntries);
  }, [selectedEntity, isSandbox]);

  useEffect(() => {
    if (printType === 'personal' && selectedAgentId && users.length > 0) {
      const agent = users.find(u => u.id === selectedAgentId);
      if (agent && agent.entity !== selectedEntity) {
        setSelectedEntity(agent.entity);
      }
    }
  }, [selectedAgentId, printType, users]);

  const handlePrint = () => {
    const originalTitle = document.title;
    let fileName = 'Gestion TDS DT';
    
    if (printType === 'entity') {
      const weekNum = getWeekStr(days[0]).split('-W')[1];
      const year = days[0].getFullYear();
      fileName = `TDS_${selectedEntity}_Sem-${weekNum}_${year}`;
    } else {
      const agent = users.find(u => u.id === selectedAgentId);
      if (agent) {
        const year = currentDate.getFullYear();
        if (period === 'month') {
          const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
          fileName = `TDS_${agent.trigram}_${monthStr}_${year}`;
        } else if (period === 'semester') {
          const sem = currentDate.getMonth() < 6 ? 'S1' : 'S2';
          fileName = `TDS_${agent.trigram}_${sem}_${year}`;
        } else {
          fileName = `TDS_${agent.trigram}_Annee_${year}`;
        }
      }
    }
    
    document.title = fileName;
    window.print();
    // Use a small timeout to ensure the print dialog has picked up the title before restoring it
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const selectedAgent = users.find(u => u.id === selectedAgentId);

  const getDays = () => {
    const days = [];
    let start = new Date(currentDate.getFullYear(), 0, 1);
    let count = 365;

    if (printType === 'personal') {
      if (period === 'month') {
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        count = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      } else if (period === 'semester') {
        const isFirstSemester = currentDate.getMonth() < 6;
        start = new Date(currentDate.getFullYear(), isFirstSemester ? 0 : 6, 1);
        const end = new Date(currentDate.getFullYear(), isFirstSemester ? 6 : 12, 0);
        count = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      } else {
        start = new Date(currentDate.getFullYear(), 0, 1);
        const end = new Date(currentDate.getFullYear(), 12, 0);
        count = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
    } else {
      const day = currentDate.getDay();
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(currentDate);
      start.setDate(diff);
      count = 7;
    }

    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const days = getDays();
  const filteredUsers = users.filter(u => u.entity === selectedEntity && u.role !== 'secretary');

  // Grouping & Sorting for printing (matches HEBDO view perfectly)
  const getSectorPrint = (u: User) => {
    if (selectedEntity !== 'MR-TTA') return null;
    const p = (u.profil || '').toUpperCase();
    if (p.includes('CHEF')) return 'CHEF';
    if (p.includes('ATM')) return 'ATM';
    if (p.includes('CNS')) return 'CNS';
    if (p.includes('SE') || p.includes('ELECTROTECH')) return 'SE';
    return 'ATM';
  };

  const sectorsPrint = selectedEntity === 'MR-TTA' ? [
    { id: 'CHEF', label: 'CHEF', fullName: 'Chef MR-TTA', color: 'bg-indigo-50/40 print:bg-indigo-50/40', headerColor: 'bg-slate-100 text-slate-500 font-black border-r border-b border-gray-300' },
    { id: 'ATM', label: 'ATM', fullName: 'ATM', color: 'bg-blue-50/20 print:bg-blue-50/20', headerColor: 'bg-slate-50 text-slate-400 font-bold border-r border-b border-gray-300' },
    { id: 'CNS', label: 'CNS', fullName: 'CNS', color: 'bg-green-50/20 print:bg-green-50/20', headerColor: 'bg-slate-50 text-slate-400 font-bold border-r border-b border-gray-300' },
    { id: 'SE', label: 'SE', fullName: 'SE', color: 'bg-amber-50/20 print:bg-amber-50/20', headerColor: 'bg-slate-50 text-slate-400 font-bold border-r border-b border-gray-300' },
  ] : [];

  const groupedUsersPrint = selectedEntity === 'MR-TTA' ? sectorsPrint.map(s => ({
    ...s,
    users: filteredUsers.filter(u => getSectorPrint(u) === s.id)
  })).filter(g => g.users.length > 0) : [{ id: 'none', label: '', fullName: '', users: filteredUsers, color: '', headerColor: '' }];

  const flatGroupedUsersForPrint = selectedEntity === 'MR-TTA' 
    ? groupedUsersPrint.flatMap(g => g.users.map(u => ({ ...u, sectorColor: g.color })))
    : filteredUsers;

  const getOptimalCellStyles = (status: string, border_color: string | undefined, isSandbox: boolean, date?: Date, entity?: string) => {
    let style: React.CSSProperties = {
      borderRadius: '6px', 
      borderWidth: '2px',
      borderStyle: 'solid',
      padding: '4px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '38px',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box'
    };

    if (date && entity && status) {
      const override = getOverrideStyleForHebdoCell(status, border_color, date, entity);
      if (override) {
        style.backgroundColor = override.backgroundColor;
        style.borderColor = override.borderColor;
        style.color = override.color;
        return style;
      }
    }

    const displayStatusVal = (date && entity && status) ? getTDSDisplayStatus(status, date, entity) : '';
    const isMSRITVal = displayStatusVal === 'MS+RIT' || status === 'MS+RIT';
    const isMORITVal = displayStatusVal === 'MO+RIT' || status === 'MO+RIT';
    const isOFFRITVal = displayStatusVal === 'OFF+RIT' || displayStatusVal === 'OFF + RIT' || status === 'OFF+RIT' || status === 'OFF + RIT';
    const isMOVal = displayStatusVal === 'MO' || status === 'MO' || status === 'S';

    if (isOFFRITVal) {
      style.background = 'linear-gradient(to bottom right, #ffffff 50%, #E77E31 50%)';
      style.backgroundColor = 'transparent';
      style.borderColor = '#d76e21';
      style.color = '#000000';
      return style;
    }

    if (isMSRITVal) {
      style.background = 'linear-gradient(to bottom right, #FFDF20 50%, #E77E31 50%)';
      style.backgroundColor = 'transparent';
      style.borderColor = '#eab308';
      style.color = '#000000';
      return style;
    }

    if (isMORITVal) {
      style.background = 'linear-gradient(to bottom right, #BAE6FD 50%, #E77E31 50%)';
      style.backgroundColor = 'transparent';
      style.borderColor = '#7dd3fc';
      style.color = '#0c4a6e';
      return style;
    }

    if (isMOVal) {
      style.backgroundColor = '#bae6fd';
      style.borderColor = '#7dd3fc';
      style.color = '#0c4a6e';
      return style;
    }

    const isOutlineOnly = false;

    if (isOutlineOnly) {
      const defaultColor = (s: string) => {
        switch (s) {
          case 'MS': return '#eab308';
          case 'MO': return '#f59e0b';
          case 'MO+RIT': return '#f97316';
          case 'MS+RIT': return '#ca8a04';
          case 'RIT': return '#eab308';
          default: return '#cbd5e1';
        }
      };
      const finalBorderColor = border_color || defaultColor(status);
      style.borderColor = finalBorderColor;
      style.borderWidth = '2.5px';
      style.backgroundColor = '#ffffff';
      style.color = '#1f2937';
      return style;
    }

    // If there is an active database cycle border color
    if (border_color) {
      style.borderColor = border_color;
      style.borderWidth = '2px';
      style.backgroundColor = border_color;
      
      const bc = border_color.toUpperCase();
      if (bc === '#4FB6E1') {
        style.color = '#000000';
      } else if (bc === '#1B6486') {
        style.color = '#ffffff';
      } else if (bc === '#E77E31') {
        style.color = '#ffffff';
      } else if (bc === '#FACC15' || bc === '#FDE047') {
        style.color = '#000000';
      } else {
        style.color = '#ffffff';
      }
      return style;
    }

    // Fallback to normal status based styles
    let bgColor = '#ffffff';
    let textColor = '#1f2937';
    let bColor = 'transparent';

    switch (status) {
      case 'C': bgColor = '#22c55e'; textColor = '#ffffff'; bColor = '#16a34a'; break;
      case 'P': bgColor = '#bae6fd'; textColor = '#0369a1'; bColor = '#7dd3fc'; break;
      case 'S': bgColor = '#fde68a'; textColor = '#78350f'; bColor = '#fcd34d'; break;
      case 'W': bgColor = '#fed7aa'; textColor = '#c2410c'; bColor = '#fdba74'; break;
      case 'A': bgColor = '#d9f99d'; textColor = '#4d7c0f'; bColor = '#bef264'; break;
      case 'F': bgColor = '#8b5cf6'; textColor = '#ffffff'; bColor = '#7c3aed'; break;
      case 'I': bgColor = '#fecaca'; textColor = '#991b1b'; bColor = '#fca5a5'; break;
      case 'M': bgColor = '#e9d5ff'; textColor = '#6b21a8'; bColor = '#d8b4fe'; break;
      case 'Q': bgColor = '#ddd6fe'; textColor = '#5b21b6'; bColor = '#c084fc'; break;

      // Cycles or custom statuses
      case 'MS': 
        bgColor = '#fde047'; textColor = '#000000'; bColor = '#facc15'; 
        break;
      case 'MO': bgColor = '#fde68a'; textColor = '#78350f'; bColor = '#fcd34d'; break;
      case 'MO+RIT': bgColor = '#fdba74'; textColor = '#000000'; bColor = '#f97316'; break;
      case 'MS+RIT': bgColor = '#facc15'; textColor = '#000000'; bColor = '#eab308'; break;
      case 'EPI': bgColor = '#99f6e4'; textColor = '#0f766e'; bColor = '#5eead4'; break;

      // Cycles 1, 2, 3
      case '1': bgColor = '#4FB6E1'; textColor = '#000000'; bColor = '#3fa6d1'; break;
      case '2': bgColor = '#1B6486'; textColor = '#ffffff'; bColor = '#155476'; break;
      case '3': bgColor = '#E77E31'; textColor = '#ffffff'; bColor = '#d76e21'; break;

      // Daily/planning codes
      case 'CA': bgColor = '#00C950'; textColor = '#ffffff'; bColor = '#009e3f'; break;
      case 'RTT': bgColor = '#dbeafe'; textColor = '#1e40af'; bColor = '#bfdbfe'; break;
      case 'REC': bgColor = '#eff6ff'; textColor = '#1d4ed8'; bColor = '#dbeafe'; break;
      case 'CET': bgColor = '#ecfeff'; textColor = '#0e7490'; bColor = '#c5f2f7'; break;
      case 'OFF': bgColor = '#e5e7eb'; textColor = '#1f2937'; bColor = '#d1d5db'; break;
      case 'PER': bgColor = '#a7f3d0'; textColor = '#064e3b'; bColor = '#6ee7b7'; break;
      case 'RIT': bgColor = '#E77E31'; textColor = '#ffffff'; bColor = '#d76e21'; break;
      case 'ASE': case 'AST': bgColor = '#fef08a'; textColor = '#713f12'; bColor = '#fde047'; break;
      case 'AE': bgColor = '#fbcfe8'; textColor = '#831843'; bColor = '#f9a8d4'; break; // Astreinte électrique
      case 'FOR': 
        if (entity === 'MR-TTA') {
          bgColor = '#8E51FF'; textColor = '#ffffff'; bColor = '#8E51FF';
        } else {
          bgColor = '#c7d2fe'; textColor = '#3730a3'; bColor = '#a5b4fc';
        }
        break;
      case 'SEC': case 'TRV': case 'PRE': bgColor = '#bbf7d0'; textColor = '#15803d'; bColor = '#86efac'; break;
      case 'MIS': bgColor = '#e9d5ff'; textColor = '#6b21a8'; bColor = '#d8b4fe'; break;
      case 'TLT': bgColor = '#a5f3fc'; textColor = '#0e7490'; bColor = '#67e8f9'; break;
      case 'ABS': case 'ABS_V': 
        if (entity === 'MR-TTA') {
          bgColor = '#d1d5db'; textColor = '#1f2937'; bColor = '#9ca3af'; 
        } else {
          bgColor = '#fecdd3'; textColor = '#9f1239'; bColor = '#fda4af'; 
        }
        break;
      case 'ABS_D': 
        if (entity === 'MR-TTA') {
          bgColor = '#e5e7eb'; textColor = '#374151'; bColor = '#cbd5e1'; 
        } else {
          bgColor = '#ffe4e6'; textColor = '#9f1239'; bColor = '#fecdd3'; 
        }
        break;
      case 'EXC': bgColor = '#e2e8f0'; textColor = '#334155'; bColor = '#cbd5e1'; break;
      
      default:
        bgColor = '#ffffff';
        textColor = '#9ca3af';
        bColor = 'transparent';
    }

    style.backgroundColor = bgColor;
    style.color = textColor;
    style.borderColor = bColor;

    return style;
  };

  const findEntry = (userId: number, date: Date) => {
    const u = users ? users.find(usr => usr.id === userId) : undefined;
    const dateStr = formatDateLocal(date);
    const weekStr = getWeekStr(date);
    const dbEntry = entries ? entries.find(e => 
      Number(e.user_id) === Number(userId) && 
      (e.date === dateStr || (u?.entity !== 'MR-MGA' && e.date === weekStr)) && 
      Number(e.is_sandbox) === (isSandbox ? 1 : 0)
    ) : undefined;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    // Check leaves
    const hasActiveLeave = leaves && leaves.some(l => 
      l.user_id === userId && 
      dateStr >= l.start_date && 
      dateStr <= l.end_date &&
      l.status !== 'rejected'
    );
    
    const isTltDayDefault = u && u.entity === 'Siège' && u.tlt_day && u.tlt_day !== 'Aucun' && getDayNameFr(date) === u.tlt_day && !isWeekend && !hasActiveLeave;
    
    if (dbEntry === undefined && isTltDayDefault) {
      return { user_id: userId, date: dateStr, status: 'TLT', comment: '', is_sandbox: isSandbox ? 1 : 0 };
    }
    return dbEntry || null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 print:max-w-none print:w-full print:mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-300 print:hidden">
        <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-tight">
          <Printer size={28} className="text-indigo-600" /> Options d'Impression
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8">
            {user.role !== 'secretary' && (
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner">
                <label className="flex items-center gap-4 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={printType === 'personal'} 
                    onChange={() => setPrintType('personal')}
                    className="w-5 h-5 text-black focus:ring-black"
                  />
                  <span className="text-base font-black text-gray-800 uppercase tracking-widest">Planning Personnel</span>
                </label>
                {printType === 'personal' && (
                  <div className="mt-6 space-y-6 ml-9">
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Agent</label>
                      <select 
                        value={selectedAgentId} 
                        onChange={e => setSelectedAgentId(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-black outline-none"
                      >
                        {users.map(u => <option key={u.id} value={u.id}>{u.trigram} - {u.firstname} {u.lastname}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Période</label>
                      <div className="flex bg-white p-1 rounded-xl border border-gray-300">
                        {(['month', 'semester', 'year'] as const).map(p => (
                          <button 
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${
                              period === p ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-700'
                            }`}
                          >
                            {p === 'month' ? 'Mois' : p === 'semester' ? 'Semestre' : 'Année'}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white border rounded-lg">
                        <button onClick={() => {
                          const d = new Date(currentDate);
                          if (period === 'month') d.setMonth(d.getMonth() - 1);
                          else if (period === 'semester') d.setMonth(d.getMonth() - 6);
                          else d.setFullYear(d.getFullYear() - 1);
                          setCurrentDate(d);
                        }} className="p-1 hover:bg-gray-100 rounded transition-all"><ChevronLeft size={16}/></button>
                        <span className="text-xs font-bold capitalize">
                          {period === 'month' ? currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : period === 'semester' ? `Semestre ${currentDate.getMonth() < 6 ? '1' : '2'} ${currentDate.getFullYear()}` : currentDate.getFullYear()}
                        </span>
                        <button onClick={() => {
                          const d = new Date(currentDate);
                          if (period === 'month') d.setMonth(d.getMonth() + 1);
                          else if (period === 'semester') d.setMonth(d.getMonth() + 6);
                          else d.setFullYear(d.getFullYear() + 1);
                          setCurrentDate(d);
                        }} className="p-1 hover:bg-gray-100 rounded transition-all"><ChevronRight size={16}/></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  checked={printType === 'entity'} 
                  onChange={() => setPrintType('entity')}
                  className="w-4 h-4 text-black focus:ring-black"
                />
                <span className="text-sm font-bold text-gray-700">Planning Entité (Hebdomadaire)</span>
              </label>
              {printType === 'entity' && (
                <div className="mt-4 space-y-4 ml-7">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Entité</label>
                    <div className="flex gap-2 mb-4">
                      {(['Siège', 'MR-MGA', 'MR-TTA'] as Entity[]).map(e => (
                        <button 
                          key={e}
                          onClick={() => setSelectedEntity(e)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${selectedEntity === e ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white border rounded-lg">
                      <button onClick={() => {
                        const d = new Date(currentDate);
                        d.setDate(d.getDate() - 7);
                        setCurrentDate(d);
                      }} className="p-1 hover:bg-gray-100 rounded transition-all"><ChevronLeft size={16}/></button>
                      <span className="text-xs font-bold">
                        Semaine du {days[0].toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <button onClick={() => {
                        const d = new Date(currentDate);
                        d.setDate(d.getDate() + 7);
                        setCurrentDate(d);
                      }} className="p-1 hover:bg-gray-100 rounded transition-all"><ChevronRight size={16}/></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-end gap-4">
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-xs text-indigo-700 leading-relaxed">
                <span className="font-bold">Note:</span> L'impression est optimisée pour le format A4. 
                <span className="block mt-1 font-bold underline">IMPORTANT: Activez "Graphiques d'arrière-plan" dans vos paramètres d'impression pour voir les couleurs.</span>
              </p>
            </div>
            <button 
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-xl font-bold shadow-xl hover:bg-gray-800 transition-all"
            >
              <Printer size={20} /> Imprimer le document
            </button>
          </div>
        </div>
      </div>

      <div className="printable-area bg-white p-8 border border-gray-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full">
        <div className="flex justify-between items-start mb-8 print:mb-2 border-b-2 border-black pb-4 print:pb-1">
          <div>
            <h1 className="text-2xl print:text-lg font-black uppercase tracking-tighter">DAC-NC / SNA / DT</h1>
            <p className={`text-sm print:text-[10px] font-bold text-gray-500 uppercase tracking-widest ${printType === 'entity' ? 'print:hidden' : ''}`}>Tableau de Service - {printType === 'personal' ? 'Individuel' : 'Entité'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase">Généré le</p>
            <p className="text-sm print:text-xs font-mono font-bold">{new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        {printType === 'personal' && selectedAgent && (
          <div className="space-y-6 print:space-y-2">
            <div className="flex gap-8 print:gap-4 p-4 print:p-1 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Agent</p>
                <p className="text-lg print:text-sm font-bold text-gray-900">{selectedAgent.firstname} {selectedAgent.lastname} ({selectedAgent.trigram})</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Entité</p>
                <p className="text-lg print:text-sm font-bold text-gray-900">{selectedAgent.entity}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Période</p>
                <p className="text-lg print:text-sm font-bold text-gray-900 capitalize">{period === 'month' ? currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : period === 'semester' ? `Semestre ${currentDate.getMonth() < 6 ? '1' : '2'} ${currentDate.getFullYear()}` : currentDate.getFullYear()}</p>
              </div>
            </div>

            <table className="w-full border-collapse border-2 border-black print:text-[9px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 print:p-1 text-left text-xs print:text-[9px] font-bold uppercase">Date</th>
                  <th className="border border-black p-2 print:p-1 text-center text-xs print:text-[9px] font-bold uppercase">Statut</th>
                  <th className="border border-black p-2 print:p-1 text-left text-xs print:text-[9px] font-bold uppercase">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {days.map((date, i) => {
                  const entry = findEntry(selectedAgentId, date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  const dateStr = formatDateLocal(date);
                  const rawDayLeaves = leaves.filter(l => 
                    Number(l.user_id) === Number(selectedAgentId) && 
                    dateStr >= l.start_date && 
                    dateStr <= l.end_date &&
                    l.status !== 'rejected'
                  );
                  const dayLeaves = resolveActiveLeaves(rawDayLeaves);
                  const firstLeave = dayLeaves[0];

                  let cellStatusText = '';
                  let cellStyle = {};
                  let cellCommentText = '';

                  const printEntity = selectedAgent?.entity || selectedEntity;

                  if (entry?.status) {
                    cellStatusText = entry.status === 'OFF' ? 'OFF' : (printEntity === 'MR-TTA' && ['FOR', 'ABS'].includes(entry.status) ? '' : entry.status);
                    cellStyle = getPrintCellStyles(entry.status, entry.border_color, isSandbox, printEntity).style;
                    cellCommentText = entry.status === 'OFF' ? 'OFF' : (printEntity === 'MR-TTA' ? '' : (entry.comment || ''));
                  } else if (firstLeave) {
                    const statusLabel = firstLeave.status === 'pending' ? 'Attente' : firstLeave.status === 'approved_chef' ? 'Val. Chef' : 'Val. DT';
                    cellStatusText = printEntity === 'MR-TTA' && ['FOR', 'ABS'].includes(firstLeave.type) ? '' : `${firstLeave.type} (${statusLabel})`;
                    cellStyle = getPrintCellStyles(firstLeave.type, undefined, isSandbox, printEntity).style;
                    cellCommentText = printEntity === 'MR-TTA' ? '' : (firstLeave.status === 'pending' ? 'En attente de validation' : firstLeave.status === 'approved_chef' ? 'Validé Chef (N+1)' : 'Validé DT (N+2)');
                  } else {
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    if (isWeekend) {
                      cellStatusText = 'OFF';
                      cellStyle = getPrintCellStyles('OFF', undefined, isSandbox, printEntity).style;
                      cellCommentText = printEntity === 'MR-TTA' ? '' : 'Repos / Week-end';
                    } else {
                      const age = users.find(u => u.id === selectedAgentId);
                      const defaultStat = age?.entity === 'MR-MGA' ? 'TRV' : age?.entity === 'MR-TTA' ? 'SEC' : 'PRE';
                      cellStatusText = defaultStat;
                      cellStyle = getPrintCellStyles(defaultStat, undefined, isSandbox, printEntity).style;
                      cellCommentText = printEntity === 'MR-TTA' ? '' : (age?.entity === 'Siège' ? 'Présence au siège' : age?.entity === 'MR-MGA' ? 'Service normal' : 'Service en section technique');
                    }
                  }

                  return (
                    <tr key={i} className={isWeekend ? 'bg-indigo-100/70' : ''}>
                      <td className={`border border-black p-2 print:p-1 text-xs print:text-[9px] font-mono ${isWeekend ? 'text-indigo-700 font-bold' : ''}`}>
                        {date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })} (S{getWeekStr(date).split('-W')[1]})
                      </td>
                      <td 
                        className="border border-black p-2 print:p-1 text-center text-xs print:text-[9px] font-bold"
                        style={cellStyle}
                      >
                        {cellStatusText}
                      </td>
                      <td className="border border-black p-2 print:p-1 text-xs print:text-[9px] italic">
                        {cellCommentText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {printType === 'entity' && (
          <div className="space-y-6 print:space-y-1.5">
            <div className="p-4 print:py-1 print:px-2 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 print:hidden">Planning Hebdomadaire</p>
              {selectedEntity === 'MR-TTA' ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-lg print:text-xl font-black text-gray-900">Entité : MR-TTA</p>
                    <p className="text-sm print:text-xs font-bold text-gray-700">du {days[0].toLocaleDateString('fr-FR')} au {days[6].toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 px-4 py-2 print:px-3 print:py-1 rounded-xl self-stretch sm:self-auto flex items-center justify-center shadow-sm">
                    <p className="text-xl print:text-xl font-black text-indigo-900 uppercase tracking-widest whitespace-nowrap">
                      Semaine {getWeekStr(days[0]).split('-W')[1]}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-lg print:text-sm font-bold text-gray-900">Entité: {selectedEntity} • Semaine {getWeekStr(days[0]).split('-W')[1]} (du {days[0].toLocaleDateString('fr-FR')} au {days[6].toLocaleDateString('fr-FR')})</p>
              )}
            </div>

            {selectedEntity === 'MR-TTA' && (
              <div className="h-4 print:h-3" />
            )}

            <table className="w-full border-collapse border border-gray-300 print:text-[8px] table-fixed rounded-xl overflow-hidden shadow-sm">
              <thead>
                {selectedEntity === 'MR-TTA' && (
                  <tr className="bg-gray-100/80 border-b border-gray-300">
                    <th className="border border-gray-300 p-1 font-black uppercase text-[8px] tracking-widest text-slate-500 bg-slate-100"></th>
                    {groupedUsersPrint.map(g => (
                      <th 
                        key={g.id} 
                        colSpan={g.users.length} 
                        className={`border border-gray-300 p-1 text-center text-[8px] print:text-[11px] font-black uppercase tracking-[0.15em] ${g.headerColor}`}
                      >
                        {g.fullName}
                      </th>
                    ))}
                  </tr>
                )}
                <tr className={`bg-gray-50/80 border-b border-gray-300 ${selectedEntity === 'MR-TTA' ? 'print:h-13' : 'print:h-16'}`}>
                  <th className="border border-gray-300 p-1.5 print:p-2 text-left text-[9px] print:text-[14px] font-black uppercase w-[100px] bg-gray-100">Date</th>
                  {flatGroupedUsersForPrint.map(u => (
                    <th 
                      key={u.id} 
                      className={`border border-gray-300 p-1.5 ${selectedEntity === 'MR-TTA' ? 'trigram-header-tta print:py-1 print:px-0.5' : 'trigram-header print:py-3 print:px-1 print:text-[9.5px]'} text-center text-[10px] print:leading-none tracking-tighter font-black uppercase text-gray-900 ${u.sectorColor || 'bg-gray-100'}`}
                      title={`${u.firstname} ${u.lastname}`}
                    >
                      {u.trigram}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.filter(date => {
                  const dateStr = formatDateLocal(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  if (!isWeekend) return true; // Keep all weekdays in the table
                  
                  // For weekends, only show Saturday or Sunday rows if at least one agent has an active, scheduled duty
                  return flatGroupedUsersForPrint.some(u => {
                    const entry = findEntry(u.id, date);
                    const rawDayLeaves = leaves.filter(l => 
                      l.user_id === u.id && 
                      dateStr >= l.start_date && 
                      dateStr <= l.end_date &&
                      l.status !== 'rejected'
                    );
                    const dayLeaves = resolveActiveLeaves(rawDayLeaves).filter(l => l.type !== 'C');
                    
                    if (entry?.status) {
                      return !['OFF', '', 'C', 'CA', 'RTT', 'REC', 'CET', 'ABS', 'ABS_V', 'ABS_D', 'EXC', 'Abs'].includes(entry.status);
                    }
                    if (dayLeaves.length > 0) {
                      return false;
                    }
                    return false; // Default weekend is off
                  });
                }).map(date => {
                  const dateStr = formatDateLocal(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const holidays = getNCHolidays(date.getFullYear());
                  const holidayName = holidays[dateStr];
                  
                  const showWeekSeparator = (selectedEntity === 'MR-TTA' || selectedEntity === 'MR-MGA') && date.getDay() === 0;
                  const nextDay = new Date(date);
                  nextDay.setDate(date.getDate() + 1);
                  const nextWeekNum = getWeekStr(nextDay).split('-W')[1];

                  return (
                    <React.Fragment key={date.toISOString()}>
                      <tr className={isWeekend || holidayName ? 'bg-indigo-50/20' : ''}>
                      <td className={`border border-gray-300 p-2 print:py-0.5 print:px-1 text-left bg-gray-50/50 ${isWeekend || holidayName ? 'bg-indigo-50/40 text-indigo-700' : ''}`}>
                        <div className="flex flex-col gap-0.5 leading-none">
                          <span className="text-[11px] font-black font-mono text-gray-900">
                            {date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <span className={`text-[8.5px] ${isWeekend || holidayName ? 'text-indigo-600 font-bold' : 'text-gray-500'} font-black uppercase tracking-wider`}>
                            {date.toLocaleDateString('fr-FR', { weekday: 'long' })}
                          </span>
                          {holidayName && (
                            <span className="text-[7px] text-red-600 font-black uppercase tracking-tight bg-red-50 border border-red-100 px-0.5 rounded inline-block w-fit mt-0.5 whitespace-nowrap">
                              {holidayName}
                            </span>
                          )}
                        </div>
                      </td>
                      {flatGroupedUsersForPrint.map(u => {
                        const entry = findEntry(u.id, date);
                        const rawDayLeaves = leaves.filter(l => 
                          l.user_id === u.id && 
                          dateStr >= l.start_date && 
                          dateStr <= l.end_date &&
                          l.status !== 'rejected'
                        );
                        const dayLeaves = isWeekend
                          ? resolveActiveLeaves(rawDayLeaves).filter(l => l.type !== 'C')
                          : resolveActiveLeaves(rawDayLeaves);
                        
                        let displayStyle = getOptimalCellStyles(entry?.status || '', entry?.border_color, isSandbox, date, selectedEntity);
                        
                        const isWeekendC = isWeekend && entry?.status === 'C';
                        const isWeekendConge = isWeekend && (!entry?.status || (entry.status === 'OFF' && selectedEntity !== 'MR-MGA') || entry.status === 'C' || entry.status === 'CA');
                        const isOffDay = (entry?.status === 'OFF' && selectedEntity !== 'MR-MGA') || entry?.status === '' || isWeekendC || isWeekendConge;
                        
                        return (
                          <td 
                            key={u.id} 
                            className={`border border-gray-300 p-1 print:p-0.5 text-center h-16 print:h-12 min-w-[70px] ${u.sectorColor || ''}`}
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              {/* If no entry found but we have calendar leaves */}
                              {entry === null && dayLeaves.length > 0 ? (
                                <div className="w-full h-full min-h-[38px] flex flex-col items-center justify-center bg-blue-50/80 text-[8px] rounded-lg border border-blue-200 p-1 box-border">
                                  {dayLeaves.map((l, idx) => (
                                    <div key={idx} className="flex flex-col items-center">
                                      <span className="text-[8px] font-black text-blue-700 uppercase leading-none">
                                        {selectedEntity === 'MR-TTA' && ['FOR', 'ABS'].includes(l.type) ? '' : l.type}
                                      </span>
                                      <span className="text-[6.5px] font-bold text-blue-500 uppercase leading-none mt-0.5 whitespace-nowrap">
                                        {l.status === 'pending' ? 'Attente' : l.status === 'approved_chef' ? 'Val. Chef' : 'Val. DT'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : isOffDay ? (
                                // Render completely blank for OFF days and weekend leaves
                                entry?.comment && selectedEntity !== 'MR-TTA' && (entry.status !== 'CA') ? (
                                  <span className={`font-bold px-0.5 ${selectedEntity === 'MR-MGA' ? 'text-[6.5px] leading-tight whitespace-pre-wrap break-words block max-w-full font-mono' : 'text-[7px] leading-none block truncate max-w-full'}`} title={entry.comment}>
                                    {entry.comment}
                                  </span>
                                ) : null
                              ) : (
                                <div style={displayStyle}>
                                  {entry?.status && !isOffDay && (entry.status !== 'CA' || selectedEntity === 'MR-TTA') && (() => {
                                    const statusVal = getTDSDisplayStatus(entry.status, date, selectedEntity);
                                    const isOffText = statusVal === 'OFF';
                                    const isMsOnlyText = statusVal === 'MS' && !entry?.comment;
                                    const isTtaForOrAbs = selectedEntity === 'MR-TTA' && ['FOR', 'ABS'].includes(entry.status);
                                    if ((isOffText && selectedEntity !== 'MR-MGA') || isMsOnlyText || isTtaForOrAbs) return null;
                                    return (
                                      <span className={`font-black tracking-tighter mb-0.5 ${selectedEntity === 'MR-TTA' ? 'text-[9.5px]/none print:text-[11.5px]' : 'text-[9.5px]/none'}`}>
                                        {statusVal}
                                      </span>
                                    );
                                  })()}
                                  {entry?.comment && selectedEntity !== 'MR-TTA' && (entry.status !== 'CA') && (
                                    <span className={`font-bold px-0.5 ${selectedEntity === 'MR-MGA' ? 'text-[6.5px] leading-tight whitespace-pre-wrap break-words block max-w-full font-mono' : 'text-[7px]/none block truncate max-w-full'}`} title={entry.comment}>
                                      {entry.comment}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    {showWeekSeparator && (
                      <tr className={selectedEntity === 'MR-MGA' ? "border-black print:hidden" : "bg-gray-200 border-t border-b border-gray-400 print:hidden"}>
                        <td 
                          colSpan={1 + flatGroupedUsersForPrint.length} 
                          className={selectedEntity === 'MR-MGA'
                            ? "bg-yellow-100 py-1.5 px-3 text-center font-black text-black text-[10px] tracking-widest uppercase border-t-2 border-b-2 border-black font-mono"
                            : "bg-gray-200 py-1.5 print:py-1 text-center font-black text-gray-700 text-xs print:text-[10px] tracking-widest uppercase"
                          }
                        >
                          Semaine {nextWeekNum}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedEntity === 'MR-TTA' && printType === 'entity' && (
          <div className="hidden print:block" style={{ height: '1cm' }} />
        )}

        <div className="mt-12 print:mt-4 pt-8 print:pt-2 border-t border-gray-200">
          <div className="mb-8 print:mb-2">
            <h3 className="text-xs print:text-[18px] font-bold text-gray-400 print:text-gray-800 print:font-black uppercase tracking-widest mb-4 print:mb-3">Agents de l'entité</h3>
            <div className="grid grid-cols-3 print:grid-cols-4 gap-x-4 gap-y-2 print:gap-y-2.5">
              {filteredUsers.map(u => (
                <div key={u.id} className="text-[9px] print:text-[9.5px] font-bold text-gray-700 flex items-center gap-2" title={`${u.firstname} ${u.lastname}`}>
                  <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500 min-w-[35px] print:min-w-[32px] print:text-[9.5px] text-center font-black">{u.trigram}</span>
                  <span className="truncate print:truncate-none font-black text-gray-900">{u.firstname} {u.lastname}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedEntity === 'MR-TTA' ? (
            <div className="print:border-t print:border-gray-100 print:pt-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 print:mb-1">Légende PLANNING</h3>
              <div className="grid grid-cols-2 gap-8 print:gap-4">
                {/* Cycles Column */}
                <div className="space-y-3">
                  {[
                    { code: '1', label: '1', desc: 'Lundi, Mardi en MO / Mercredi, Jeudi en MS' },
                    { code: '2', label: '2', desc: 'Mardi en MS / Mercredi, Jeudi et Vendredi en MO / RIT du Vendredi au Jeudi de la semaine suivante' },
                    { code: '3', label: '3', desc: 'Lundi à Jeudi MS + RIT' },
                  ].map(item => (
                    <div key={item.code} className="flex gap-3 items-start animate-fade-in">
                      <div 
                        className="w-5 h-5 print:w-4 print:h-4 flex-shrink-0 rounded border border-black/10 flex items-center justify-center text-[9px] print:text-[8px] font-black shadow-sm"
                        style={getPrintCellStyles(item.code, undefined, isSandbox, selectedEntity).style}
                      >
                        {item.label}
                      </div>
                      <span className="text-[10px] print:text-[8.5px] font-bold text-gray-600 leading-tight">
                        {item.desc}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status Column */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { code: 'MO', desc: 'Maintenance Opérationnelle' },
                    { code: 'RIT', desc: 'Réserve d’Intervention Technique' },
                    { code: 'MS', desc: 'De service' },
                    { code: 'MIS', desc: 'Mission Extérieure' },
                    { code: 'ABS', desc: 'Absence Exceptionnelle' },
                    { code: 'C', desc: 'Conges' },
                    { code: 'F', desc: 'Formation' },
                    { code: 'AE', desc: 'Astreinte Électrique' },
                  ].map(item => (
                    <div key={item.code} className="flex gap-2 items-center">
                      <div 
                        className="w-10 h-5 print:w-8 print:h-4 flex-shrink-0 rounded border border-black/10 flex items-center justify-center text-[9px] print:text-[8px] font-black shadow-sm"
                        style={item.code === 'MO'
                          ? { backgroundColor: '#BAE6FD', color: '#0c4a6e', border: '1px solid black' }
                          : item.code === 'RIT'
                          ? { backgroundColor: '#E77E31', color: '#ffffff', border: '1px solid black' }
                          : getPrintCellStyles(item.code, undefined, isSandbox, selectedEntity).style
                        }
                      >
                        {item.code}
                      </div>
                      <span className="text-[10px] print:text-[8px] font-bold text-gray-600 uppercase truncate">
                        {item.desc === 'Conges' ? 'Congés' : item.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={`grid ${selectedEntity === 'MR-MGA' ? 'grid-cols-2 print:grid-cols-1' : 'grid-cols-2'} gap-8 print:gap-4 print:border-t print:border-gray-100 print:pt-2`}>
              <div className={selectedEntity === 'MR-MGA' ? 'print:hidden' : ''}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 print:mb-1">Légende Tableau de Service</h3>
                <div className="grid grid-cols-2 gap-2 print:gap-x-2 print:gap-y-1">
                  {(selectedEntity === 'Siège' ? [
                    { code: 'PRE', label: 'Présence' },
                    { code: 'MIS', label: 'Mission' },
                    { code: 'CA', label: 'Congé annuel' },
                    { code: 'FOR', label: 'Formation' },
                    { code: 'REC', label: 'Récupération' },
                  ] : [
                    { code: 'Q', label: 'Astreinte J' },
                    { code: 'S', label: 'Perm. Semaine' },
                    { code: 'W', label: 'Perm. WE' },
                    { code: 'A', label: 'Semaine Après WE' },
                    { code: 'F', label: 'Formation' },
                    { code: 'C', label: 'Congé/ARTT' },
                    { code: 'I', label: 'Indisponible' },
                    { code: 'M', label: 'Mission' },
                    { code: 'AE', label: 'Astreinte Électrique' },
                  ].filter(s => !(selectedEntity === 'Siège' && s.code === 'AE'))).map(s => (
                    <div key={s.code} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 print:w-3 print:h-3 rounded border border-black/10 flex items-center justify-center text-[8px] print:text-[7px] font-bold"
                        style={getPrintCellStyles(s.code, undefined, isSandbox, selectedEntity).style}
                      >
                        {s.code}
                      </div>
                      <span className="text-[9px] print:text-[8px] font-bold text-gray-600 uppercase">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 print:mb-1">Légende Planning</h3>
                <div className="grid grid-cols-2 gap-2 print:gap-x-2 print:gap-y-1">
                  {getStatusList(selectedEntity).map(s => (
                    <div key={s.code} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 print:w-3 print:h-3 rounded border border-black/10 flex items-center justify-center text-[8px] print:text-[7px] font-bold"
                        style={['MO', 'RIT'].includes(s.code)
                          ? { backgroundColor: '#ffffff', color: '#1f2937' }
                          : getPrintCellStyles(s.code, undefined, isSandbox, selectedEntity).style
                        }
                      >
                      </div>
                      <span className="text-[9px] print:text-[8px] font-bold text-gray-600 uppercase">{s.label} ({s.code})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

const SortableUserRow = (props: { 
  u: User, 
  handleEditUser: (u: User) => void, 
  handleDeleteUser: (u: User) => void,
  key?: any
}) => {
  const { u, handleEditUser, handleDeleteUser } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: u.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      className={`hover:bg-gray-50/50 transition-all ${isDragging ? 'bg-white shadow-xl' : ''}`}
    >
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <button 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <GripVertical size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-mono text-sm font-bold text-gray-700 border border-gray-200" title={`${u.firstname} ${u.lastname}`}>
            {u.trigram}
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">{u.firstname} {u.lastname}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <span className={`px-3 py-1 text-xs font-black rounded-lg uppercase tracking-widest ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
          {u.role}
        </span>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex justify-end gap-3">
          <button 
            onClick={() => handleEditUser(u)}
            className="p-2.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
            title="Modifier"
          >
            <Edit2 size={18} />
          </button>
          <button 
            onClick={() => handleDeleteUser(u)}
            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Supprimer"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// --- Help Components ---

const Help = ({ user }: { user: User | null }) => {
  const [search, setSearch] = useState("");
  const [manualStatus, setManualStatus] = useState<{ exists: boolean; size?: number; lastModified?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchManualStatus = async () => {
    try {
      const res = await fetch("/api/help/manual/status");
      if (res.ok) {
        const data = await res.json();
        setManualStatus(data);
      }
    } catch (err) {
      console.error("Error fetching manual status:", err);
    }
  };

  useEffect(() => {
    fetchManualStatus();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadError("Veuillez sélectionner un fichier PDF valide.");
      setUploadSuccess(false);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);

    try {
      const CHUNK_SIZE = 500 * 1024; // 500 KB per chunk (guarantees staying below nginx 1MB limit)
      const totalSize = file.size;
      const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
      const uploadId = `manual_upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      console.log(`[USER MANUAL UPLOAD] Starting chunked upload for file: ${file.name} (${(totalSize / (1024 * 1024)).toFixed(2)} Mo), total chunks: ${totalChunks}`);

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const blobChunk = file.slice(start, end);

        const response = await fetch("/api/help/manual/chunk", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "x-user-trigram": user?.trigram || "",
            "x-chunk-index": chunkIndex.toString(),
            "x-total-chunks": totalChunks.toString(),
            "x-upload-id": uploadId,
          },
          body: blobChunk,
        });

        if (!response.ok) {
          let errorMsg = `Erreur lors du téléversement du bloc ${chunkIndex + 1}/${totalChunks}.`;
          try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const errData = await response.json();
              errorMsg = errData.error || errorMsg;
            } else {
              const txt = await response.text();
              errorMsg = txt || `Erreur (${response.status}): ${response.statusText}`;
            }
          } catch (parseErr) {
            errorMsg = `Erreur (${response.status}): ${response.statusText}`;
          }
          throw new Error(errorMsg);
        }

        const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        setUploadProgress(percent);
      }

      setUploadSuccess(true);
      fetchManualStatus();
    } catch (err: any) {
      console.error("[USER MANUAL UPLOAD ERROR]", err);
      setUploadError(err.message || "Erreur réseau.");
      setUploadSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };
  
  const userSections = [
    {
      id: "tds",
      title: "Tableau de Service (TDS)",
      content: "Le TDS vous permet de visualiser les présences et les astreintes de votre entité. Deux modes sont disponibles : 'Hebdo' (affichage journalier) et 'Annuel' (affichage hebdomadaire). Vous pouvez ajouter/modifier des commentaires sur vos propres statuts en cliquant sur la case correspondante.",
      keywords: ["tds", "planning", "présence", "astreinte", "calendrier", "hebdo", "annuel", "commentaire"]
    },
    {
      id: "leaves",
      title: "Gestion des Congés",
      content: "Soumettez vos demandes de congés via l'onglet 'Congés'. Les demandes passent par un circuit de validation : votre Chef de MR puis la Direction Technique (DT). Vous recevrez des notifications par email à chaque étape d'avancement ou de validation finale.",
      keywords: ["congés", "artt", "validation", "chef", "dt", "absence", "vacances", "demande"]
    },
    {
      id: "profile",
      title: "Mon Profil & Titres",
      content: "Maintenez vos informations à jour dans 'Mon Profil'. Vous y trouverez également le suivi de vos titres (AE, HE, Badge, Anglais). Les dates d'expiration sont surveillées et affichées avec des codes couleurs : rouge (expiré), orange (proche de l'expiration) ou bleu (valide).",
      keywords: ["profil", "titres", "ae", "he", "badge", "anglais", "habilitation", "licence", "validité"]
    },
    {
      id: "print",
      title: "Impression & PDF",
      content: "Utilisez le menu 'Impression' pour générer une version imprimable de votre planning personnel ou du planning global de votre entité. Vous pouvez ensuite l'imprimer ou l'enregistrer au format PDF.",
      keywords: ["impression", "pdf", "imprimer", "planning", "export"]
    }
  ];

  const adminSections = [
    {
      id: "admin-tds",
      title: "🛠️ Supervision & Administration du TDS",
      content: "En tant qu'administrateur, vous avez le plein contrôle sur le TDS. Vous pouvez modifier les statuts de tous les agents de votre entité. Pour les corrections rapides, utilisez la 'Mise à jour groupée' qui permet d'appliquer un statut sur une plage de dates complète. Vous avez également accès à l'historique des modifications via les logs système.",
      keywords: ["admin", "statut", "modification", "contrôle", "supervision", "groupée", "logs", "historique"]
    },
    {
      id: "admin-users",
      title: "👥 Gestion Avancée des Agents",
      content: "L'onglet 'Administration' vous permet de créer de nouveaux comptes, de modifier les profils existants ou de supprimer des comptes. Vous pouvez également réorganiser l'ordre d'affichage des agents par glisser-déposer. IMPORTANT : La modification du rôle ou de l'entité d'un agent impacte ses droits d'accès et sa visibilité dans les différents tableaux.",
      keywords: ["agents", "utilisateurs", "création", "ordre", "grip", "tri", "organisation", "rôles", "droits"]
    },
    {
      id: "admin-marquee",
      title: "📢 Communication (Marquee)",
      content: "Gérez le bandeau défilant pour diffuser des alertes ou des informations. Vous pouvez cibler des entités précises ou diffuser à tous. Astuce : Utilisez des messages courts et percutants pour une meilleure lisibilité.",
      keywords: ["marquee", "message", "alerte", "diffusion", "bandeau", "information"]
    },
    {
      id: "admin-validation",
      title: "✅ Workflow de Validation & Signatures",
      content: "Le processus est certifié par signature électronique. Une semaine close doit être validée par le Chef MR, puis par le Chef DT. Le verrou d'une semaine validée empêche toute modification ultérieure non tracée. Note : La date et l'heure de validation sont enregistrées et affichées.",
      keywords: ["validation", "signature", "officiel", "approuvé", "chef", "dt", "certifié", "verrou", "sécurité"]
    },
    {
      id: "admin-backups",
      title: "🛡️ Sécurité & Points de Restauration",
      content: "Crucial pour la pérennité des données. Créez des sauvegardes avant toute opération majeure de maintenance. En cas de corruption de la base, vous pouvez restaurer une version antérieure. L'option 'Update' synchronise le serveur avec GitHub pour appliquer les derniers correctifs de sécurité et de fonctionnalités.",
      keywords: ["sauvegarde", "système", "github", "vps", "restauration", "maintenance", "update", "sécurité", "continuité"]
    },
    {
      id: "admin-secretary-rights",
      title: "📁 Rôle Secrétariat",
      content: "Le rôle 'Secretary' possède des droits étendus pour aider à la saisie mais ne peut pas effectuer les validations finales Chef DT. Ils peuvent cependant préparer les plannings et assister les agents dans la mise à jour de leurs profils.",
      keywords: ["secrétaire", "saisie", "aide", "droits", "limites", "préparation"]
    },
    {
      id: "admin-checklist",
      title: "📋 Checklist d'Audit Admin",
      content: "Checklist hebdomadaire : \n1. Vérifier que toutes les absences (Congés/ARTT) sont correctement reportées dans le TDS.\n2. S'assurer que les titres (AE/HE) arrivant à échéance ont été renouvelés.\n3. Valider officiellement les semaines écoulées.\n4. Vérifier les logs de connexion pour détecter toute anomalie.",
      keywords: ["audit", "vérification", "contrôle", "checklist", "qualité", "surveillance"]
    }
  ];

  const sections = (user?.role === 'admin') ? adminSections : userSections;

  const actions = (user?.role === 'admin') ? [
    { action: "Double-clic (Tableau)", description: "Forçage administrateur du statut ou ajout de commentaire sur n'importe quel agent." },
    { action: "Drag & Drop (Admin > Agents)", description: "Réorganisation visuelle de la liste des agents par priorité d'affichage." },
    { action: "Mise à jour Système", description: "Déclenche le script de déploiement automatique via GitHub." },
    { action: "Snapshot DB", description: "Sauvegarde instantanée de l'état actuel de la base de données." },
    { action: "Signature Numérique", description: "Verrouillage légal et archivage de la semaine de service sélectionnée." }
  ] : [
    { action: "Cliquer sur sa propre case", description: "Ajouter une note personnelle ou un justificatif sur son propre planning." },
    { action: "Navigation Fléchée", description: "Passer d'une semaine/mois à l'autre rapidement." },
    { action: "Changement de Mode Vue", description: "Bascule entre Hebdo (détail) et Annuel (vue d'ensemble)." },
    { action: "Soumission de Congés", description: "Envoyer une demande d'absence au circuit de validation." }
  ];

  const allStatuses = [
    { code: '1', label: 'BAS: Lun/Mar MO, Mer/Jeu MS', color: 'bg-transparent text-[#4FB6E1] border-4 border-[#4FB6E1]' },
    { code: '2', label: 'BAS: MS/MO/RIT (V-J suiv.)', color: 'bg-transparent text-[#1B6486] border-4 border-[#1B6486]' },
    { code: '3', label: 'BAS: Lun-Jeu MS + RIT', color: 'bg-transparent text-[#E77E31] border-4 border-[#E77E31]' },
    { code: 'C', label: 'Congés (BAS: Vert)', color: 'bg-green-500 text-white border-green-600' },
    { code: 'F', label: 'Formation (BAS: Violet)', color: 'bg-violet-500 text-white border-violet-600' },
    { code: 'SEC', label: 'Section (Normal TTA)', color: 'bg-green-200 text-green-900 border-green-300' },
    { code: 'PRE', label: 'Présence (Siège)', color: 'bg-green-200 text-green-900 border-green-300' },
    { code: 'TRV', label: 'Travail (Normal MGA)', color: 'bg-green-200 text-green-900 border-green-300' },
    { code: 'CA', label: 'Congés Annuels', color: 'bg-blue-200 text-blue-900 border-blue-300' },
    { code: 'RTT', label: 'RTT', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { code: 'REC', label: 'Récupération', color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { code: 'CET', label: 'Compte Épargne Temps', color: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
    { code: 'OFF', label: 'Repos / Week-end', color: 'bg-gray-200 text-gray-800 border-gray-400' },
    { code: 'PER', label: 'Permanence', color: 'bg-emerald-200 text-emerald-900 border-emerald-300' },
    { code: 'RIT', label: 'Astreinte', color: 'bg-yellow-200 text-yellow-900 border-yellow-300' },
    { code: 'FOR', label: 'Formation', color: 'bg-indigo-200 text-indigo-900 border-indigo-300' },
    { code: 'MIS', label: 'Mission', color: 'bg-purple-200 text-purple-900 border-purple-300' },
    { code: 'TLT', label: 'Télétravail', color: 'bg-cyan-200 text-cyan-900 border-cyan-300' },
    { code: 'ABS', label: 'Absence Validée', color: 'bg-rose-200 text-rose-900 border-rose-300' },
    { code: 'EXC', label: 'Absence Exceptionnelle', color: 'bg-slate-200 text-slate-900 border-slate-300' },
    { code: 'Q', label: 'RIT 7J (Astreinte)', color: 'bg-violet-200 text-violet-900 border-violet-300' },
    { code: 'S', label: 'Perm. Semaine', color: 'bg-amber-200 text-amber-900 border-amber-300' },
    { code: 'W', label: 'Perm. Week-end', color: 'bg-orange-200 text-orange-900 border-orange-300' },
    { code: 'A', label: 'Semaine Après WE', color: 'bg-lime-200 text-lime-900 border-lime-300' },
  ];

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.content.toLowerCase().includes(search.toLowerCase()) ||
    s.keywords.some(k => k.includes(search.toLowerCase()))
  );

  const filteredActions = actions.filter(a => 
    a.action.toLowerCase().includes(search.toLowerCase()) || 
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStatuses = allStatuses.filter(s => 
    s.code.toLowerCase().includes(search.toLowerCase()) || 
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-black p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
              <HelpCircle size={40} className="text-indigo-400" /> Centre d'Aide
            </h2>
            <p className="text-gray-400 mt-4 text-lg font-medium max-w-2xl">
              Guide complet de l'application TDS DT. Utilisez la recherche pour trouver rapidement une information.
            </p>
            
            <div className="mt-8 relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input 
                type="text"
                placeholder="Rechercher (ex: congés, astreinte, SEC...)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-500 focus:bg-white/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section className="space-y-6">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                <BookOpen size={24} className="text-indigo-600" /> Guide des fonctionnalités
              </h3>
              <div className="space-y-8">
                {filteredSections.map((s, i) => (
                  <div key={s.id} className="group p-6 rounded-3xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-4 mb-3">
                      <span className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-xs">{i + 1}</span>
                      {s.title}
                    </h4>
                    <p className="text-gray-600 leading-relaxed pl-12">{s.content}</p>
                  </div>
                ))}
                {filteredSections.length === 0 && search && (
                  <p className="text-center py-4 text-gray-400 italic">Aucune fonctionnalité correspondante.</p>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                <MousePointer2 size={24} className="text-indigo-600" /> Guide des actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredActions.map((a, i) => (
                  <div key={i} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="font-black text-gray-900 text-sm uppercase tracking-wider mb-1">{a.action}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{a.description}</p>
                  </div>
                ))}
                {filteredActions.length === 0 && search && (
                  <p className="col-span-full text-center py-4 text-gray-400 italic">Aucune action correspondante.</p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-12">
            <section className="space-y-6">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                <FileText size={24} className="text-indigo-600" /> Manuel Utilisateur
              </h3>
              
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Téléchargez la version PDF du manuel de l'utilisateur de l'application TDS-DT pour une consultation hors ligne ou pour l'imprimer.
                </p>

                {manualStatus?.exists ? (
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-150 space-y-1">
                    <p><strong>Dernière mise à jour :</strong> {new Date(manualStatus.lastModified || "").toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <p><strong>Taille du fichier :</strong> {(manualStatus.size ? manualStatus.size / (1024 * 1024) : 0).toFixed(2)} Mo</p>
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-150">
                    Aucun manuel utilisateur n'a été téléversé pour le moment.
                  </div>
                )}

                <a
                  href="/api/help/manual"
                  download="manuel_utilisateur.pdf"
                  className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    manualStatus?.exists
                      ? "bg-black text-white hover:bg-gray-900 shadow-lg hover:shadow-black/10 hover:scale-[1.02] cursor-pointer"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                  }`}
                  onClick={(e) => {
                    if (!manualStatus?.exists) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Download size={18} />
                  Télécharger le Manuel (PDF)
                </a>

                {user?.role === 'admin' && (
                  <div className="pt-4 border-t border-gray-150 space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zone Administrateur</p>
                    
                    <label 
                      htmlFor="manual-upload" 
                      className={`w-full py-2.5 px-4 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        isUploading 
                          ? "bg-gray-50 border-gray-300 text-gray-400 cursor-wait" 
                          : "border-indigo-300 text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-400"
                      }`}
                    >
                      <FileUp size={16} />
                      {isUploading ? `Mise à jour (${uploadProgress}%)...` : "Téléverser / Remplacer le PDF"}
                    </label>
                    <input 
                      type="file" 
                      id="manual-upload" 
                      accept=".pdf" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      disabled={isUploading}
                    />

                    {uploadError && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle size={14} /> {uploadError}
                      </p>
                    )}

                    {uploadSuccess && (
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-green-500" /> Manuel mis à jour avec succès !
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                <Palette size={24} className="text-indigo-600" /> Légende
              </h3>

              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <RefreshCw size={12} /> Fonctionnement des Cycles
                </p>
                
                <div className="space-y-4">
                  {/* Cycle 1 Visual */}
                  <div className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-50/50 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                    <div className="relative p-4 border-2 border-blue-100 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border-4 border-[#4FB6E1] flex items-center justify-center font-black text-[#4FB6E1] text-xs">1</div>
                        <span className="font-black text-blue-900 text-[11px] uppercase tracking-wider">Cycle 1 : MO & MS</span>
                      </div>
                      <div className="flex gap-1">
                        {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map((day, idx) => (
                          <div key={day} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[8px] font-bold text-gray-400">{day}</span>
                            <div className={`w-full h-8 rounded-lg flex items-center justify-center text-[9px] font-black border-2 ${idx < 2 ? 'bg-amber-100 border-amber-300 text-amber-900' : idx < 4 ? 'bg-yellow-100 border-yellow-300 text-yellow-900' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                              {idx < 2 ? 'MO' : idx < 4 ? 'MS' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-blue-700 italic font-medium pl-2 border-l-2 border-blue-200">
                        Lundi, Mardi en MO / Mercredi, Jeudi en MS
                      </p>
                    </div>
                  </div>

                  {/* Cycle 2 Visual */}
                  <div className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-slate-50 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                    <div className="relative p-4 border-2 border-slate-200 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border-4 border-[#1B6486] flex items-center justify-center font-black text-[#1B6486] text-xs">2</div>
                        <span className="font-black text-slate-900 text-[11px] uppercase tracking-wider">Cycle 2 : MS, MO & RIT</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1">
                          {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map((day, idx) => (
                            <div key={day} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[8px] font-bold text-gray-400">{day}</span>
                              <div className={`w-full h-8 rounded-lg flex items-center justify-center text-[9px] font-black border-2 ${idx === 1 ? 'bg-yellow-100 border-yellow-300 text-yellow-900' : idx > 1 && idx < 5 ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                {idx === 1 ? 'MS' : idx > 1 && idx < 5 ? 'MO' : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 bg-yellow-200 border border-yellow-400 rounded px-2 flex items-center justify-center text-[8px] font-black">RIT</div>
                          <p className="text-[9px] font-bold text-yellow-700 animate-pulse">→ Astreinte du Vendredi au Jeudi suivant</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-700 italic font-medium pl-2 border-l-2 border-slate-300">
                        Mardi en MS / Mercredi, Jeudi et Vendredi en MO / RIT du Ven. au Jeu. suiv.
                      </p>
                    </div>
                  </div>

                  {/* Cycle 3 Visual */}
                  <div className="relative overflow-hidden group">
                    <div className="absolute inset-0 bg-orange-50/50 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                    <div className="relative p-4 border-2 border-orange-100 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border-4 border-[#E77E31] flex items-center justify-center font-black text-[#E77E31] text-xs">3</div>
                        <span className="font-black text-orange-900 text-[11px] uppercase tracking-wider">Cycle 3 : MS + RIT</span>
                      </div>
                      <div className="flex gap-1">
                        {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map((day, idx) => (
                          <div key={day} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[8px] font-bold text-gray-400">{day}</span>
                            <div className={`w-full h-8 rounded-lg flex flex-col items-center justify-center text-[8px] font-black border-2 ${idx < 4 ? 'bg-yellow-100 border-yellow-500 text-yellow-950' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                              {idx < 4 && <span>MS</span>}
                              {idx < 4 && <span className="text-[7px]">RIT</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-orange-700 italic font-medium pl-2 border-l-2 border-orange-200">
                        Lundi à Jeudi : MS + RIT cumulés
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tous les statuts</p>
                <div className="grid grid-cols-1 gap-3">
                  {filteredStatuses.map(l => (
                    <div key={l.code} className="flex items-center gap-3 group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border transition-transform group-hover:scale-110 ${l.color}`}>{l.code}</div>
                      <span className="text-xs font-bold text-gray-600 leading-tight">{l.label}</span>
                    </div>
                  ))}
                  {filteredStatuses.length === 0 && search && (
                    <p className="text-center py-4 text-gray-400 italic">Aucun statut correspondant.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};



const getTitleCellStyles = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'text-slate-400 bg-transparent';
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiry = new Date(dateStr);
  expiry.setHours(0,0,0,0);
  
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 30) {
    // rouge : échéance <= 1 mois (ou déjà dépassé)
    return 'bg-red-50 text-red-600 border-l-4 border-red-500 font-bold';
  } else if (diffDays <= 90) {
    // jaune : échéance <= 3 mois
    return 'bg-amber-50 text-amber-700 border-l-4 border-amber-500 font-bold';
  } else if (diffDays <= 180) {
    // bleu : échéance <= 6 mois (et > 3 mois)
    return 'bg-blue-50 text-blue-700 border-l-4 border-blue-500 font-bold';
  } else {
    // vert clair par défaut (échéance > 6 mois)
    return 'bg-emerald-50/50 text-emerald-600 border-l-4 border-emerald-400/80 font-bold';
  }
};

const renderExpiryCell = (dateStr: string | null | undefined) => {
  if (!dateStr) return <span className="text-slate-300">-</span>;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiry = new Date(dateStr);
  expiry.setHours(0,0,0,0);
  
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  let bgClass = '';
  
  if (diffDays <= 30) {
    // expiration <= 1 mois -> rouge
    bgClass = 'bg-red-100 text-red-800 border-red-200';
  } else if (diffDays <= 60) {
    // expiration <= 2 mois -> orange
    bgClass = 'bg-orange-100 text-orange-850 border-orange-200';
  } else if (diffDays <= 90) {
    // expiration <= 3 mois -> jaune
    bgClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  } else if (diffDays <= 182) {
    // expiration < 6 mois (et > 3 mois) -> bleu tout simple
    bgClass = 'bg-blue-100 text-blue-800 border-blue-200';
  } else {
    // expiration > 6 mois -> vert clair
    bgClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  
  return (
    <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-bold border leading-none min-w-[85px] text-center shadow-xs ${bgClass}`} title={expiry.toLocaleDateString('fr-FR')}>
      {expiry.toLocaleDateString('fr-FR')}
    </div>
  );
};



function AppContent() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      return null;
    }
  });
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  
  // activeTab is now derived from the URL
  const activeTab = location.pathname.split('/')[1] || 'dashboard';

  const [selectedEntity, setSelectedEntity] = useState<Entity>(() => {
    try {
      const saved = localStorage.getItem('user');
      const u = saved ? JSON.parse(saved) : null;
      return u?.entity || 'Siège';
    } catch (e) {
      return 'Siège';
    }
  });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [isIcsModalOpen, setIsIcsModalOpen] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<any>({
    trigram: '', 
    firstname: '', 
    lastname: '', 
    role: 'user', 
    entity: 'Siège', 
    password: 'password123',
    off_day: 'Vendredi',
    tlt_day: 'Aucun',
    email: '',
    mobile_num: '',
    professional_num: '',
    address: '',
    comment: '',
    olaf_link: '', 
    birth_date: '', 
    corps: '', 
    profil: '', 
    licence_num: '',
    ae_issue_date: '', 
    ae_expiry_date: '', 
    he_expiry_date: '', 
    he_training_date: '',
    safety_badge_num: '', 
    safety_badge_expiry_date: '', 
    zcp_expiry_date: '',
    english_test_date: '', 
    english_level: '', 
    english_next_test_date: ''
  });
  const [userModalTab, setUserModalTab] = useState<'info' | 'titles'>('info');
  const [marqueeMessages, setMarqueeMessages] = useState<MarqueeMessage[]>([]);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [isEditingMarquee, setIsEditingMarquee] = useState(false);
  const [dashboardView, setDashboardView] = useState<'hebdo' | 'annuel'>('hebdo');
  const [editingMarquee, setEditingMarquee] = useState<MarqueeMessage | null>(null);
  const [marqueeFormEntities, setMarqueeFormEntities] = useState<string[]>(['All', 'Siège', 'MR-MGA', 'MR-TTA']);
  const [marqueeFormAdminOnly, setMarqueeFormAdminOnly] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [githubUpdate, setGithubUpdate] = useState<{ updateAvailable: boolean, remoteVersion: string, localVersion: string, repoUrl: string } | null>(null);
  const [adminTab, setAdminTab] = useState<'users' | 'system' | 'journal' | 'mails'>('users');

  useEffect(() => {
    if (adminTab === 'journal') {
      fetchData();
    }
  }, [adminTab]);
  const [backups, setBackups] = useState<any[]>([]);
  const [backupFetchError, setBackupFetchError] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCorrectingShift, setIsCorrectingShift] = useState(false);
  const [updateLogs, setUpdateLogs] = useState('');
  const [appUpdates, setAppUpdates] = useState<any[]>([]);
  const [connectionLogs, setConnectionLogs] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Email Testing States
  const [smtpChecking, setSmtpChecking] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<'unchecked' | 'ok' | 'error'>('unchecked');
  const [smtpMessage, setSmtpMessage] = useState('');
  
  const [simAgentId, setSimAgentId] = useState<string>('');
  const [simLeaveType, setSimLeaveType] = useState<string>('CA');
  const [simStartDate, setSimStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [simEndDate, setSimEndDate] = useState<string>(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
  const [simWorkflowType, setSimWorkflowType] = useState<'request' | 'approved_chef' | 'approved_dt' | 'rejected'>('request');
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  
  const [rawTo, setRawTo] = useState('demba.ndiaye@aviation-civile.gouv.fr');
  const [rawSubject, setRawSubject] = useState('Test de connectivité SMTP - TDS DT');
  const [rawBody, setRawBody] = useState('Ceci est un e-mail de test envoyé depuis l\'application TDS DT.');
  const [rawSending, setRawSending] = useState(false);
  const [rawResult, setRawResult] = useState('');

  // Mail Workflow Customization States
  const [mailSettings, setMailSettings] = useState<Record<string, string>>({});
  const [activeMailTemplateKey, setActiveMailTemplateKey] = useState<string>('creation');
  const [editedMailSubject, setEditedMailSubject] = useState<string>('');
  const [editedMailBody, setEditedMailBody] = useState<string>('');
  const [editedRecipients, setEditedRecipients] = useState<string[]>([]);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (adminTab === 'mails') {
      const loadMailSettings = async () => {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data = await res.json();
            setMailSettings(data);
            if (data.email_debug_recipient) {
              setRawTo(data.email_debug_recipient);
            }
          }
        } catch (e) {
          console.error("[LOAD MAIL SETTINGS ERROR]", e);
        }
      };
      loadMailSettings();
    }
  }, [adminTab]);

  useEffect(() => {
    const getMailDefault = (key: string): string => {
      const defaults: Record<string, string> = {
        mail_mode: "TEST",
        mail_custom_emails: "secretariat.dt@aviation-civile.gouv.fr",
        mail_recipients_creation: "n1",
        mail_recipients_approved_chef: "agent,n2",
        mail_recipients_approved_dt: "agent,secretaries",
        mail_recipients_rejected: "agent",
        
        mail_subject_creation: "Nouvelle demande de {type} - {trigram}",
        mail_body_creation: "Une nouvelle demande de <strong>{type}</strong> a été déposée par l'agent <strong>{firstname} {lastname}</strong> ({trigram}).<br><br><strong>Période :</strong> du {start_date} au {end_date}.",
        
        mail_subject_approved_chef_agent: "[TDS DT] Validation intermédiaire de votre demande de congé - Chef d'Entité",
        mail_body_approved_chef_agent: "Votre demande de <strong>{type}</strong> du {start_date} au {end_date} a été <strong>validée par votre Chef d'Entité (N+1)</strong>.<br><br>Elle est dorénavant en attente de la validation finale par la Direction Technique (N+2).",
        
        mail_subject_approved_chef_n2: "[TDS DT] Validation requise N+2 - Demande de congé de {trigram}",
        mail_body_approved_chef_n2: "La demande de <strong>{type}</strong> de l'agent <strong>{firstname} {lastname}</strong> ({trigram}) du {start_date} au {end_date} a été validée par son Chef d'Entité (N+1).<br><br>Votre <strong>validation finale (N+2)</strong> est désormais attendue dans l'application.",
        
        mail_subject_approved_dt_agent: "[TDS DT] Validation de votre demande de congé",
        mail_body_approved_dt_agent: "Votre demande de <strong>{type}</strong> du {start_date} au {end_date} a été <strong>validée définitivement</strong> par la Direction Technique (N+2).<br><br>Le planning du Tableau de Service (TDS) a été mis à jour en conséquence.",
        
        mail_subject_rejected_agent: "[TDS DT] Demande de congé refusée",
        mail_body_rejected_agent: "Votre demande de <strong>{type}</strong> du {start_date} au {end_date} a été <strong>refusée</strong>.<br><br>Pour plus de détails, nous vous invitons à vous rapprocher de votre responsable d'entité."
      };
      return defaults[key] || "";
    };

    const getSettingValue = (key: string) => mailSettings[key] !== undefined ? mailSettings[key] : getMailDefault(key);

    setEditedMailSubject(getSettingValue(`mail_subject_${activeMailTemplateKey}`));
    setEditedMailBody(getSettingValue(`mail_body_${activeMailTemplateKey}`));

    let eventName = "creation";
    if (activeMailTemplateKey.includes("approved_chef")) eventName = "approved_chef";
    else if (activeMailTemplateKey.includes("approved_dt")) eventName = "approved_dt";
    else if (activeMailTemplateKey.includes("rejected")) eventName = "rejected";

    const savedRecipients = getSettingValue(`mail_recipients_${eventName}`);
    setEditedRecipients(savedRecipients.split(',').map((s: string) => s.trim()).filter(Boolean));
  }, [activeMailTemplateKey, mailSettings]);

  const handleSaveActiveMailTemplate = async () => {
    try {
      setSaveSuccessMessage('');
      const subjectKey = `mail_subject_${activeMailTemplateKey}`;
      const bodyKey = `mail_body_${activeMailTemplateKey}`;
      
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: subjectKey, value: editedMailSubject })
      });

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: bodyKey, value: editedMailBody })
      });

      let eventName = "creation";
      if (activeMailTemplateKey.includes("approved_chef")) eventName = "approved_chef";
      else if (activeMailTemplateKey.includes("approved_dt")) eventName = "approved_dt";
      else if (activeMailTemplateKey.includes("rejected")) eventName = "rejected";

      const recipientsKey = `mail_recipients_${eventName}`;
      const recipientsValue = editedRecipients.join(',');

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: recipientsKey, value: recipientsValue })
      });

      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setMailSettings(data);
      }

      setSaveSuccessMessage('Enregistré avec succès !');
      setTimeout(() => setSaveSuccessMessage(''), 3000);
    } catch (err) {
      console.error("[SAVE MAIL TEMPLATE ERROR]", err);
    }
  };

  const handleToggleMailMode = async (mode: 'TEST' | 'OPE') => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'mail_mode', value: mode })
      });
      setMailSettings(prev => ({ ...prev, mail_mode: mode }));
    } catch (err) {
      console.error("[TOGGLE MAIL MODE ERROR]", err);
    }
  };

  const handleSaveCustomEmails = async (value: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'mail_custom_emails', value })
      });
      setMailSettings(prev => ({ ...prev, mail_custom_emails: value }));
    } catch (err) {
      console.error("[SAVE CUSTOM EMAILS ERROR]", err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncVersion = async () => {
      // N'exécuter que pour les admins pour éviter les conflits d'écriture si plusieurs utilisateurs sont connectés
      // Bien que le backend gère les transactions, c'est plus propre.
      if (!user || user.role !== 'admin' || isUpdateLoading) return;
      
      // On attend que les mises à jour soient chargées (sauf si c'est la première fois)
      const isInitialFetch = appUpdates.length === 0;
      
      const exists = !isInitialFetch && (
        appUpdates.some(u => u.version_code === APP_VERSION) ||
        appUpdates.some(u => u.is_github)
      );
      
      if (!exists) {
        console.log(`[AUTO-SYNC] Version ${APP_VERSION} not found in history. Registering...`);
        setIsUpdateLoading(true);

        const getDigits = (v: string) => {
          const match = v.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
          if (!match) return [0, 0, 0];
          return [
            parseInt(match[1]) || 0, 
            parseInt(match[2]) || 0, 
            parseInt(match[3] || '0')
          ];
        };
        
        // Trouver la version précédente pour comparer
        const latestUpdate = [...appUpdates].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
        const dbVersion = latestUpdate ? (latestUpdate.version_code || "TDS-1.0") : "TDS-1.0";
        
        const dbDigits = getDigits(dbVersion);
        const codeDigits = getDigits(APP_VERSION);
        
        const isMajor = codeDigits[0] > dbDigits[0] || codeDigits[1] > dbDigits[1];
        
        const summary = isMajor 
          ? `Mise à jour majeure : Déploiement version ${APP_VERSION}`
          : `Mise à jour mineure : Améliorations et corrections (${APP_VERSION})`;
        
        const details = isMajor
          ? `Passage à la version ${APP_VERSION}. Cette mise à jour inclut des changements structurels ou des fonctionnalités majeures.`
          : `Correction de bugs et optimisations mineures du code source pour la version ${APP_VERSION}.`;

        try {
          const res = await fetch('/api/updates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              version_code: APP_VERSION,
              summary,
              details
            })
          });
          
          if (res.ok) {
            console.log(`[AUTO-SYNC] Version ${APP_VERSION} registered successfully.`);
            // Rafraîchir les données globales (dont appUpdates)
            await fetchData();
          }
        } catch (e) {
          console.error("[AUTO-SYNC ERROR]", e);
        } finally {
          setIsUpdateLoading(false);
        }
      }
    };

    syncVersion();
  }, [appUpdates, user?.id]);

  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationWeeks, setMigrationWeeks] = useState({ start: 1, end: 53 });

  // S'assurer que TOUS les hooks du reste de AppContent sont aussi ici si nécessaire
  // (Note: Dans ce composant géant, on vérifie qu'aucun hook n'est après le if(!user))

  const checkUpdates = async () => {
    try {
      const res = await fetch('/api/admin/check-update');
      if (res.ok) {
        const data = await res.json();
        if (data && data.error) {
           console.warn("Update check returned error:", data.message);
           setGithubUpdate(null);
           return;
        }
        if (data && !data.skip) {
          setGithubUpdate(data);
        }
      }
    } catch (e) {
      console.error("Update check failed", e);
    }
  };

  const fetchBackups = async () => {
    try {
      setBackupFetchError(null);
      const res = await fetch('/api/admin/backups');
      if (res.ok) {
        setBackups(await res.json());
      } else {
        const err = await res.json();
        setBackupFetchError(err.error || "Erreur HTTP " + res.status);
      }
    } catch (e: any) {
      console.error("Failed to fetch backups", e);
      setBackupFetchError(e.message);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/admin/backups/create', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showNotification("Sauvegarde créée avec succès : " + data.name);
        fetchBackups();
      } else {
        showNotification("Erreur lors de la sauvegarde : " + (data.error || "Inconnue"), 'error');
      }
    } catch (e) {
      showNotification("Erreur réseau lors de la sauvegarde", 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (name: string) => {
    if (!window.confirm(`Attention : Restaurer la sauvegarde "${name}" écrasera toutes les données actuelles par celles de cette sauvegarde. Continuer ?`)) return;
    
    setIsRestoring(true);
    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Base de données restaurée avec succès !");
        fetchData(); // Refresh all data
      } else {
        showNotification(data.error || "Erreur lors de la restauration", 'error');
      }
    } catch (e) {
      showNotification("Erreur réseau lors de la restauration. Le serveur est peut-être en train de redémarrer.", 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (name: string) => {
    if (!window.confirm(`Supprimer définitivement le fichier "${name}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification("Fichier supprimé");
        fetchBackups();
      } else {
        showNotification("Erreur lors de la suppression", 'error');
      }
    } catch (e) {
      showNotification("Erreur réseau", 'error');
    }
  };

  const handleCheckSmtp = async () => {
    setSmtpChecking(true);
    setSmtpStatus('unchecked');
    setSmtpMessage('');
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection' })
      });
      const data = await res.json();
      if (res.ok) {
        setSmtpStatus('ok');
        setSmtpMessage(data.message || 'Connexion SMTP établie avec succès !');
      } else {
        setSmtpStatus('error');
        setSmtpMessage(data.error || 'Impossible de se connecter au serveur SMTP.');
      }
    } catch (err: any) {
      setSmtpStatus('error');
      setSmtpMessage(err.message || 'Erreur de connexion SMTP.');
    } finally {
      setSmtpChecking(false);
    }
  };

  const handleSendRawEmail = async () => {
    setRawSending(true);
    setRawResult('');
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_raw',
          to: rawTo,
          subject: rawSubject,
          body: rawBody
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRawResult(`[SUCCÈS] ${data.message || 'Email test brut envoyé.'}`);
        showNotification('E-mail envoyé avec succès !');
      } else {
        setRawResult(`[ERREUR] ${data.error || 'Échec de l\'envoi.'}`);
      }
    } catch (err: any) {
      setRawResult(`[ERREUR] ${err.message || 'Erreur.'}`);
    } finally {
      setRawSending(false);
    }
  };

  const handleTriggerLeaveWorkflow = async () => {
    if (!simAgentId) {
      showNotification('Veuillez d\'abord sélectionner un agent pour la simulation.', 'error');
      return;
    }
    setSimRunning(true);
    setSimLogs([]);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger_leave_workflow',
          agentId: parseInt(simAgentId),
          workflowType: simWorkflowType,
          leaveType: simLeaveType,
          startDate: simStartDate,
          endDate: simEndDate
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSimLogs(data.logs || [`Simulation réussie.`]);
        showNotification('Simulation du workflow effectuée !');
      } else {
        setSimLogs([`[ERREUR] ${data.error || 'Échec de l\'envoi.'}`]);
      }
    } catch (err: any) {
      setSimLogs([`[ERREUR] ${err.message || 'Erreur.'}`]);
    } finally {
      setSimRunning(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    if (adminTab === 'journal') {
      fetch('/api/updates')
        .then(res => res.json())
        .then(data => setAppUpdates(data));
    }
  }, [adminTab]);

  useEffect(() => {
    if (adminTab === 'system') {
      fetchBackups();
    }
  }, [adminTab]);

  useEffect(() => {
    if (editingMarquee) {
      setMarqueeFormEntities(editingMarquee.entities.split(','));
      setMarqueeFormAdminOnly(!!editingMarquee.admin_only);
    } else {
      setMarqueeFormEntities(['All', 'Siège', 'MR-MGA', 'MR-TTA']);
      setMarqueeFormAdminOnly(false);
    }
  }, [editingMarquee]);

  const fetchData = async () => {
    if (!user) return;
    
    // Concurrent fetches with individual error handling
    const endpoints = [
      { url: '/api/users', setter: (data: any) => setUsers(Array.isArray(data) ? data : []) },
      { url: '/api/logs', setter: (data: any) => setConnectionLogs(Array.isArray(data) ? data : []) },
      { url: '/api/updates', setter: (data: any) => setAppUpdates(Array.isArray(data) ? data : []) },
      { url: '/api/marquee', setter: (data: any) => {
          console.log("[MARQUEE] Received:", data);
          setMarqueeMessages(Array.isArray(data) ? data : []);
      }},
      { url: '/api/leaves', setter: (data: any) => {
          if (!Array.isArray(data)) return;
          const relevantLeaves = data.filter((l: any) => {
            if (user.entity === 'Siège') {
              return l.status === 'approved_chef' || l.status === 'pending';
            } else {
              return l.status === 'pending' && l.entity === user.entity;
            }
          });
          setPendingLeavesCount(relevantLeaves.length);
      }}
    ];

    await Promise.all(endpoints.map(async ({ url, setter }) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setter(data);
        } else {
          console.error(`[FETCH ERROR] ${url} failed with ${res.status}`);
        }
      } catch (e) {
        console.error(`[FETCH EXCEPTION] ${url}:`, e);
      }
    }));

    // Optional settings fetch
    try {
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        await settingsRes.json();
      }
    } catch (e) {
      console.warn("Settings fetch failed (optional)");
    }
  };

  const handlePublishSandbox = () => {
    setShowMigrationDialog(true);
  };

  const handleCopyActiveToSandbox = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir écraser le tableau BAS par les données du tableau annuel actuel ? Cette action est irréversible et écrasera le BAS existant.")) {
      return;
    }
    try {
      const res = await fetch('/api/tds/copy-active-to-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'MR-TTA' }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || "Tableau actuel basculé vers le BAS avec succès !");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showNotification(data.error || "Erreur lors du basculement.", 'error');
      }
    } catch (error) {
      showNotification("Erreur réseau", 'error');
    }
  };

  const handleConfirmMigration = async () => {
    setShowMigrationDialog(false);
    try {
      const res = await fetch('/api/tds/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entity: 'MR-TTA',
          startWeek: migrationWeeks.start,
          endWeek: migrationWeeks.end
        }),
      });
      
      if (res.ok) {
        showNotification(`Planning (semaines ${migrationWeeks.start} à ${migrationWeeks.end}) mis à jour avec succès !`);
        setIsSandboxMode(false);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showNotification("Erreur lors du basculement.", 'error');
      }
    } catch (error) {
      showNotification("Erreur réseau", 'error');
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PATCH' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userFormData),
    });

    if (res.ok) {
      const result = await res.json();
      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({ 
        trigram: '', 
        firstname: '', 
        lastname: '', 
        role: 'user', 
        entity: 'Siège', 
        password: 'password123',
        off_day: 'Vendredi',
        email: '',
        mobile_num: '',
        professional_num: '',
        address: '',
        comment: '',
        olaf_link: '',
        birth_date: '',
        corps: '',
        profil: '',
        licence_num: '',
        ae_issue_date: '',
        ae_expiry_date: '',
        he_expiry_date: '',
        he_training_date: '',
        safety_badge_num: '',
        safety_badge_expiry_date: '',
        zcp_expiry_date: '',
        english_test_date: '',
        english_level: '',
        english_next_test_date: ''
      });

      // Special case: if we edited ourselves, update the local session state
      if (user && editingUser && editingUser.id === user.id) {
        // We fetch the latest data from server just to be absolutely sure
        try {
          const userRes = await fetch(`/api/users/${user.id}`);
          if (userRes.ok) {
            const updatedUser = await userRes.json();
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (e) {
          console.error("Failed to refresh own profile after edit", e);
        }
      }

      // Refresh users list
      fetch('/api/users')
        .then(res => res.json())
        .then(data => setUsers(data));
    } else {
      showNotification("Erreur lors de l'enregistrement de l'utilisateur.", 'error');
    }
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === user.id) {
      showNotification("Vous ne pouvez pas supprimer votre propre compte.", 'error');
      return;
    }

    setConfirmDialog({
      message: `Êtes-vous sûr de vouloir supprimer le compte de ${u.firstname} ${u.lastname} ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/users/${u.id}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            // Refresh users list
            fetch('/api/users')
              .then(res => res.json())
              .then(data => setUsers(data));
            showNotification("Utilisateur supprimé");
          } else {
            showNotification("Erreur lors de la suppression de l'utilisateur.", 'error');
          }
        } catch (error) {
          showNotification("Erreur réseau", 'error');
        }
      }
    });
  };

  const handleEditUser = (u: User) => {
    setEditingUser(u);
    setUserFormData({
      trigram: u.trigram,
      firstname: u.firstname,
      lastname: u.lastname,
      role: u.role,
      entity: u.entity,
      password: '', // Don't show password
      email: u.email || '',
      mobile_num: u.mobile_num || '',
      professional_num: u.professional_num || '',
      address: u.address || '',
      comment: u.comment || '',
      olaf_link: u.olaf_link || '',
      birth_date: u.birth_date || '',
      corps: u.corps || '',
      profil: u.profil || '',
      licence_num: u.licence_num || '',
      ae_issue_date: u.ae_issue_date || '',
      ae_expiry_date: u.ae_expiry_date || '',
      he_expiry_date: u.he_expiry_date || '',
      he_training_date: u.he_training_date || '',
      safety_badge_num: u.safety_badge_num || '',
      safety_badge_expiry_date: u.safety_badge_expiry_date || '',
      zcp_expiry_date: u.zcp_expiry_date || '',
      english_test_date: u.english_test_date || '',
      english_level: u.english_level || '',
      english_next_test_date: u.english_next_test_date || '',
      display_order: u.display_order || 0,
      off_day: u.off_day || 'Vendredi',
      tlt_day: u.tlt_day || 'Aucun'
    });
    setUserModalTab('info');
    setShowUserModal(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = users.findIndex((u) => u.id === active.id);
    const newIndex = users.findIndex((u) => u.id === over.id);

    const newUsers = arrayMove(users, oldIndex, newIndex);
    
    // Update display_order for all users based on their new position
    const orders = newUsers.map((u: User, index: number) => ({
      id: u.id,
      display_order: index
    }));

    // Optimistic update
    setUsers(newUsers);

    try {
      const res = await fetch('/api/users/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });

      if (!res.ok) {
        showNotification("Erreur lors de la sauvegarde de l'ordre", 'error');
        fetchData(); // Rollback
      }
    } catch (error) {
      showNotification("Erreur réseau", 'error');
      fetchData(); // Rollback
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let updatedCount = 0;
        let errorCount = 0;

        const parseExcelDate = (val: any) => {
          if (!val) return undefined;
          if (typeof val === 'number') {
            // Excel serial date
            const date = new Date((val - 25569) * 86400 * 1000);
            return formatDateLocal(date);
          }
          if (typeof val === 'string') {
            const d = new Date(val);
            if (!isNaN(d.getTime())) return formatDateLocal(d);
            // Try DD/MM/YYYY
            const parts = val.split(/[\/\-\.]/);
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                if (!isNaN(d2.getTime())) return formatDateLocal(d2);
              }
            }
          }
          return undefined;
        };

        for (const row of data) {
          // Try to find user by trigram (case insensitive)
          const trigram = (row.Trigramme || row.trigram || row.TRIGRAMME || '').toString().toUpperCase();
          if (!trigram) continue;

          const targetUser = users.find(u => u.trigram.toUpperCase() === trigram);
          if (targetUser) {
            // Map Excel columns to User fields
            const updateData: Partial<User> = {
              firstname: row.Prenom || row.Prénom || row.firstname || row.FIRSTNAME,
              lastname: row.Nom || row.lastname || row.LASTNAME,
              entity: row.Entite || row.Entité || row.entity || row.ENTITY,
              email: row.Email || row.email || row.EMAIL || row.Courriel,
              mobile_num: row.Mobile || row.mobile || row.GSM || row['N° Mobile'],
              professional_num: row.Professionnel || row.professional || row['N° Pro'] || row['N° Professionnel'],
              address: row.Adresse || row.address || row.ADRESSE,
              comment: row.Commentaire || row.comment || row.COMMENTAIRE,
              corps: row.Corps || row.corps || row.CORPS,
              profil: row.Profil || row.profil || row.PROFIL,
              licence_num: row['N° Licence'] || row.licence_num || row.LICENCE || row['Numéro Licence'],
              olaf_link: row['Lien OLAF'] || row.olaf_link || row.OLAF,
              birth_date: parseExcelDate(row['Date Naissance'] || row.birth_date || row.BIRTHDATE || row['Date de naissance']),
              ae_issue_date: parseExcelDate(row['AE Délivrance'] || row.ae_issue_date || row['AE Issue']),
              ae_expiry_date: parseExcelDate(row['AE Expiration'] || row.ae_expiry_date || row['AE Expiry'] || row['AE Exp']),
              he_training_date: parseExcelDate(row['HE Formation'] || row.he_training_date || row['HE Training']),
              he_expiry_date: parseExcelDate(row['HE Expiration'] || row.he_expiry_date || row['HE Expiry'] || row['HE Exp']),
              safety_badge_num: row['Badge Numéro'] || row.safety_badge_num || row['Badge No'],
              safety_badge_expiry_date: parseExcelDate(row['Badge Expiration'] || row.safety_badge_expiry_date || row['Badge Exp']),
              zcp_expiry_date: parseExcelDate(row['ZCP Expiration'] || row.zcp_expiry_date || row['ZCP Exp']),
              english_test_date: parseExcelDate(row['Anglais Dernier Test'] || row.english_test_date || row['English Test']),
              english_level: (row['Anglais Niveau'] || row.english_level || row['English Level'] || '').toString().toUpperCase().trim(),
              english_next_test_date: parseExcelDate(row['Anglais Prochain Test'] || row.english_next_test_date || row['English Next Test']),
            };

            // Clean up undefined values
            Object.keys(updateData).forEach(key => {
              if (updateData[key as keyof User] === undefined) {
                delete updateData[key as keyof User];
              }
            });

            if (Object.keys(updateData).length > 0) {
              const res = await fetch(`/api/users/${targetUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
              });
              if (res.ok) updatedCount++;
              else errorCount++;
            }
          }
        }

        await fetchData();
        showNotification(`${updatedCount} agents mis à jour. ${errorCount} erreurs.`);
      } catch (error) {
        console.error("Excel import error:", error);
        showNotification("Erreur lors de l'import Excel", 'error');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  const menuItems = user ? [
    { id: 'dashboard', label: 'Tableau de Service', icon: LayoutDashboard, path: '/dashboard' },
    ...(user.role !== 'secretary' ? [
      { id: 'leaves', label: 'Congés', icon: Calendar, path: '/leaves' }
    ] : []),
    { id: 'profile', label: 'Mon Profil', icon: UserIcon, path: '/profile' },
    { id: 'print', label: 'Impression', icon: Printer, path: '/print' },
    ...(user.role === 'admin' ? [
      { id: 'admin', label: 'Administration', icon: Settings, path: '/admin' },
      { id: 'titles', label: 'Gestion des Titres', icon: ShieldCheck, path: '/titles' }
    ] : []),
    { id: 'help', label: 'Aide', icon: HelpCircle, path: '/help' },
    ...(selectedEntity === 'MR-MGA' ? [
      { id: 'promess', label: 'PROMESS', icon: Database, path: '/promess' },
      { id: 'projects_tasks', label: 'Projets/Tâches', icon: List, path: '/projects_tasks' },
      { id: 'annuaire_mr', label: 'Annuaire MR', icon: BookOpen, path: '/annuaire_mr' },
      { id: 'bilan_ae', label: 'Bilan AE', icon: ClipboardList, path: '/bilan_ae' },
      { id: 'missions_equipements', label: 'Missions/Équipements', icon: Compass, path: '/missions_equipements' }
    ] : [])
  ] : [];

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      setSelectedEntity(user.entity);
      fetchData();
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'admin') {
      checkUpdates();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (user && location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [user, location.pathname, navigate]);

  const activeMessages = (Array.isArray(marqueeMessages) ? marqueeMessages : []).filter(msg => {
    if (!user) return false;
    try {
      const now = new Date();
      if (!msg.start_date || !msg.end_date) return false;
      
      // Date comparison in local format YYYY-MM-DD
      const nowStr = formatDateLocal(now);
      const startStr = msg.start_date;
      const endStr = msg.end_date;
      
      const isDateValid = nowStr >= startStr && nowStr <= endStr;
      const entitiesList = (msg.entities || 'All').split(',');
      const isEntityValid = entitiesList.includes('All') || (user.entity && entitiesList.includes(user.entity));
      const isAdminValid = !msg.admin_only || user.role === 'admin';
      
      return isDateValid && isEntityValid && isAdminValid;
    } catch (e) {
      console.error("Filter marquee error:", e);
      return false;
    }
  });

  const marqueeText = activeMessages.length > 0 
    ? activeMessages.map(m => m.content).join('       •       ') 
    : "";

  const fetchLogs = async (getPollInterval: () => any) => {
    try {
      const res = await fetch('/api/admin/system/update-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setUpdateLogs(data.logs);
          
          // Détection de la fin (Succès ou Erreur fatale)
          const isFinished = data.logs.includes("SUCCÈS :") || 
                            data.logs.includes("ERREUR :") || 
                            data.logs.includes("ÉCHEC") ||
                            data.logs.includes("EXIT_CODE") ||
                            data.logs.includes("ECHEC") ||
                            data.logs.includes("Mise à jour terminée") ||
                            data.logs.includes("successfully") ||
                            data.logs.includes("Terminé") ||
                            data.logs.includes("relancé avec PM2") ||
                            data.logs.includes("online") ||
                            data.logs.includes("Serveur relancé");

          if (isFinished || data.logs.length > 20000) {
            setIsUpdating(false);
            const intervalId = getPollInterval();
            if (intervalId) {
              clearInterval(intervalId);
            }
            // On rafraîchit les infos de version plusieurs fois pour être sûr
            // Le serveur peut mettre du temps à redémarrer
            const refreshTimes = [2000, 5000, 10000, 20000, 30000];
            refreshTimes.forEach(delay => setTimeout(checkUpdates, delay));
          }

          // Scroll automatically to bottom if the log window exists
          const logElement = document.getElementById('update-logs-window');
          if (logElement) {
            logElement.scrollTop = logElement.scrollHeight;
          }
        }
      }
    } catch (e) {
      // Normal s'il y a un redémarrage, on ne stoppe pas forcément
    }
  };

  const handleUpdateServer = async () => {
    if (!user || !window.confirm("Voulez-vous lancer la procédure de mise à jour sur le serveur ?\n\n- Une sauvegarde de la base de données sera créée.\n- Les nouveaux fichiers seront récupérés sur GitHub.\n- Le serveur redémarrera automatiquement.\n\nContinuer ?")) return;
    
    setIsUpdating(true);
    setUpdateLogs(">> Initialisation de la mise à jour...\n");
    
    // On utilise une variable locale pour l'intervalle afin de pouvoir le stopper de l'intérieur
    let pollInterval: any = null;
    pollInterval = setInterval(() => fetchLogs(() => pollInterval), 2000);
    
    try {
      const res = await fetch('/api/admin/system/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigram: user.trigram }),
      });
      
      const data = await res.json();
      if (res.ok) {
        showNotification("Mise à jour lancée avec succès", 'success');
        // Sécurité : on arrête au bout de 10 minutes maximum si rien n'est détecté
        setTimeout(() => {
          if (pollInterval) clearInterval(pollInterval);
          setIsUpdating(false);
          checkUpdates();
        }, 600000);
      } else {
        if (pollInterval) clearInterval(pollInterval);
        setIsUpdating(false);
        setUpdateLogs(prev => prev + "\nERREUR :\n" + data.error + (data.details ? "\n" + data.details : ""));
        showNotification(data.error, 'error');
      }
    } catch (error) {
      // On ne coupe pas forcément l'intervalle ici car le serveur peut tomber 
      // pendant le redémarrage juste après l'appel API.
      // fetchLogs gère le catch
    }
  };

  const handleFixDateShift = async () => {
    if (!window.confirm("Voulez-vous corriger le décalage actuel d'un jour pour les entrées actives de MR-TTA ?\n\nToutes les entrées actives de l'entité MR-TTA de l'année 2026 seront avancées d'un jour (+1 jour) en base de données.\n\nCette action est permanente. Il est recommandé de créer une sauvegarde au préalable.\n\nSouhaitez-vous continuer ?")) return;
    
    setIsCorrectingShift(true);
    try {
      const res = await fetch('/api/admin/fix-shift-date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message, 'success');
        fetchData();
      } else {
        showNotification(data.error || "Une erreur est survenue lors de la correction.", 'error');
      }
    } catch (e: any) {
      showNotification("Erreur de communication : " + (e.message || e), 'error');
    } finally {
      setIsCorrectingShift(false);
    }
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={(u) => { setUser(u); navigate('/dashboard'); }} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex flex-col">


      <div className="flex-1 flex">
        {/* Toast Notifications */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
          notification.type === 'success' ? 'bg-white border-green-100 text-green-800' : 'bg-white border-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          <p className="text-sm font-bold">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="ml-2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-2">Confirmation</h3>
            <p className="text-gray-600 text-sm mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2 rounded-lg bg-black text-white font-bold text-sm hover:bg-gray-800"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migration Range Dialog */}
      {showMigrationDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <Database className="text-indigo-600" size={24} />
              <h3 className="text-lg font-black uppercase tracking-tight">Basculement Étape par Étape</h3>
            </div>
            <p className="text-gray-600 text-xs mb-6 font-medium leading-relaxed">
              Précisez la plage de semaines à basculer du bac à sable vers la base active.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Semaine Début</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="53"
                    value={migrationWeeks.start}
                    onChange={e => setMigrationWeeks({...migrationWeeks, start: parseInt(e.target.value) || 1})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Semaine Fin</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="53"
                    value={migrationWeeks.end}
                    onChange={e => setMigrationWeeks({...migrationWeeks, end: parseInt(e.target.value) || 1})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-black/5"
                  />
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 leading-normal font-medium">
                  Cette action écrasera les données existantes dans la base active pour les semaines sélectionnées.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowMigrationDialog(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleConfirmMigration}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-300 flex flex-col hidden md:flex print:hidden">
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md border border-gray-200 p-1 overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Logo DAC-NC" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-gray-900 leading-none">DAC-NC</span>
              <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mt-1">TDS DT</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 p-3 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm border border-indigo-200 shadow-sm" title={`${user.firstname} ${user.lastname}`}>
              {user.trigram}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-gray-900 truncate">{user.firstname} {user.lastname}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{user.entity}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all uppercase tracking-widest text-left ${
                activeTab === item.id 
                  ? 'bg-black text-white shadow-xl shadow-black/20 scale-[1.02]' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="leading-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-200">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4 px-2">
            Version {APP_VERSION} - {APP_VERSION_DATE}
          </div>
          <button 
            onClick={async () => {
              if (user.logId) {
                await fetch('/api/logout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ logId: user.logId }),
                });
              }
              setUser(null);
              navigate('/login');
            }}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black text-red-600 hover:bg-red-50 transition-all uppercase tracking-widest"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        <header className="h-20 bg-white border-b border-gray-300 flex items-center justify-between px-10 shrink-0 print:hidden">
          <div className="flex items-center gap-6 flex-1 overflow-hidden">
            <h2 className="text-base font-black uppercase tracking-[0.2em] text-gray-400 shrink-0">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            {activeTab === 'dashboard' && (user.role === 'admin' || user.role === 'user' || user.role === 'secretary' || (user.profil === 'Chef DT')) && (
              <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-300 shrink-0">
                {(['Siège', 'MR-MGA', 'MR-TTA'] as Entity[]).map(e => (
                  <button
                    key={e}
                    onClick={() => setSelectedEntity(e)}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${
                      selectedEntity === e ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-300 shrink-0 ml-4">
                {[
                  { id: 'hebdo', label: 'Hebdo' },
                  { id: 'annuel', label: 'Annuel' }
                ].map(v => (
                  <button
                    key={v.id}
                    onClick={() => {
                      if (isSandboxMode) {
                        setIsSandboxMode(false);
                      }
                      setDashboardView(v.id as any);
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${
                      dashboardView === v.id ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {/* Marquee */}
            {activeMessages.length > 0 && (
              <div className="flex-1 mx-10 overflow-hidden relative h-10 flex items-center bg-indigo-50 rounded-full border border-indigo-200 shadow-inner">
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-indigo-50 to-transparent z-10"></div>
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-indigo-50 to-transparent z-10"></div>
                <div className="whitespace-nowrap animate-marquee flex items-center gap-12">
                  <span className="text-xs font-black text-indigo-900 tracking-[0.2em] drop-shadow-sm">{marqueeText}</span>
                  <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">•</span>
                  <span className="text-xs font-black text-indigo-900 tracking-[0.2em]">{marqueeText}</span>
                  <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">•</span>
                </div>
              </div>
            )}

            {/* Pending Leaves Notification */}
            {user.role === 'admin' && pendingLeavesCount > 0 && (
              <button 
                onClick={() => navigate('/leaves')}
                className="flex items-center gap-3 px-4 py-2 bg-red-50 text-red-600 rounded-full border border-red-200 animate-pulse shrink-0 hover:bg-red-100 transition-all cursor-pointer shadow-sm"
              >
                <Bell size={16} />
                <span className="text-xs font-black uppercase tracking-widest">{pendingLeavesCount} En attente</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-6 shrink-0">
            {user.role === 'admin' && (
              <button 
                onClick={() => setIsEditingMarquee(true)}
                className="p-3 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
                title="Modifier le message défilant"
              >
                <Edit2 size={20} />
              </button>
            )}
            {selectedEntity === 'MR-TTA' && user.entity === 'MR-TTA' && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSandboxMode(!isSandboxMode)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg uppercase tracking-wider ${
                    isSandboxMode ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'
                  }`}
                >
                  <Plus size={16}/> {isSandboxMode ? 'Quitter Bac à Sable' : 'Mode Bac à Sable'}
                </button>
                {isSandboxMode && user.role === 'admin' && (
                  <>
                    <button 
                      onClick={handleCopyActiveToSandbox}
                      className="flex items-center justify-center w-[1cm] h-10 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all shadow-lg shrink-0"
                      title="Initialiser BAS depuis l'Actuel : Écrase le tableau de service BAS par les données du tableau annuel actuel"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button 
                      onClick={handlePublishSandbox}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg uppercase tracking-wider"
                    >
                      Basculer vers base active
                    </button>
                  </>
                )}
              </div>
            )}
            <button 
              onClick={() => setIsIcsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Importer un fichier .ics (Outlook)"
            >
              <Calendar size={15} />
              <span className="hidden sm:inline">Importer Agenda .ics</span>
            </button>
            <div className="h-10 w-px bg-gray-300 mx-2"></div>
            <div className="flex flex-col items-center justify-center bg-gray-100 px-4 py-1 rounded-xl border border-gray-300 shadow-inner min-w-[110px]">
              <span className="text-[11px] font-mono font-black text-gray-600 leading-tight">
                {currentTime.toLocaleDateString('fr-FR')}
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-600 leading-tight">
                {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-2 print:overflow-visible print:h-auto print:p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + selectedEntity}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="print:w-full print:max-w-none"
            >
              <Routes>
                <Route path="/dashboard" element={
                  <div className="space-y-6">
                    {activeTab === 'dashboard' && selectedEntity === 'MR-TTA' && isSandboxMode ? (
                      <div className="space-y-4">
                        <YearlyGrid entity={selectedEntity} user={user} isSandbox={false} title="Tableau Actuel" onUpdate={fetchData} showNotification={showNotification} />
                        <YearlyGrid entity={selectedEntity} user={user} isSandbox={true} title="Tableau BAS" onUpdate={fetchData} showNotification={showNotification} />
                        
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-black/5">
                          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Légende</h3>
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {[
                              { code: '1', label: '1: Lun, Mar MO / Mer, Jeu MS', color: 'bg-[#4FB6E1] text-white border-[#3fa6d1]' },
                              { code: '2', label: '2: Mar MS / Mer, Jeu, Ven MO / RIT Ven-Jeu suiv.', color: 'bg-[#1B6486] text-white border-[#155476]' },
                              { code: '3', label: '3: Lun-Jeu MS + RIT', color: 'bg-[#E77E31] text-white border-[#d76e21]' },
                              { code: 'C', label: 'Congés', color: 'bg-green-500 text-white border-green-600' },
                              { code: 'F', label: 'Formation', color: 'bg-violet-500 text-white border-violet-600' },
                              { code: 'MS', label: 'De service', color: 'bg-yellow-300 text-black border-yellow-400' },
                              { code: 'AE', label: 'Astreinte Élec.', color: 'bg-pink-200 text-pink-900 border-pink-300' },
                              { code: 'Abs', label: 'Absence', color: 'bg-gray-400 text-white border-gray-500' },
                            ].map(l => (
                              <div key={l.code} className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded border flex items-center justify-center text-[10px] font-bold ${l.color}`}>{l.code}</div>
                                <span className="text-xs text-gray-600 font-medium">{l.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {dashboardView === 'hebdo' ? (
                          <TDSGrid entity={selectedEntity} user={user} isSandbox={false} onUpdate={fetchData} showNotification={showNotification} />
                        ) : (
                          <YearlyGrid entity={selectedEntity} user={user} isSandbox={false} title={`Tableau Annuel - ${selectedEntity}`} onUpdate={fetchData} showNotification={showNotification} />
                        )}
                      </>
                    )}
                  </div>
                } />

                <Route path="/leaves" element={
                  <LeaveRequests user={user} onUpdate={fetchData} showNotification={showNotification} />
                } />

                <Route path="/help" element={<Help user={user} />} />

                <Route path="/promess" element={<Promess user={user} />} />

                <Route path="/projects_tasks" element={<ProjectsTasks user={user} />} />

                <Route path="/annuaire_mr" element={<AnnuaireMR user={user} />} />

                <Route path="/bilan_ae" element={<BilanAE user={user} />} />

                <Route path="/missions_equipements" element={<MissionsEquipements user={user} />} />



                <Route path="/profile" element={
                  <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                    <div className="h-32 bg-black relative">
                      <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-2xl bg-indigo-600 border-4 border-white flex items-center justify-center text-white text-3xl font-bold shadow-lg" title={`${user.firstname} ${user.lastname}`}>
                        {user.trigram}
                      </div>
                    </div>
                    <div className="pt-16 p-8">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{user.firstname} {user.lastname}</h2>
                          <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">{user.entity} • {user.role}</p>
                        </div>
                      </div>
                      
                      <form className="grid grid-cols-2 gap-6" onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const data = Object.fromEntries(formData.entries());
                        const res = await fetch(`/api/users/${user.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(data),
                        });
                        if (res.ok) {
                          showNotification('Profil mis à jour !');
                          // Refresh currentUser state
                          try {
                            const userRes = await fetch(`/api/users/${user.id}`);
                            if (userRes.ok) {
                              const updatedUser = await userRes.json();
                              setUser(updatedUser);
                              localStorage.setItem('user', JSON.stringify(updatedUser));
                            }
                          } catch (e) {
                            console.error("Failed to refresh profile", e);
                          }
                        }
                      }}>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Prénom</label>
                          <input name="firstname" defaultValue={user.firstname} className="w-full p-2 border rounded-lg text-sm bg-gray-50" readOnly />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nom</label>
                          <input name="lastname" defaultValue={user.lastname} className="w-full p-2 border rounded-lg text-sm bg-gray-50" readOnly />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email Professionnel</label>
                          <input 
                            name="email" 
                            value={`${user.firstname.toLowerCase()}.${user.lastname.toLowerCase()}@aviation-civile.gouv.fr`} 
                            className="w-full p-2 border rounded-lg text-sm bg-gray-50 text-gray-500" 
                            readOnly 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Numéro Mobile</label>
                          <input name="mobile_num" defaultValue={user.mobile_num} className="w-full p-2 border rounded-lg text-sm" placeholder="Ex: 77.88.99" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Adresse</label>
                          <input name="address" defaultValue={user.address} className="w-full p-2 border rounded-lg text-sm" placeholder="Votre adresse" />
                        </div>
                        {user.entity === 'MR-TTA' && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jour OFF par défaut</label>
                            <select 
                              name="off_day" 
                              defaultValue={user.off_day || 'Vendredi'} 
                              className="w-full p-2 border rounded-lg text-sm font-bold bg-white"
                            >
                              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {user.entity === 'Siège' && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jour de télétravail (TLT) par défaut</label>
                            <select 
                              name="tlt_day" 
                              defaultValue={user.tlt_day || 'Aucun'} 
                              className="w-full p-2 border rounded-lg text-sm font-bold bg-white"
                            >
                              {['Aucun', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Commentaire (Optionnel)</label>
                          <textarea name="comment" defaultValue={user.comment} className="w-full p-2 border rounded-lg text-sm h-32 resize-none font-medium" placeholder="Ajouter un commentaire..." />
                        </div>
                        <div className="col-span-2">
                          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 transition-all">Enregistrer les modifications</button>
                        </div>
                      </form>

                      <div className="mt-12 pt-8 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <span>Agenda Outlook (.ics)</span>
                              {user.entity === 'Siège' && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full uppercase">Recommandé Siège</span>
                              )}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                              Importez votre calendrier Outlook pour pré-remplir automatiquement votre Tableau de Service (Télétravail, Missions, Congés, Formations).
                            </p>
                          </div>
                        </div>

                        <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                              <Calendar size={22} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">Synchroniser mon planning depuis un fichier .ics</h4>
                              <p className="text-xs text-gray-600 font-medium mt-0.5">
                                Sélectionnez ou glissez un fichier iCalendar exporté depuis Outlook
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsIcsModalOpen(true)}
                            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 shrink-0"
                          >
                            <Calendar size={18} />
                            <span>Importer mon agenda</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-12 pt-8 border-t border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Sécurité</h3>
                        <form className="space-y-4" onSubmit={async (e) => {
                          e.preventDefault();
                          const pwd = (e.currentTarget.elements.namedItem('new_password') as HTMLInputElement).value;
                          const confirmPwd = (e.currentTarget.elements.namedItem('confirm_password') as HTMLInputElement).value;
                          
                          if (pwd !== confirmPwd) {
                            showNotification('Les mots de passe ne correspondent pas.', 'error');
                            return;
                          }

                          const res = await fetch(`/api/users/${user.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: pwd }),
                          });
                          if (res.ok) {
                            showNotification('Mot de passe mis à jour !');
                            (e.target as HTMLFormElement).reset();
                          }
                        }}>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nouveau mot de passe</label>
                              <input name="new_password" type="password" required className="w-full p-2 border rounded-lg text-sm" placeholder="••••••••" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Confirmer le mot de passe</label>
                              <input name="confirm_password" type="password" required className="w-full p-2 border rounded-lg text-sm" placeholder="••••••••" />
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-gray-100 text-gray-900 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">Changer le mot de passe</button>
                        </form>
                      </div>
                    </div>
                  </div>
                } />

                <Route path="/print" element={
                  <PrintPage user={user} />
                } />

                {(user.role === 'admin' || user.role === 'secretary') && (
                  <>
                    <Route path="/titles" element={
                      <div className="h-[calc(100vh-100px)] flex flex-col space-y-4 overflow-hidden">
                        <div className="flex justify-between items-center shrink-0">
                          <h2 className="text-xl font-bold text-slate-900">Suivi des Titres, Habilitations et Tests</h2>
                          <div className="flex gap-2">
                            <input 
                              type="file" 
                              id="excel-import" 
                              className="hidden" 
                              accept=".xlsx, .xls" 
                              onChange={handleImportExcel}
                            />
                            <button 
                              onClick={() => document.getElementById('excel-import')?.click()}
                              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                            >
                              <FileUp size={18} /> Importer Excel
                            </button>
                            <button 
                              onClick={() => window.print()}
                              className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                              <Printer size={18} /> Imprimer
                            </button>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex-1 flex flex-col min-h-0">
                          <div className="overflow-auto flex-1">
                            <table className="w-full text-left border-collapse table-auto">
                              <thead className="bg-slate-50/80">
                                <tr>
                                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 left-0 bg-slate-50 z-30 border-b border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">Agent</th>
                                  <th className="px-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-slate-50 z-20 border-b border-slate-100">Naissance</th>
                                  <th className="px-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-slate-50 z-20 border-b border-slate-100">Corps / Profil</th>
                                  <th className="px-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-slate-50 z-20 border-b border-slate-100">Licence</th>
                                  <th className="px-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sticky top-0 bg-slate-50 z-20 border-b border-slate-100">AE (Exp.)</th>
                                  <th className="px-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sticky top-0 bg-slate-50 z-20 border-b border-slate-100">HE (Exp.)</th>
                                  <th className="px-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sticky top-0 bg-slate-50 z-20 border-b border-slate-100">Badge (Exp.)</th>
                                  <th className="px-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sticky top-0 bg-slate-50 z-20 border-b border-slate-100">ZCP (Exp.)</th>
                                  <th className="px-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-slate-50 z-20 border-b border-slate-100">Anglais (Niv.)</th>
                                  <th className="px-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sticky top-0 bg-slate-50 z-20 border-b border-slate-100">Prochain Test</th>
                                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right sticky top-0 bg-slate-50 z-20 border-b border-slate-100">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {users.filter(u => 
                                  u.role !== 'secretary' && 
                                  !['secrétaire', 'secretaire'].includes((u.profil || u.corps || '').toLowerCase()) &&
                                  !(u.lastname || '').toUpperCase().includes('SECRETAIRE')
                                ).map(u => {
                                  const isAEExpired = u.ae_expiry_date && new Date(u.ae_expiry_date) < new Date();
                                  const isHEExpired = u.he_expiry_date && new Date(u.he_expiry_date) < new Date();
                                  const isBadgeExpired = u.safety_badge_expiry_date && new Date(u.safety_badge_expiry_date) < new Date();
                                  const isZCPExpired = u.zcp_expiry_date && new Date(u.zcp_expiry_date) < new Date();
                                  const isEnglishExpired = u.english_next_test_date && new Date(u.english_next_test_date) < new Date();

                                  return (
                                    <tr key={u.id} className="hover:bg-slate-50/40 transition-all group">
                                      <td className="px-4 py-2.5 sticky left-0 bg-white group-hover:bg-slate-50/40 z-10 border-r border-slate-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-mono text-[10px] font-bold text-slate-600 border border-slate-200/50" title={`${u.firstname} ${u.lastname}`}>{u.trigram}</div>
                                            <div>
                                              <div className="flex items-center gap-1.5">
                                                {u.olaf_link ? (
                                                  <a 
                                                    href={u.olaf_link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-xs font-bold text-slate-900 truncate max-w-[120px] hover:text-indigo-600 transition-colors cursor-pointer decoration-indigo-200 underline-offset-4 hover:underline"
                                                    title="cliquez ici pour voir le profil OLAF"
                                                  >
                                                    {u.firstname} {u.lastname}
                                                  </a>
                                                ) : (
                                                  <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{u.firstname} {u.lastname}</p>
                                                )}
                                                {u.olaf_link && (
                                                  <a href={u.olaf_link} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-600 transition-transform hover:scale-110" title="cliquez ici pour voir le profil OLAF">
                                                    <FileText size={12} />
                                                  </a>
                                                )}
                                              </div>
                                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{u.entity}</p>
                                            </div>
                                          </div>
                                      </td>
                                      <td className="px-2 py-2.5 text-xs text-slate-500 font-medium">
                                        {u.birth_date ? new Date(u.birth_date).toLocaleDateString('fr-FR') : '-'}
                                      </td>
                                      <td className="px-2 py-2.5">
                                        <p className="text-xs font-bold text-slate-700 leading-tight">{u.corps || '-'}</p>
                                        <p className="text-[10px] text-slate-400 font-medium leading-none">{u.profil || '-'}</p>
                                      </td>
                                      <td className="px-2 py-2.5 text-xs text-slate-500 font-mono">{u.licence_num || '-'}</td>
                                      <td className="px-2 py-2.5 text-center">
                                        {renderExpiryCell(u.ae_expiry_date)}
                                      </td>
                                      <td className="px-2 py-2.5 text-center">
                                        {renderExpiryCell(u.he_expiry_date)}
                                      </td>
                                      <td className="px-2 py-2.5 text-center">
                                        {renderExpiryCell(u.safety_badge_expiry_date)}
                                      </td>
                                      <td className="px-2 py-2.5 text-center">
                                        {renderExpiryCell(u.zcp_expiry_date)}
                                      </td>
                                      <td className="px-2 py-2.5">
                                        <div className="flex flex-col">
                                          <span className="text-xs font-black text-slate-900">{u.english_level || '-'}</span>
                                          <span className="text-[9px] text-slate-400 font-bold">({u.english_test_date ? new Date(u.english_test_date).toLocaleDateString('fr-FR') : '-'})</span>
                                        </div>
                                      </td>
                                      <td className="px-2 py-2.5 text-center">
                                        {renderExpiryCell(u.english_next_test_date)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <button 
                                          onClick={() => handleEditUser(u)}
                                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                          title="Modifier l'agent"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    } />

                    <Route path="/admin" element={
                      (user.role !== 'admin' && user.role !== 'secretary') ? <Navigate to="/dashboard" replace /> :
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-gray-900">
                              Administration 
                              <span className="text-[10px] text-gray-400 font-mono underline ml-2">
                                v{APP_VERSION}
                              </span>
                            </h2>
                            {githubUpdate?.updateAvailable && (
                              <motion.a 
                                href={githubUpdate.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-black border border-amber-200 animate-pulse hover:bg-amber-200 transition-all cursor-pointer"
                              >
                                <ArrowUp size={12} /> MISE À JOUR DISPONIBLE ({githubUpdate.remoteVersion})
                              </motion.a>
                            )}
                            <div className="flex bg-gray-200 p-1 rounded-xl">
                              <button 
                                onClick={() => setAdminTab('users')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${adminTab === 'users' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                AGENTS
                              </button>
                              <button 
                                onClick={() => setAdminTab('system')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${adminTab === 'system' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                SYSTÈME
                              </button>
                              <button 
                                onClick={() => setAdminTab('journal')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${adminTab === 'journal' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                JOURNAL
                              </button>
                              <button 
                                onClick={() => setAdminTab('mails')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${adminTab === 'mails' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                MAILS
                              </button>
                            </div>
                          </div>
                          
                          {adminTab === 'users' && (
                            <div className="flex gap-4">
                              <button 
                                onClick={() => {
                                  setEditingUser(null);
                                  setUserFormData({ trigram: '', firstname: '', lastname: '', role: 'user', entity: 'Siège', password: 'password123' });
                                  setShowUserModal(true);
                                }}
                                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                              >
                                <Plus size={18} /> Nouvel Agent
                              </button>
                            </div>
                          )}
                        </div>

                        {adminTab === 'users' ? (
                          <div className="space-y-8">
                            <DndContext 
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              {(['Siège', 'MR-TTA', 'MR-MGA'] as Entity[]).map(entity => {
                                const entityUsers = users.filter(u => u.entity === entity);
                                if (entityUsers.length === 0) return null;

                                return (
                                  <div key={entity} className="space-y-4">
                                    <div className="flex items-center gap-4 px-4">
                                      <div className="h-px flex-1 bg-gray-300"></div>
                                      <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">{entity}</h3>
                                      <div className="h-px flex-1 bg-gray-300"></div>
                                    </div>
                                    <div className="bg-white rounded-2xl shadow-md border border-gray-300 overflow-hidden">
                                      <table className="w-full text-left">
                                        <thead className="bg-gray-100 border-b border-gray-300">
                                          <tr>
                                            <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Agent</th>
                                            <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">Rôle</th>
                                            <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                          <SortableContext 
                                            items={entityUsers.map(u => u.id)}
                                            strategy={verticalListSortingStrategy}
                                          >
                                            {entityUsers.map((u: User) => (
                                              <SortableUserRow 
                                                key={u.id} 
                                                u={u} 
                                                handleEditUser={handleEditUser}
                                                handleDeleteUser={handleDeleteUser}
                                              />
                                            ))}
                                          </SortableContext>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })}
                            </DndContext>
                          </div>
                        ) : adminTab === 'journal' ? (
                          <div className="space-y-8">
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                              <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Journal des Mises à jour</h3>
                              </div>
                              <div className="divide-y divide-gray-100">
                                {(appUpdates || [])
                                  .sort((a, b) => (b.id || 0) - (a.id || 0))
                                  .map(update => {
                                    const frUpdate = translateUpdate(update.summary || '', update.details || '');
                                    return (
                                      <div key={update.id} className="p-6 hover:bg-gray-50 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-3">
                                            <span className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-black">{update.version_code || 'vX'}</span>
                                            <h4 className="font-bold text-gray-900">{frUpdate.summary}</h4>
                                          </div>
                                          <div className="flex flex-col items-end">
                                            <span className="text-xs text-gray-800 font-black">
                                              {update.update_date && !isNaN(new Date(update.update_date).getTime()) 
                                                ? new Date(update.update_date).toLocaleDateString('fr-FR')
                                                : update.update_date}
                                            </span>
                                            <span className="text-[10px] text-indigo-500 font-mono font-black">
                                              {update.update_date && !isNaN(new Date(update.update_date).getTime()) 
                                                ? new Date(update.update_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                                : ''}
                                            </span>
                                          </div>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed max-w-3xl border-l-2 border-gray-100 pl-4 py-1 italic">
                                          {frUpdate.details}
                                        </p>
                                      </div>
                                    );
                                  })}
                                {(!appUpdates || appUpdates.length === 0) && (
                                  <div className="p-12 text-center text-gray-400 uppercase tracking-widest text-xs font-black">
                                    Aucun historique de mise à jour disponible.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : adminTab === 'mails' ? (
                          <div className="space-y-8 animate-fadeIn">
                            {/* Banner/Routage TEST-OPE Switch Container */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                                <div>
                                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                    <ShieldCheck className="text-indigo-600" size={24} />
                                    Mode de Service de Messagerie (TEST vs OPE)
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Configurez le routage général de tous les e-mails sortants de l'application TDS DT.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-xs">
                                  <span className="text-gray-400">Statut Réseau :</span>
                                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-bold flex items-center gap-1 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ACTIF
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Card Mode TEST */}
                                <div 
                                  onClick={() => handleToggleMailMode('TEST')}
                                  className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                    (mailSettings.mail_mode || 'TEST') === 'TEST'
                                      ? 'border-indigo-600 bg-indigo-50/20 shadow-md shadow-indigo-100/30'
                                      : 'border-gray-200 bg-white hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-3 rounded-xl ${
                                        (mailSettings.mail_mode || 'TEST') === 'TEST' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        <Settings size={20} />
                                      </div>
                                      <div>
                                        <h4 className="font-extrabold text-gray-900">MODE TEST (Simulation)</h4>
                                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-wider mt-0.5">Automatique / Qualification</p>
                                      </div>
                                    </div>
                                    {(mailSettings.mail_mode || 'TEST') === 'TEST' && (
                                      <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Actif</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                                    Tous les e-mails sortants du workflow de congés sont interceptés et redirigés de force vers l'adresse d'urgence de simulation : <strong className="text-gray-800 break-all font-mono">{mailSettings.email_debug_recipient || 'demba.ndiaye@aviation-civile.gouv.fr'}</strong> (ou la variable de débogage associée). Aucun agent réel ne sera dérangé par erreur.
                                  </p>
                                </div>

                                {/* Card Mode OPE */}
                                <div 
                                  onClick={() => handleToggleMailMode('OPE')}
                                  className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                    (mailSettings.mail_mode || 'TEST') === 'OPE'
                                      ? 'border-amber-500 bg-amber-50/15 shadow-md shadow-amber-100/20'
                                      : 'border-gray-200 bg-white hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-3 rounded-xl ${
                                        (mailSettings.mail_mode || 'TEST') === 'OPE' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        <Zap size={20} />
                                      </div>
                                      <div>
                                        <h4 className="font-extrabold text-gray-900">MODE OPE (Production réelle)</h4>
                                        <p className="text-[11px] font-black text-amber-600 uppercase tracking-wider mt-0.5">Opérations réelles</p>
                                      </div>
                                    </div>
                                    {(mailSettings.mail_mode || 'TEST') === 'OPE' && (
                                      <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Production</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                                    <strong className="text-amber-800 uppercase tracking-widest font-black block mb-1">⚠️ AVERTISSEMENT :</strong>
                                    Les e-mails seront envoyés directement aux <strong>vrais destinataires</strong> en production (agent demandeur, supérieurs hiérarchiques N+1 respectifs, secrétariats d'administration, etc.). À n'activer qu'après qualification technique complète.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Section : Workflow and Templates */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                              {/* Navigation entre les modèles de workflow (gauche) */}
                              <div className="lg:col-span-4 space-y-4">
                                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
                                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Événements du Workflow</h4>
                                  <div className="flex flex-col gap-2">
                                    {[
                                      {
                                        key: 'creation',
                                        label: "1. Dépôt d'une demande",
                                        desc: 'Déclenché quand un agent enregistre un congé.',
                                        iconColor: 'text-blue-500',
                                        badge: 'Création'
                                      },
                                      {
                                        key: 'approved_chef_agent',
                                        label: '2. N+1 validé → Mail Agent',
                                        desc: 'Avis intermédiaire envoyé au demandeur.',
                                        iconColor: 'text-indigo-500',
                                        badge: 'Validation Chef'
                                      },
                                      {
                                        key: 'approved_chef_n2',
                                        label: '3. N+1 validé → Mail N+2',
                                        desc: 'Alerte de validation requise transmise au Siège.',
                                        iconColor: 'text-purple-500',
                                        badge: 'Alerte Siège'
                                      },
                                      {
                                        key: 'approved_dt_agent',
                                        label: '4. N+2 approuvé → Agent',
                                        desc: 'Avis final d\'acceptation globale.',
                                        iconColor: 'text-emerald-500',
                                        badge: 'Approbation Finale'
                                      },
                                      {
                                        key: 'rejected_agent',
                                        label: '5. Refus de Congés → Agent',
                                        desc: 'Notice de rejet de la demande.',
                                        iconColor: 'text-rose-500',
                                        badge: 'Refus'
                                      },
                                    ].map((t) => (
                                      <button
                                        key={t.key}
                                        onClick={() => {
                                          setActiveMailTemplateKey(t.key);
                                          setSaveSuccessMessage('');
                                        }}
                                        className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between gap-1 group ${
                                          activeMailTemplateKey === t.key
                                            ? 'bg-black text-white border-black shadow-md'
                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                                            activeMailTemplateKey === t.key ? 'text-gray-300' : 'text-gray-400'
                                          }`}>
                                            {t.badge}
                                          </span>
                                          <div className={`w-2 h-2 rounded-full ${
                                            t.key.startsWith('rejected') ? 'bg-rose-500' : t.key.includes('dt') ? 'bg-emerald-500' : 'bg-indigo-500'
                                          }`}></div>
                                        </div>
                                        <h5 className="font-extrabold text-[13px] leading-tight mt-1">{t.label}</h5>
                                        <p className={`text-[11px] leading-relaxed mt-1 ${
                                          activeMailTemplateKey === t.key ? 'text-gray-300' : 'text-gray-500'
                                        }`}>
                                          {t.desc}
                                        </p>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Global Addresses Card */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">E-mails Secrétariat & Tierces</h4>
                                  <p className="text-xs text-gray-500 leading-relaxed">
                                    Saisissez les adresses e-mails (séparées par une virgule) des secrétariats administratifs ou collaborateurs tiers qui doivent être tenus informés.
                                  </p>
                                  <div>
                                    <textarea
                                      rows={3}
                                      value={mailSettings.mail_custom_emails || ''}
                                      onChange={(e) => handleSaveCustomEmails(e.target.value)}
                                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-black focus:bg-white resize-none"
                                      placeholder="Ex: secretariat.dt@aviation-civile.gouv.fr, admin@aviation-civile.gouv.fr"
                                    />
                                    <span className="text-[10px] text-gray-400 mt-1 block">Sauvegarde automatique lors de la saisie.</span>
                                  </div>
                                </div>
                              </div>

                              {/* Éditeur de modèle de texte et destinataires (droite) */}
                              <div className="lg:col-span-8 space-y-6">
                                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                                  <div className="flex justify-between items-start border-b border-gray-100 pb-5">
                                    <div>
                                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                        Configuration de l'E-mail
                                      </span>
                                      <h3 className="text-lg font-black text-gray-900 mt-2">
                                        Édition du Message & Règles d'Envoi
                                      </h3>
                                    </div>
                                    
                                    {saveSuccessMessage && (
                                      <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 animate-bounce">
                                        <Check size={14} /> {saveSuccessMessage}
                                      </span>
                                    )}
                                  </div>

                                  {/* Section : Choix des destinataires pour cet évènement */}
                                  <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                                      1. Choix des Destinataires pour cet évènement :
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                      {[
                                        { key: 'agent', label: 'Agent (Demandeur)' },
                                        { key: 'n1', label: "N+1 (Chef d'Entité)" },
                                        { key: 'n2', label: 'N+2 (Admins Siège)' },
                                        { key: 'secretaries', label: 'Secrétariats / Autres' },
                                      ].map((recipientOpt) => {
                                        const isChecked = editedRecipients.includes(recipientOpt.key);
                                        return (
                                          <label
                                            key={recipientOpt.key}
                                            className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer select-none transition-all ${
                                              isChecked 
                                                ? 'bg-black text-white border-black font-extrabold shadow-sm' 
                                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                if (isChecked) {
                                                  setEditedRecipients(editedRecipients.filter(r => r !== recipientOpt.key));
                                                } else {
                                                  setEditedRecipients([...editedRecipients, recipientOpt.key]);
                                                }
                                              }}
                                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span className="text-xs">{recipientOpt.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Section : Éditeur de Textes */}
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                                        2. Objet du courriel / E-mail Subject :
                                      </label>
                                      <input
                                        type="text"
                                        value={editedMailSubject}
                                        onChange={(e) => setEditedMailSubject(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-extrabold focus:outline-none focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                                        placeholder="Ex : [TDS DT] Votre demande a été validée"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                                        3. Corps du message (HTML autorisé) :
                                      </label>
                                      <textarea
                                        rows={8}
                                        value={editedMailBody}
                                        onChange={(e) => setEditedMailBody(e.target.value)}
                                        className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-2xl text-sm font-mono focus:outline-none focus:border-black focus:bg-white leading-relaxed focus:ring-1 focus:ring-black"
                                        placeholder="Rédigez le template du message ici..."
                                      />
                                    </div>
                                  </div>

                                  {/* Guidelines block */}
                                  <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                    <Info className="text-indigo-600 mt-0.5 shrink-0" size={16} />
                                    <div className="text-xs text-indigo-900 space-y-1">
                                      <strong className="block font-black">Variables de publipostage disponibles :</strong>
                                      <p className="leading-relaxed">
                                        Insérez ces codes exactement pour fusionner dynamiquement les données réelles de l'absence :
                                      </p>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px] bg-white p-2.5 rounded-lg border border-indigo-100 mt-2 text-indigo-950 font-bold">
                                        <div><code>{"{trigram}"}</code> : Trigramme</div>
                                        <div><code>{"{firstname}"}</code> : Prénom</div>
                                        <div><code>{"{lastname}"}</code> : Nom</div>
                                        <div><code>{"{type}"}</code> : Type d'absence</div>
                                        <div><code>{"{start_date}"}</code> : Date Début</div>
                                        <div><code>{"{end_date}"}</code> : Date Fin</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action button */}
                                  <div className="flex justify-between items-center bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 mt-4">
                                    <span className="text-[10pt] text-gray-500 font-medium">
                                      Toutes les modifications sont enregistrées sur la base.
                                    </span>
                                    <button
                                      onClick={handleSaveActiveMailTemplate}
                                      className="px-6 py-3 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                    >
                                      <Save size={14} /> Enregistrer la Configuration
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                              <div className="flex justify-between items-start mb-6">
                                <div>
                                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Gestion des Sauvegardes</h3>
                                  <p className="text-sm text-gray-500 mt-2">Créez et restaurez des points de sauvegarde de la base de données SQLite.</p>
                                </div>
                                <button
                                  onClick={handleCreateBackup}
                                  disabled={isBackingUp}
                                  className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                                >
                                  {isBackingUp ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                                  CRÉER UNE SAUVEGARDE
                                </button>
                                <button
                                  onClick={() => window.open('/api/admin/db/download', '_blank')}
                                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
                                >
                                  <Download size={16} />
                                  EXPORTER LA BASE (POUR TRANSFERT)
                                </button>
                              </div>
                              
                              <div className="flex-1 min-h-[300px] bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
                                <div className="p-3 bg-gray-100 border-b border-gray-200 grid grid-cols-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  <div className="col-span-6">Nom du fichier</div>
                                  <div className="col-span-3">Taille</div>
                                  <div className="col-span-3 text-right">Actions</div>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[400px]">
                                  {backups.map((b) => (
                                    <div key={b.name} className="p-3 grid grid-cols-12 items-center border-b border-gray-100 hover:bg-white transition-colors group">
                                      <div className="col-span-6">
                                        <p className="text-xs font-bold text-gray-800 truncate">{b.name}</p>
                                        <p className="text-[9px] text-gray-400">{new Date(b.date).toLocaleString('fr-FR')}</p>
                                      </div>
                                      <div className="col-span-3 text-[10px] font-mono text-gray-500">
                                        {(b.size / 1024).toFixed(0)} KB
                                      </div>
                                      <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => handleRestoreBackup(b.name)}
                                          disabled={isRestoring}
                                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                          title="Restaurer cette sauvegarde"
                                        >
                                          <Database size={14} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteBackup(b.name)}
                                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                          title="Supprimer la sauvegarde"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {backups.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full py-12">
                                      {backupFetchError ? (
                                        <div className="text-center p-4">
                                          <AlertCircle size={32} className="text-red-400 mb-2 mx-auto" />
                                          <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Erreur de chargement</p>
                                          <p className="text-[10px] text-red-500 max-w-[200px] leading-tight">{backupFetchError}</p>
                                          <button 
                                            onClick={fetchBackups}
                                            className="mt-3 text-[10px] text-gray-500 underline hover:text-gray-800"
                                          >
                                            Réessayer
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="text-gray-400 text-center">
                                          <Database size={32} className="mb-2 opacity-20 mx-auto" />
                                          <p className="text-xs italic">Aucune sauvegarde trouvée.</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-6 bg-blue-50 p-4 rounded-xl flex gap-3 border border-blue-100">
                                <HelpCircle className="text-blue-500 shrink-0" size={20} />
                                <div className="space-y-1">
                                  <p className="text-[10px] text-blue-700 leading-relaxed font-bold uppercase">Conseil Sécurité</p>
                                  <p className="text-[10px] text-blue-600 leading-relaxed">
                                    Il est recommandé de créer une sauvegarde manuelle avant toute opération importante de modification d'utilisateurs ou de planning.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                              <div>
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Maintenance du Serveur</h3>
                                <p className="text-sm text-gray-500 mt-2">Utilisez ce bouton pour lancer la mise à jour automatique sur votre serveur VPS.</p>
                              </div>
                              
                              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2 mt-6">
                                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                                  <Info size={16} /> <span>Important</span>
                                </div>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                  Cette action exécutera le script <code>/scripts/update-prod.sh</code> sur votre serveur. 
                                  Assurez-vous que les fichiers ont été téléchargés sur le serveur avant de lancer la mise à jour.
                                </p>
                              </div>

                              <div className="flex-1 flex flex-col justify-end gap-6 mt-8">
                                <button 
                                  onClick={handleUpdateServer}
                                  disabled={isUpdating}
                                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl ${
                                    isUpdating 
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                  }`}
                                >
                                  {isUpdating ? (
                                    <>
                                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                      Mise à jour en cours...
                                    </>
                                  ) : (
                                    <>
                                      <ArrowUp size={20} /> Mettre à jour depuis GITHUB
                                    </>
                                  )}
                                </button>

                                {updateLogs && (
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logs d'exécution :</label>
                                    <div 
                                      id="update-logs-window"
                                      className="bg-gray-900 text-gray-300 p-4 rounded-xl font-mono text-[10px] h-48 overflow-y-auto border border-white/10 whitespace-pre-wrap"
                                    >
                                      {updateLogs}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:col-span-2">
                              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                <RefreshCw className="text-indigo-600 animate-pulse" size={20} />
                                Correction du Décalage d’un Jour (Nouméa GMT+11)
                              </h3>
                              <p className="text-sm text-gray-500 mt-2">
                                En Nouvelle-Calédonie, le fuseau horaire reste fixé à GMT+11 toute l'année sans aucun changement d'heure saisonnier.
                                Si l'opération de basculement d’un planning de Bac à Sable (BAS) vers la base active a provoqué un décalage d'un jour vers le passé,
                                cet outil réparera l'ensemble du planning de l'entité MR-TTA.
                              </p>
                              
                              <div className="mt-6 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 text-indigo-900">
                                <Info size={20} className="shrink-0 text-indigo-600" />
                                <div className="space-y-1">
                                  <p className="text-xs font-bold uppercase tracking-wide">Effet de l'opération :</p>
                                  <p className="text-xs leading-relaxed">
                                    Cette opération recherche toutes les entrées actives (is_sandbox = 0, année 2026) pour l'entité <strong>MR-TTA</strong> 
                                    et repousse leur date d'exécution de <strong>+1 jour</strong>. Cela replacera de façon permanente chaque statut sur le bon jour de la semaine.
                                  </p>
                                </div>
                              </div>

                              <div className="mt-8 flex justify-end">
                                <button
                                  onClick={handleFixDateShift}
                                  disabled={isCorrectingShift}
                                  className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2 ${
                                    isCorrectingShift 
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-black text-white hover:bg-gray-800'
                                  }`}
                                >
                                  {isCorrectingShift ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                      Correction en cours...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw size={14} /> Corriger le Décalage (+1 Jour)
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    } />
                  </>
                )}
                
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>

              {/* User Modal */}
              <AnimatePresence>
                {isEditingMarquee && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white p-8 rounded-2xl shadow-2xl max-w-2xl w-full border border-black/5 overflow-y-auto max-h-[90vh]"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Gestion des messages défilants</h2>
                        <button onClick={() => { setIsEditingMarquee(false); setEditingMarquee(null); }} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                          <X size={20} />
                        </button>
                      </div>

                      <div className="mb-8 space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Messages existants</h3>
                        <div className="space-y-2">
                          {marqueeMessages.map(msg => (
                            <div key={msg.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="flex-1 mr-4">
                                <p className="text-sm font-medium text-gray-900 line-clamp-1">{msg.content}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-bold uppercase">{msg.entities}</span>
                                  {msg.admin_only === 1 && (
                                    <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-700 font-bold uppercase">Admins uniquement</span>
                                  )}
                                  <span className="text-[10px] text-gray-400 font-medium">Du {new Date(msg.start_date).toLocaleDateString()} au {new Date(msg.end_date).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    console.log("Editing message:", msg);
                                    setEditingMarquee(msg);
                                  }}
                                  className="p-2 text-gray-400 hover:text-black hover:bg-white rounded-lg transition-all shadow-sm cursor-pointer"
                                  title="Modifier le message"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmDialog({
                                      message: "Supprimer ce message ?",
                                      onConfirm: async () => {
                                        try {
                                          const res = await fetch(`/api/marquee/${msg.id}`, { method: 'DELETE' });
                                          if (res.ok) {
                                            await fetchData();
                                            showNotification("Message supprimé avec succès");
                                          } else {
                                            const err = await res.json();
                                            showNotification("Erreur lors de la suppression : " + (err.error || "Inconnue"), 'error');
                                          }
                                        } catch (error) {
                                          showNotification("Erreur réseau lors de la suppression", 'error');
                                        }
                                        setConfirmDialog(null);
                                      }
                                    });
                                  }}
                                  className="p-2 text-red-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm cursor-pointer"
                                  title="Supprimer le message"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {marqueeMessages.length === 0 && (
                            <p className="text-sm text-gray-400 italic text-center py-4">Aucun message configuré</p>
                          )}
                        </div>
                      </div>

                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const content = formData.get('content') as string;
                        const start_date = formData.get('start_date') as string;
                        const end_date = formData.get('end_date') as string;
                        const entities = marqueeFormEntities.join(',');

                        if (!content || !start_date || !end_date || entities.length === 0) {
                          showNotification("Veuillez remplir tous les champs et sélectionner au moins une entité.", 'error');
                          return;
                        }

                        if (new Date(start_date) > new Date(end_date)) {
                          showNotification("Incohérence des dates : la date de fin est inférieure à la date de début.", 'error');
                          return;
                        }

                        const url = editingMarquee ? `/api/marquee/${editingMarquee.id}` : '/api/marquee';
                        const method = editingMarquee ? 'PATCH' : 'POST';

                        try {
                          const res = await fetch(url, {
                            method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content, start_date, end_date, entities, admin_only: marqueeFormAdminOnly }),
                          });
                          
                          if (res.ok) {
                            setEditingMarquee(null);
                            await fetchData();
                            form.reset();
                            setMarqueeFormEntities(['All', 'Siège', 'MR-MGA', 'MR-TTA']);
                            setMarqueeFormAdminOnly(false);
                            showNotification("Message enregistré avec succès");
                          } else {
                            const errorData = await res.json();
                            showNotification("Erreur lors de l'enregistrement : " + (errorData.error || res.statusText), 'error');
                          }
                        } catch (err) {
                          showNotification("Une erreur réseau est survenue.", 'error');
                        }
                      }} className="space-y-4 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                          {editingMarquee ? 'Modifier le message' : 'Ajouter un message'}
                        </h3>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Contenu du message</label>
                          <textarea 
                            name="content" 
                            key={editingMarquee?.id || 'new'}
                            defaultValue={editingMarquee?.content || ''}
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black outline-none h-20 resize-none text-sm" 
                            placeholder="Entrez le message à afficher..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date de début</label>
                            <input 
                              type="date" 
                              name="start_date"
                              key={editingMarquee?.id || 'new-start'}
                              defaultValue={editingMarquee?.start_date || formatDateLocal(new Date())}
                              className="w-full p-2 border rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date de fin</label>
                            <input 
                              type="date" 
                              name="end_date"
                              key={editingMarquee?.id || 'new-end'}
                              defaultValue={editingMarquee?.end_date || formatDateLocal(new Date())}
                              className="w-full p-2 border rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Entités concernées</label>
                          <div className="flex flex-wrap gap-4 mt-2">
                            {['All', 'Siège', 'MR-MGA', 'MR-TTA'].map(e => (
                              <label key={e} className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  name="entities" 
                                  value={e}
                                  checked={marqueeFormEntities.includes(e)}
                                  onChange={(event) => {
                                    const checked = event.target.checked;
                                    if (e === 'All') {
                                      if (checked) {
                                        setMarqueeFormEntities(['All', 'Siège', 'MR-MGA', 'MR-TTA']);
                                      } else {
                                        setMarqueeFormEntities([]);
                                      }
                                    } else {
                                      let newEntities = checked 
                                        ? [...marqueeFormEntities, e] 
                                        : marqueeFormEntities.filter(item => item !== e);
                                      
                                      const individuals = ['Siège', 'MR-MGA', 'MR-TTA'];
                                      const allChecked = individuals.every(i => newEntities.includes(i));
                                      
                                      if (allChecked && !newEntities.includes('All')) {
                                        newEntities.push('All');
                                      } else if (!allChecked && newEntities.includes('All')) {
                                        newEntities = newEntities.filter(item => item !== 'All');
                                      }
                                      setMarqueeFormEntities(newEntities);
                                    }
                                  }}
                                  className="rounded border-gray-300 text-black focus:ring-black"
                                />
                                <span className="text-sm text-gray-600">{e}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Visibilité</label>
                          <div className="flex items-center gap-2 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                name="admin_only"
                                checked={marqueeFormAdminOnly}
                                onChange={(event) => setMarqueeFormAdminOnly(event.target.checked)}
                                className="rounded border-gray-300 text-black focus:ring-black"
                              />
                              <span className="text-sm text-gray-600">Message visible uniquement par les administrateurs</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          {editingMarquee && (
                            <button 
                              type="button" 
                              onClick={() => setEditingMarquee(null)}
                              className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all"
                            >
                              Annuler
                            </button>
                          )}
                          <button type="submit" className="flex-1 bg-black text-white py-3 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all">
                            {editingMarquee ? 'Mettre à jour' : 'Ajouter le message'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </motion.div>
                )}

                {showChecklist && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white p-8 rounded-3xl shadow-2xl max-w-xl w-full border border-black/5 overflow-hidden relative"
                    >
                      <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
                      <div className="flex justify-between items-center mb-8">
                        <div>
                          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                            <List className="text-amber-500" /> Checklist de test
                          </h2>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Actions à vérifier dans l'application</p>
                        </div>
                        <button onClick={() => setShowChecklist(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                          <X size={24} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { title: 'Connexion', desc: 'Vérifier l\'accès avec trigramme et mot de passe.', icon: ShieldCheck },
                          { title: 'Ergonomie, design', desc: 'S\'assurer de la cohérence visuelle et de la fluidité.', icon: Palette },
                          { title: 'Réactivité', desc: 'Tester la rapidité de chargement et des interactions.', icon: Zap },
                          { title: 'Modification du profil', desc: 'Mettre à jour les informations dans l\'onglet "Mon Profil".', icon: UserIcon },
                          { title: 'Saisie unitaire & groupée', desc: 'Tester la saisie TDS et les mises à jour en lot.', icon: Edit2 },
                          { title: 'Impression Planning', desc: 'Vérifier le rendu PDF du planning personnel.', icon: Printer },
                        ].map((item, idx) => (
                          <div key={idx} className="group p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4 hover:bg-white hover:shadow-xl hover:border-amber-200 transition-all cursor-default">
                            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-amber-500 shadow-sm group-hover:bg-amber-500 group-hover:text-white transition-all">
                              <item.icon size={20} />
                            </div>
                            <div>
                              <h4 className="font-black text-gray-900 uppercase tracking-wider text-sm">{item.title}</h4>
                              <p className="text-xs text-gray-500 leading-relaxed mt-1">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 pt-6 border-t border-gray-100 italic text-[10px] text-gray-400 text-center">
                        Ce prototype est en cours de déploiement. Merci de remonter toute anomalie.
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {showUserModal && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-black/5"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">{editingUser ? 'Modifier Agent' : 'Nouvel Agent'}</h2>
                        <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                          <X size={20} />
                        </button>
                      </div>

                      <div className="flex gap-4 mb-6 border-b border-gray-100">
                        <button
                          type="button"
                          onClick={() => setUserModalTab('info')}
                          className={`pb-2 text-sm font-bold transition-all ${userModalTab === 'info' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          Informations
                        </button>
                        {user.role === 'admin' && userFormData.role !== 'secretary' && (
                          <button
                            type="button"
                            onClick={() => setUserModalTab('titles')}
                            className={`pb-2 text-sm font-bold transition-all ${userModalTab === 'titles' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            Titres
                          </button>
                        )}
                      </div>
                      
                      <form onSubmit={handleUserSubmit} className="space-y-4">
                        {userModalTab === 'info' ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Trigramme</label>
                                <input 
                                  type="text" 
                                  required
                                  value={userFormData.trigram}
                                  onChange={e => setUserFormData({...userFormData, trigram: e.target.value.toUpperCase()})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                  maxLength={3}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rôle</label>
                                <select 
                                  value={userFormData.role}
                                  onChange={e => setUserFormData({...userFormData, role: e.target.value as Role})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                >
                                  <option value="admin">Administrateur</option>
                                  <option value="secretary">Secrétaire</option>
                                  <option value="user">Agent (User)</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Prénom</label>
                                <input 
                                  type="text" 
                                  required
                                  value={userFormData.firstname}
                                  onChange={e => setUserFormData({...userFormData, firstname: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nom</label>
                                <input 
                                  type="text" 
                                  required
                                  value={userFormData.lastname}
                                  onChange={e => setUserFormData({...userFormData, lastname: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Entité</label>
                              <select 
                                value={userFormData.entity}
                                onChange={e => {
                                  const newEntity = e.target.value as Entity;
                                  setUserFormData({
                                    ...userFormData, 
                                    entity: newEntity,
                                    profil: newEntity === 'MR-TTA' ? 'ATM' : userFormData.profil
                                  });
                                }}
                                className="w-full p-2 border rounded-lg text-sm"
                              >
                                <option value="Siège">Siège</option>
                                <option value="MR-MGA">MR-MGA</option>
                                <option value="MR-TTA">MR-TTA</option>
                              </select>
                            </div>

                            {userFormData.entity === 'MR-TTA' ? (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Section</label>
                                  <select 
                                    value={userFormData.profil}
                                    onChange={e => setUserFormData({...userFormData, profil: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm font-bold"
                                  >
                                    <option value="CHEF">CHEF</option>
                                    <option value="ATM">ATM</option>
                                    <option value="CNS">CNS</option>
                                    <option value="SE">SE</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Jour OFF par défaut</label>
                                  <select 
                                    value={userFormData.off_day}
                                    onChange={e => setUserFormData({...userFormData, off_day: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm font-bold"
                                  >
                                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map(d => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className={userFormData.entity === 'Siège' ? "grid grid-cols-2 gap-4" : ""}>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Profil / Fonction</label>
                                  <input 
                                    type="text" 
                                    value={userFormData.profil}
                                    onChange={e => setUserFormData({...userFormData, profil: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm"
                                  />
                                </div>
                                {userFormData.entity === 'Siège' && (
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Jour TLT par défaut</label>
                                    <select 
                                      value={userFormData.tlt_day || 'Aucun'}
                                      onChange={e => setUserFormData({...userFormData, tlt_day: e.target.value})}
                                      className="w-full p-2 border rounded-lg text-sm font-bold"
                                    >
                                      {['Aucun', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map(d => (
                                        <option key={d} value={d}>{d}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email</label>
                                <input 
                                  type="email" 
                                  value={userFormData.email}
                                  onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mobile</label>
                                <input 
                                  type="text" 
                                  value={userFormData.mobile_num}
                                  onChange={e => setUserFormData({...userFormData, mobile_num: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tél. Pro</label>
                                <input 
                                  type="text" 
                                  value={userFormData.professional_num}
                                  onChange={e => setUserFormData({...userFormData, professional_num: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Adresse</label>
                                <input 
                                  type="text" 
                                  value={userFormData.address}
                                  onChange={e => setUserFormData({...userFormData, address: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Commentaire</label>
                              <textarea 
                                value={userFormData.comment}
                                onChange={e => setUserFormData({...userFormData, comment: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm h-32 resize-none font-medium"
                              />
                            </div>

                            {!editingUser && (
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mot de passe par défaut</label>
                                <input 
                                  type="text" 
                                  value={userFormData.password}
                                  onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date de naissance</label>
                                <input 
                                  type="date" 
                                  value={userFormData.birth_date}
                                  onChange={e => setUserFormData({...userFormData, birth_date: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Corps</label>
                                <input 
                                  type="text" 
                                  value={userFormData.corps}
                                  onChange={e => setUserFormData({...userFormData, corps: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Profil</label>
                                <input 
                                  type="text" 
                                  value={userFormData.profil}
                                  onChange={e => setUserFormData({...userFormData, profil: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">N° Licence</label>
                                <input 
                                  type="text" 
                                  value={userFormData.licence_num}
                                  onChange={e => setUserFormData({...userFormData, licence_num: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Lien OLAF</label>
                              <input 
                                type="url" 
                                value={userFormData.olaf_link}
                                onChange={e => setUserFormData({...userFormData, olaf_link: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                                placeholder="https://..."
                              />
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Autorisation d'Exercice (AE)</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Délivrance</label>
                                  <input 
                                    type="date" 
                                    value={userFormData.ae_issue_date}
                                    onChange={e => setUserFormData({...userFormData, ae_issue_date: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Expiration</label>
                                  <input 
                                    type="date" 
                                    value={userFormData.ae_expiry_date}
                                    onChange={e => setUserFormData({...userFormData, ae_expiry_date: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Habilitation Électrique (HE)</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Formation</label>
                                  <input 
                                    type="date" 
                                    value={userFormData.he_training_date}
                                    onChange={e => setUserFormData({...userFormData, he_training_date: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Expiration</label>
                                  <input 
                                    type="date" 
                                    value={userFormData.he_expiry_date}
                                    onChange={e => setUserFormData({...userFormData, he_expiry_date: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Badge de Sûreté</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Numéro</label>
                                  <input 
                                    type="text" 
                                    value={userFormData.safety_badge_num}
                                    onChange={e => setUserFormData({...userFormData, safety_badge_num: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Expiration</label>
                                  <input 
                                    type="date" 
                                    value={userFormData.safety_badge_expiry_date}
                                    onChange={e => setUserFormData({...userFormData, safety_badge_expiry_date: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Conduite ZCP (Exp.)</label>
                                <input 
                                  type="date" 
                                  value={userFormData.zcp_expiry_date}
                                  onChange={e => setUserFormData({...userFormData, zcp_expiry_date: e.target.value})}
                                  className="w-full p-2 border rounded-lg text-sm"
                                />
                              </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Anglais</p>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dernier Test</label>
                                  <input 
                                    type="date" 
                                    value={userFormData.english_test_date}
                                    onChange={e => setUserFormData({...userFormData, english_test_date: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Niveau</label>
                                  <select 
                                    value={userFormData.english_level}
                                    onChange={e => setUserFormData({...userFormData, english_level: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                  >
                                    <option value="">-</option>
                                    <option value="A1">A1</option>
                                    <option value="A2">A2</option>
                                    <option value="B1">B1</option>
                                    <option value="B2">B2</option>
                                    <option value="C1">C1</option>
                                    <option value="C2">C2</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Prochain Test</label>
                                  <input 
                                    type="date" 
                                    value={userFormData.english_next_test_date}
                                    onChange={e => setUserFormData({...userFormData, english_next_test_date: e.target.value})}
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-4 flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setShowUserModal(false)}
                            className="flex-1 py-3 rounded-xl font-bold text-sm border border-gray-200 hover:bg-gray-50 transition-all"
                          >
                            Annuler
                          </button>
                          <button 
                            type="submit"
                            className="flex-1 bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
                          >
                            {editingUser ? 'Enregistrer' : 'Créer'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <IcsImportModal
        user={user}
        isOpen={isIcsModalOpen}
        onClose={() => setIsIcsModalOpen(false)}
        onImportSuccess={(count) => {
          showNotification(`Agenda Outlook importé avec succès (${count} jour(s) synchronisé(s)) !`, 'success');
          fetchData();
        }}
      />
    </div>
  </div>
);
}
