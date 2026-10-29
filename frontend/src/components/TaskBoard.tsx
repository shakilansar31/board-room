import React, { useState } from 'react';
import { Task } from '../lib/types';
import { CheckCircle2, Clock, Plus, Trash2, User, AlertCircle } from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => Promise<void>;
  onCreateTask: (taskData: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onUpdateStatus,
  onCreateTask,
  onDeleteTask
}) => {
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [owner, setOwner] = useState('Unassigned');
  const [metric, setMetric] = useState('');

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreateTask({
      title: title.trim(),
      description: description.trim(),
      priority,
      owner: owner.trim() || 'Unassigned',
      success_metric: metric.trim(),
      status: 'todo'
    });
    setTitle('');
    setDescription('');
    setMetric('');
    setIsAdding(false);
  };

  const getPriorityBadge = (p: string) => {
    switch (p.toLowerCase()) {
      case 'high':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">LOW</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar - Minimal Design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'todo', 'in_progress', 'done'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === tab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.replace('_', ' ')} ({tab === 'all' ? tasks.length : tasks.filter(t => t.status === tab).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Deliverable</span>
        </button>
      </div>

      {/* Add Task Form - Minimal Card */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">New Action Item Deliverable</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Deliverable Title *"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              required
            />
            <input
              type="text"
              placeholder="Recommended Owner (e.g. Operations Lead)"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Target Measurable Metric (e.g. Reduce CAC below ₹400)"
              value={metric}
              onChange={e => setMetric(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
          <textarea
            placeholder="Detailed scope or implementation steps..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition"
            >
              Save Deliverable
            </button>
          </div>
        </form>
      )}

      {/* Task List - Minimal Cards */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-white text-slate-500 text-xs shadow-sm">
          No action deliverables found matching filter. Boardroom meetings automatically generate prioritized deliverables.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all ${
                task.status === 'done'
                  ? 'bg-slate-50 border-slate-200 opacity-70'
                  : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <button
                  onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                  className={`mt-0.5 rounded-lg p-1 border transition ${
                    task.status === 'done'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-white border-slate-200 text-transparent hover:border-slate-400'
                  }`}
                  title={task.status === 'done' ? 'Mark Incomplete' : 'Mark Complete'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {task.title}
                    </span>
                    {getPriorityBadge(task.priority)}
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 flex-wrap">
                    {task.owner && (
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        <User className="w-3 h-3 text-slate-400" />
                        {task.owner}
                      </span>
                    )}
                    {task.success_metric && (
                      <span className="flex items-center gap-1 bg-indigo-50/50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        KPI: {task.success_metric}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Select & Delete */}
              <div className="flex items-center gap-2.5 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 w-full sm:w-auto justify-end">
                <select
                  value={task.status}
                  onChange={(e) => onUpdateStatus(task.id, e.target.value as 'todo' | 'in_progress' | 'done')}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Completed</option>
                </select>

                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
                  title="Delete Deliverable"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
