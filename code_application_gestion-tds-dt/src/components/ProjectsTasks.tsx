import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  FolderGit, 
  User as UserIcon, 
  CheckSquare, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface ProjectTask {
  id: string;
  section: string;
  project: string;
  manager: string;
  task: string;
  taskManager: string;
  dueDate: string; // YYYY-MM-DD
  status: string; // "En cours" | "Non affectée" | "Terminée"
  followUp: string;
}

const COLUMNS = [
  { key: 'section' as const, label: 'Section', widthClass: 'w-[74px] max-w-[74px] px-1 text-center' },
  { key: 'projectNumber' as const, label: 'N°P', isCalculated: true, widthClass: 'w-12 max-w-[48px] px-1 text-center' },
  { key: 'project' as const, label: 'Projet', widthClass: 'w-[180px] max-w-[180px] px-1' },
  { key: 'manager' as const, label: 'RESP.', widthClass: 'w-12 max-w-[48px] px-1 text-center' },
  { key: 'taskNumber' as const, label: 'N°T', isCalculated: true, widthClass: 'w-[88px] max-w-[88px] px-1 text-center' },
  { key: 'task' as const, label: 'Tâche', widthClass: 'w-[230px] max-w-[230px] px-2' },
  { key: 'taskManager' as const, label: 'RESP. TÂCHE', widthClass: 'w-12 max-w-[48px] px-1 text-center' },
  { key: 'dueDate' as const, label: 'Échéance', widthClass: 'w-20 max-w-[80px] px-1 text-center' },
  { key: 'weeksRemaining' as const, label: 'Nbre semaines restantes', isCalculated: true, widthClass: 'w-[77px] max-w-[77px] px-1 text-center' },
  { key: 'status' as const, label: 'Etat de la tâche', widthClass: 'w-24 max-w-[96px] px-1 text-center' },
  { key: 'followUp' as const, label: 'Suivi', widthClass: 'px-3 min-w-[120px]' },
];

function sortTasksWithDiversLast(taskList: ProjectTask[]) {
  return [...taskList].sort((a, b) => {
    const projA = (a.project || '').trim();
    const projB = (b.project || '').trim();
    const isDiversA = projA.toLowerCase() === 'divers';
    const isDiversB = projB.toLowerCase() === 'divers';

    if (isDiversA && !isDiversB) return 1;
    if (!isDiversA && isDiversB) return -1;

    return projA.localeCompare(projB, 'fr', { sensitivity: 'base' });
  });
}

export function ProjectsTasks({ user }: { user?: User }) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; col: keyof ProjectTask } | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string | null>(null);
  const [selectedTaskManagerFilter, setSelectedTaskManagerFilter] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [enteringNewProjectForTaskId, setEnteringNewProjectForTaskId] = useState<string | null>(null);

  const isDSO = user?.trigram === 'DSO' || user?.role === 'admin';
  const isMRMGAAgent = user?.entity === 'MR-MGA' || user?.role === 'admin';

  const canCreateTask = isDSO || isMRMGAAgent;
  const canDeleteTask = isDSO;

  const canEditCell = (task: ProjectTask, colKey: keyof ProjectTask) => {
    if (isDSO) return true;
    if (isMRMGAAgent) {
      const isResponsible = user?.trigram && task.taskManager === user.trigram;
      return colKey === 'followUp' && !!isResponsible;
    }
    return false;
  };

  useEffect(() => {
    setCurrentDate(new Date());

    // Load from server on mount
    fetch('/api/projects_tasks')
      .then(res => res.json())
      .then(data => {
        setTasks(sortTasksWithDiversLast(data));
      })
      .catch(err => console.error("Failed to fetch tasks from server", err));
  }, []);

  // Sort tasks automatically when we are not actively editing a cell
  useEffect(() => {
    if (editingCell === null) {
      setTasks(prev => {
        const sorted = sortTasksWithDiversLast(prev);
        
        let changed = false;
        for (let i = 0; i < prev.length; i++) {
          if (prev[i].id !== sorted[i].id) {
            changed = true;
            break;
          }
        }
        return changed ? sorted : prev;
      });
    }
  }, [editingCell]);

  const projectNumberMap = React.useMemo(() => {
    // Retrieve stored project numbers from localStorage if available
    let storedMap: Record<string, number> = {};
    try {
      const saved = localStorage.getItem('mga_project_numbers');
      if (saved) {
        storedMap = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse mga_project_numbers from localStorage", e);
    }

    // Collect all tasks with validated non-empty project names and find earliest task id for each project
    const projectMinIdMap = new Map<string, number>();

    tasks.forEach(t => {
      // Do not assign project number while user is currently typing a new project name
      if (enteringNewProjectForTaskId === t.id) return;

      const proj = (t.project || '').trim();
      if (!proj) return;
      const numId = Number(t.id) || 999999;
      if (!projectMinIdMap.has(proj) || numId < projectMinIdMap.get(proj)!) {
        projectMinIdMap.set(proj, numId);
      }
    });

    // Determine current max stored number
    let maxNum = typeof storedMap.__maxProjectNum === 'number' ? storedMap.__maxProjectNum : 0;
    Object.entries(storedMap).forEach(([k, n]) => {
      if (k !== '__maxProjectNum' && typeof n === 'number' && n > maxNum) {
        maxNum = n;
      }
    });

    // Find projects present in tasks that are not yet in storedMap (excluding metadata keys), sorted by min task ID
    const newProjects = Array.from(projectMinIdMap.keys())
      .filter(proj => proj !== '__maxProjectNum' && !(proj in storedMap))
      .sort((a, b) => projectMinIdMap.get(a)! - projectMinIdMap.get(b)!);

    // Assign permanent sequential numbers to new projects (max + 1)
    const updatedMap = { ...storedMap };
    newProjects.forEach(proj => {
      maxNum += 1;
      updatedMap[proj] = maxNum;
    });
    updatedMap.__maxProjectNum = maxNum;

    // Save updated mapping back to localStorage if new projects were added
    if (newProjects.length > 0) {
      try {
        localStorage.setItem('mga_project_numbers', JSON.stringify(updatedMap));
      } catch (e) {
        console.error("Failed to save mga_project_numbers to localStorage", e);
      }
    }

    const resultMap = new Map<string, number>();
    Object.entries(updatedMap).forEach(([proj, num]) => {
      if (proj !== '__maxProjectNum') {
        resultMap.set(proj, num as number);
      }
    });

    return resultMap;
  }, [tasks, enteringNewProjectForTaskId]);

  const taskNumberMap = React.useMemo(() => {
    let rawSaved: any = {};
    try {
      const saved = localStorage.getItem('mga_task_numbers');
      if (saved) {
        rawSaved = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse mga_task_numbers from localStorage", e);
    }

    let taskNumbers: Record<string, number> = {};
    let taskProjects: Record<string, string> = {};
    let usedNumbersInProject: Record<string, Set<number>> = {};

    if (rawSaved && typeof rawSaved === 'object') {
      if (rawSaved.taskNumbers && typeof rawSaved.taskNumbers === 'object') {
        taskNumbers = { ...rawSaved.taskNumbers };
        taskProjects = rawSaved.taskProjects && typeof rawSaved.taskProjects === 'object' ? { ...rawSaved.taskProjects } : {};
        if (rawSaved.usedNumbers && typeof rawSaved.usedNumbers === 'object') {
          Object.entries(rawSaved.usedNumbers).forEach(([projKey, numArr]) => {
            if (Array.isArray(numArr)) {
              usedNumbersInProject[projKey] = new Set<number>(numArr as number[]);
            }
          });
        }
      } else {
        // Legacy flat format
        Object.entries(rawSaved).forEach(([id, val]) => {
          if (typeof val === 'number') {
            taskNumbers[id] = val;
            const foundTask = tasks.find(t => String(t.id) === String(id));
            if (foundTask) {
              const proj = (foundTask.project || '').trim();
              taskProjects[id] = proj;
              if (!usedNumbersInProject[proj]) usedNumbersInProject[proj] = new Set<number>();
              usedNumbersInProject[proj].add(val);
            }
          }
        });
      }
    }

    // Populate historical assigned numbers from stored taskNumbers
    Object.entries(taskNumbers).forEach(([tid, num]) => {
      const proj = taskProjects[tid] ?? '';
      if (!usedNumbersInProject[proj]) {
        usedNumbersInProject[proj] = new Set<number>();
      }
      if (typeof num === 'number' && num > 0) {
        usedNumbersInProject[proj].add(num);
      }
    });

    let hasChanges = false;

    // Process tasks: Lock in existing assignments or assign (max + 1) for project or unassigned group ('')
    tasks.forEach(t => {
      const tid = String(t.id);
      const isManualEditing = enteringNewProjectForTaskId === t.id;
      const proj = isManualEditing ? '' : (t.project || '').trim();

      if (!usedNumbersInProject[proj]) {
        usedNumbersInProject[proj] = new Set<number>();
      }

      const storedNum = taskNumbers[tid];
      const storedProj = taskProjects[tid];

      if (typeof storedNum === 'number' && storedNum > 0 && storedProj === proj) {
        // Task has an existing assignment for this project / unassigned group - keep it permanently!
        usedNumbersInProject[proj].add(storedNum);
      } else {
        // Task is newly created or assigned to a different project - assign (max + 1)
        let maxForProj = 0;
        usedNumbersInProject[proj].forEach(n => {
          if (n > maxForProj) maxForProj = n;
        });
        const nextNum = maxForProj + 1;

        taskNumbers[tid] = nextNum;
        taskProjects[tid] = proj;
        usedNumbersInProject[proj].add(nextNum);
        hasChanges = true;
      }
    });

    // Save state back to localStorage
    if (hasChanges || !rawSaved.taskNumbers) {
      try {
        const serializableUsedNumbers: Record<string, number[]> = {};
        Object.entries(usedNumbersInProject).forEach(([pKey, pSet]) => {
          serializableUsedNumbers[pKey] = Array.from(pSet);
        });

        const toSave = {
          taskNumbers,
          taskProjects,
          usedNumbers: serializableUsedNumbers,
        };
        localStorage.setItem('mga_task_numbers', JSON.stringify(toSave));
      } catch (e) {
        console.error("Failed to save mga_task_numbers to localStorage", e);
      }
    }

    const resultMap = new Map<string, string>();
    tasks.forEach(t => {
      const tid = String(t.id);
      const isManualEditing = enteringNewProjectForTaskId === t.id;
      const projName = isManualEditing ? '' : (t.project || '').trim();

      const projNum = projName ? projectNumberMap.get(projName) : null;
      const tNum = taskNumbers[tid];

      const formattedPNum = projNum !== null && projNum !== undefined ? String(projNum).padStart(3, '0') : 'xxx';
      const formattedTNum = tNum ? String(tNum).padStart(3, '0') : '001';

      resultMap.set(t.id, `${formattedPNum}-${formattedTNum}`);
    });

    return resultMap;
  }, [tasks, projectNumberMap, enteringNewProjectForTaskId]);

  const availableSections = React.useMemo(() => {
    const defaultSections = ['CNS/ATM', 'MR', 'SE'];
    const sectionsFromTasks = tasks.map(t => (t.section || '').trim()).filter(Boolean);
    const set = new Set([...defaultSections, ...sectionsFromTasks]);
    return Array.from(set);
  }, [tasks]);

  const filteredTasks = tasks.filter(t => {
    const matchesSection = selectedSectionFilter ? t.section === selectedSectionFilter : true;
    const matchesManager = selectedTaskManagerFilter ? t.taskManager === selectedTaskManagerFilter : true;
    const matchesStatus = selectedStatusFilter
      ? (selectedStatusFilter === 'Terminée' || selectedStatusFilter === 'Terminé'
          ? (t.status === 'Terminée' || t.status === 'Terminé')
          : t.status === selectedStatusFilter)
      : true;
    return matchesSection && matchesManager && matchesStatus;
  });

  const calculateWeeksRemaining = (dueDateStr?: string, status?: string): number | "RETARD" | null => {
    if (!dueDateStr || status !== "En cours") return null;
    const dueDate = new Date(dueDateStr);
    if (isNaN(dueDate.getTime())) return null;

    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return "RETARD";
    }
    return Math.floor(diffDays / 7);
  };

  const formatDateFr = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const handleCellChange = (id: string, col: keyof ProjectTask, value: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !canEditCell(task, col)) return;

    let updatedTask: ProjectTask | null = null;
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (col === 'status' && value === 'Non affectée') {
          updatedTask = { ...t, status: value, taskManager: "" };
        } else {
          updatedTask = { ...t, [col]: value };
        }
        return updatedTask;
      }
      return t;
    }));

    setTimeout(() => {
      if (updatedTask) {
        fetch('/api/projects_tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTask)
        }).catch(err => console.error("Failed to update task on server", err));
      }
    }, 0);
  };

  const handleAddTask = () => {
    if (!canCreateTask) return;

    const newTask: Omit<ProjectTask, 'id'> = {
      section: "CNS/ATM",
      project: "",
      manager: "",
      task: "Nouvelle Tâche",
      taskManager: user?.trigram || "",
      dueDate: "",
      status: "En attente",
      followUp: ""
    };

    fetch('/api/projects_tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.id) {
          const createdTask: ProjectTask = {
            id: resData.id,
            ...newTask
          };
          setTasks(prev => {
            const updated = [...prev, createdTask];
            return sortTasksWithDiversLast(updated);
          });
          setEditingCell({ id: createdTask.id, col: 'task' });
        }
      })
      .catch(err => console.error("Failed to create task on server", err));
  };

  const handleDeleteTask = (id: string) => {
    if (!canDeleteTask) return;

    if (window.confirm("Voulez-vous vraiment supprimer cette tâche ?")) {
      fetch(`/api/projects_tasks/${id}`, {
        method: 'DELETE'
      })
        .then(() => {
          setTasks(prev => prev.filter(t => t.id !== id));
        })
        .catch(err => console.error("Failed to delete task on server", err));
    }
  };

  // Get colors based on task status
  const getTaskStyles = (status: string, key: keyof ProjectTask) => {
    if (key === 'task' || key === 'status') {
      if (status === 'En cours') {
        return 'bg-[#FDE9D9] text-gray-900 font-medium';
      } else if (status === 'En attente') {
        return 'bg-purple-100 text-purple-900 font-medium';
      } else if (status === 'Non affectée') {
        return 'bg-[#DCE6F1] text-gray-900 font-medium';
      } else if (status === 'Terminé' || status === 'Terminée') {
        return 'bg-emerald-50 text-emerald-800 font-medium line-through decoration-emerald-300';
      }
    }
    return 'text-gray-700 font-medium';
  };

  // Get colors for weeks remaining cell
  const getWeeksRemainingStyles = (weeks: number | "RETARD" | null, status: string) => {
    if (weeks === null) return 'bg-white';
    if (status === 'Terminé' || status === 'Terminée') return 'bg-emerald-100 text-emerald-800 font-bold text-center';
    
    if (weeks === "RETARD") {
      return 'bg-red-100 text-red-700 border border-red-300 font-extrabold text-center rounded-sm px-1 shadow-sm';
    }
    
    if (weeks < 2) {
      return 'bg-[#E26B0A] text-white font-extrabold text-center rounded-sm px-1 shadow-sm';
    } else if (weeks >= 2 && weeks <= 4) {
      return 'bg-yellow-400 text-yellow-950 font-extrabold text-center rounded-sm px-1 shadow-sm';
    } else {
      return 'bg-[#00B050] text-white font-extrabold text-center rounded-sm px-1 shadow-sm';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title section */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-600 rounded-xl">
              <FileSpreadsheet size={24} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wider flex flex-wrap items-center gap-2">
              <span>Projets/Tâches MR-MGA</span>
              {isDSO ? (
                <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold normal-case">
                  Administrateur (DSO)
                </span>
              ) : isMRMGAAgent ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold normal-case">
                  Agent MR-MGA (Modification Suivi)
                </span>
              ) : (
                <span className="text-[10px] bg-gray-150 text-gray-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold normal-case">
                  Lecture seule
                </span>
              )}
            </h1>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            Planification, suivi opérationnel et avancement des projets et tâches de Magenta.
          </p>
        </div>

        {canCreateTask && (
          <button
            onClick={handleAddTask}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
          >
            <Plus size={14} />
            Ajouter une tâche
          </button>
        )}
      </div>

      {/* Filters Section instead of Stats */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section Filter (à gauche) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Filtrer par section :</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSectionFilter(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                  selectedSectionFilter === null
                    ? 'bg-black text-white scale-[1.02]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous ({tasks.filter(t => {
                  const matchesManager = selectedTaskManagerFilter ? t.taskManager === selectedTaskManagerFilter : true;
                  const matchesStatus = selectedStatusFilter ? t.status === selectedStatusFilter : true;
                  return matchesManager && matchesStatus;
                }).length})
              </button>
              {availableSections.map(sec => {
                const count = tasks.filter(t => {
                  const matchesManager = selectedTaskManagerFilter ? t.taskManager === selectedTaskManagerFilter : true;
                  const matchesStatus = selectedStatusFilter ? t.status === selectedStatusFilter : true;
                  return t.section === sec && matchesManager && matchesStatus;
                }).length;

                const isSelected = selectedSectionFilter === sec;
                return (
                  <button
                    key={sec}
                    onClick={() => setSelectedSectionFilter(sec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                      isSelected
                        ? 'bg-teal-700 text-white scale-[1.02]'
                        : 'bg-teal-50 text-teal-800 hover:bg-teal-100/80'
                    }`}
                  >
                    {sec} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Manager Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Filtrer par responsable de tâche :</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTaskManagerFilter(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                  selectedTaskManagerFilter === null
                    ? 'bg-black text-white scale-[1.02]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous ({tasks.filter(t => {
                  const matchesSection = selectedSectionFilter ? t.section === selectedSectionFilter : true;
                  const matchesStatus = selectedStatusFilter ? t.status === selectedStatusFilter : true;
                  return matchesSection && matchesStatus;
                }).length})
              </button>
              {['DSO', 'PRI', 'GBT', 'PDO', 'GDN'].map(manager => {
                const count = tasks.filter(t => {
                  const matchesSection = selectedSectionFilter ? t.section === selectedSectionFilter : true;
                  const matchesStatus = selectedStatusFilter ? t.status === selectedStatusFilter : true;
                  return t.taskManager === manager && matchesSection && matchesStatus;
                }).length;

                return (
                  <button
                    key={manager}
                    onClick={() => setSelectedTaskManagerFilter(manager)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                      selectedTaskManagerFilter === manager
                        ? 'bg-sky-600 text-white scale-[1.02]'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100/80'
                    }`}
                  >
                    {manager} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Filtrer par état de la tâche :</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStatusFilter(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                  selectedStatusFilter === null
                    ? 'bg-black text-white scale-[1.02]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous ({tasks.filter(t => {
                  const matchesSection = selectedSectionFilter ? t.section === selectedSectionFilter : true;
                  const matchesManager = selectedTaskManagerFilter ? t.taskManager === selectedTaskManagerFilter : true;
                  return matchesSection && matchesManager;
                }).length})
              </button>
              {[
                { value: 'En cours', label: 'En cours', colorClass: 'bg-amber-100 text-amber-800 hover:bg-amber-200/80' },
                { value: 'En attente', label: 'En attente', colorClass: 'bg-purple-100 text-purple-800 hover:bg-purple-200/80' },
                { value: 'Non affectée', label: 'Non affectée', colorClass: 'bg-blue-100 text-blue-800 hover:bg-blue-200/80' },
                { value: 'Terminée', label: 'Terminée', colorClass: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200/80' }
              ].map(item => {
                const count = tasks.filter(t => {
                  const matchesSection = selectedSectionFilter ? t.section === selectedSectionFilter : true;
                  const matchesManager = selectedTaskManagerFilter ? t.taskManager === selectedTaskManagerFilter : true;
                  const matchesStatus = item.value === 'Terminée' ? (t.status === 'Terminée' || t.status === 'Terminé') : t.status === item.value;
                  return matchesStatus && matchesSection && matchesManager;
                }).length;

                const isSelected = selectedStatusFilter === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => setSelectedStatusFilter(item.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                      isSelected
                        ? 'bg-indigo-600 text-white scale-[1.02]'
                        : item.colorClass
                    }`}
                  >
                    {item.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200">
                {canDeleteTask && (
                  <th className="py-2 px-1 text-[10px] font-black uppercase tracking-wider text-gray-500 text-center w-8 max-w-[32px] border-r border-gray-200"></th>
                )}
                {COLUMNS.map(col => (
                  <th 
                    key={col.key} 
                    className={`py-2 ${col.widthClass || 'px-3'} text-[10px] font-black uppercase tracking-wider text-gray-500 border-r border-gray-200 last:border-r-0`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => {
                const weeksRem = calculateWeeksRemaining(t.dueDate, t.status);
                return (
                  <tr key={t.id} className="border-b border-gray-150 hover:bg-gray-50/50 transition-colors group">
                    {canDeleteTask && (
                      <td className="py-2 px-1 text-center border-r border-gray-200 bg-gray-50/20 w-8 max-w-[32px]">
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer cette tâche"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                    {COLUMNS.map(col => {
                      if (col.isCalculated) {
                        if (col.key === 'weeksRemaining') {
                          const cellBgClass = getWeeksRemainingStyles(weeksRem, t.status);
                          return (
                            <td 
                              key={col.key} 
                              className={`py-2 ${col.widthClass || 'px-3'} border-r border-gray-200 last:border-r-0 text-center text-xs font-bold`}
                            >
                              {weeksRem !== null ? (
                                <span className={`inline-block min-w-[32px] px-1.5 py-0.5 rounded text-[10px] ${cellBgClass}`}>
                                  {weeksRem}
                                </span>
                              ) : (
                                <span className="text-gray-300">--</span>
                              )}
                            </td>
                          );
                        }
                        if (col.key === 'projectNumber') {
                          const isManual = enteringNewProjectForTaskId === t.id;
                          const projName = isManual ? '' : (t.project || '').trim();
                          const projNum = projName ? projectNumberMap.get(projName) : null;
                          const formattedPNum = projNum !== null && projNum !== undefined ? String(projNum).padStart(3, '0') : 'xxx';
                          return (
                            <td 
                              key={col.key} 
                              className={`py-2 ${col.widthClass || 'px-3'} border-r border-gray-200 last:border-r-0 text-center text-xs font-bold text-gray-700 bg-gray-50/20`}
                            >
                              {formattedPNum}
                            </td>
                          );
                        }
                        if (col.key === 'taskNumber') {
                          const taskNumStr = taskNumberMap.get(t.id) || '';
                          return (
                            <td 
                              key={col.key} 
                              className={`py-2 ${col.widthClass || 'px-3'} border-r border-gray-200 last:border-r-0 text-center text-xs font-bold text-gray-700 bg-gray-50/20`}
                            >
                              {taskNumStr}
                            </td>
                          );
                        }
                      }

                      const value = t[col.key as keyof ProjectTask] || '';
                      const editable = canEditCell(t, col.key as keyof ProjectTask);
                      const isEditing = editable && editingCell?.id === t.id && editingCell?.col === col.key;
                      const customStyles = getTaskStyles(t.status, col.key as keyof ProjectTask);

                      return (
                        <td
                          key={col.key}
                          onClick={() => {
                            if (editable && !isEditing) {
                              setEditingCell({ id: t.id, col: col.key as keyof ProjectTask });
                            }
                          }}
                          className={`py-2 ${col.widthClass || 'px-3'} border-r border-gray-200 last:border-r-0 transition-all relative select-none text-xs ${customStyles} ${
                            editable ? 'cursor-pointer hover:bg-gray-150/50' : 'cursor-default'
                          }`}
                        >
                          {isEditing ? (
                            col.key === 'dueDate' ? (
                              <input
                                type="date"
                                value={value}
                                autoFocus
                                onBlur={() => setEditingCell(null)}
                                onChange={e => handleCellChange(t.id, 'dueDate', e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    setEditingCell(null);
                                  }
                                }}
                                className="w-full bg-white border border-sky-400 rounded-lg p-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                              />
                            ) : col.key === 'status' ? (
                              <select
                                value={value}
                                autoFocus
                                onBlur={() => setEditingCell(null)}
                                onChange={e => handleCellChange(t.id, 'status', e.target.value)}
                                className="w-full bg-white border border-sky-400 rounded-lg p-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                              >
                                <option value="En cours">En cours</option>
                                <option value="En attente">En attente</option>
                                <option value="Non affectée">Non affectée</option>
                                <option value="Terminée">Terminée</option>
                              </select>
                            ) : col.key === 'section' ? (
                              <select
                                value={value}
                                autoFocus
                                onBlur={() => setEditingCell(null)}
                                onChange={e => handleCellChange(t.id, 'section', e.target.value)}
                                className="w-full bg-white border border-sky-400 rounded-lg p-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                              >
                                <option value="CNS/ATM">CNS/ATM</option>
                                <option value="MR">MR</option>
                                <option value="SE">SE</option>
                              </select>
                            ) : col.key === 'manager' || col.key === 'taskManager' ? (
                              <select
                                value={value}
                                autoFocus
                                onBlur={() => setEditingCell(null)}
                                onChange={e => handleCellChange(t.id, col.key as keyof ProjectTask, e.target.value)}
                                className="w-full bg-white border border-sky-400 rounded-lg p-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                              >
                                <option value="">--</option>
                                <option value="DSO">DSO</option>
                                <option value="PRI">PRI</option>
                                <option value="GBT">GBT</option>
                                <option value="PDO">PDO</option>
                                <option value="GDN">GDN</option>
                              </select>
                            ) : col.key === 'task' || col.key === 'followUp' ? (
                              <textarea
                                value={value}
                                autoFocus
                                onBlur={() => setEditingCell(null)}
                                onChange={e => handleCellChange(t.id, col.key as keyof ProjectTask, e.target.value)}
                                className="w-full bg-white border border-sky-400 rounded-lg p-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 min-h-[60px]"
                              />
                            ) : col.key === 'project' ? (
                              (() => {
                                const uniqueProjects = Array.from(new Set(tasks.map(tsk => tsk.project).filter(p => p && p.trim() !== '')));
                                const otherProjects = uniqueProjects.filter(p => p !== value);
                                const isManual = enteringNewProjectForTaskId === t.id;

                                if (isManual) {
                                  return (
                                    <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        value={value}
                                        autoFocus
                                        placeholder="Nom du projet..."
                                        onBlur={() => {
                                          setEditingCell(null);
                                          setEnteringNewProjectForTaskId(null);
                                        }}
                                        onChange={e => handleCellChange(t.id, 'project', e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            setEditingCell(null);
                                            setEnteringNewProjectForTaskId(null);
                                          }
                                        }}
                                        className="w-full bg-white border border-sky-400 rounded-lg p-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                      />
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setEnteringNewProjectForTaskId(null);
                                        }}
                                        className="p-0.5 hover:bg-gray-100 rounded text-gray-500 shrink-0"
                                        title="Retour"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <select
                                    value={value}
                                    autoFocus
                                    onBlur={() => setEditingCell(null)}
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (val === '__NEW__') {
                                        setEnteringNewProjectForTaskId(t.id);
                                        handleCellChange(t.id, 'project', '');
                                      } else {
                                        handleCellChange(t.id, 'project', val);
                                        setEditingCell(null);
                                      }
                                    }}
                                    className="w-full bg-white border border-sky-400 rounded-lg p-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                  >
                                    {value ? (
                                      <option value={value}>{value}</option>
                                    ) : (
                                      <option value="">-- Choisir --</option>
                                    )}
                                    {otherProjects.map(proj => (
                                      <option key={proj} value={proj}>{proj}</option>
                                    ))}
                                    <option value="__NEW__">++ Nouveau... ++</option>
                                  </select>
                                );
                              })()
                            ) : (
                              <input
                                type="text"
                                value={value}
                                autoFocus
                                onBlur={() => setEditingCell(null)}
                                onChange={e => handleCellChange(t.id, col.key as keyof ProjectTask, e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    setEditingCell(null);
                                  }
                                }}
                                className="w-full bg-white border border-sky-400 rounded-lg p-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                              />
                            )
                          ) : (
                            <div className="flex items-center gap-1.5 min-h-[20px]">
                              {col.key === 'dueDate' ? (
                                <span className="font-semibold text-gray-700">{formatDateFr(value) || <span className="text-gray-300">--/--/----</span>}</span>
                              ) : col.key === 'followUp' ? (
                                <p className="whitespace-pre-wrap w-full text-left">{value || <span className="text-gray-300 italic">Aucun suivi</span>}</p>
                              ) : (
                                <span className="text-left font-medium whitespace-pre-wrap break-words">{value}</span>
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
