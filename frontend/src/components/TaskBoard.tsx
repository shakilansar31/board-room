import React, { useState } from 'react';
import { Task } from '../lib/types';
import { CheckCircle2, Clock, AlertCircle, Plus, Trash2, User } from 'lucide-react';

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
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">LOW</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['all', 'todo', 'in_progress', 'done'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition ${
                filter === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.replace('_', ' ')} ({tab === 'all' ? tasks.length : tasks.filter(t => t.status === tab).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Custom Task
        </button>
      </div>

      {/* Add Task Modal / Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-slate-900 border border-blue-500/40 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">New Action Item</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Task title *"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Recommended Owner (e.g., Finance Lead)"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Target Measurable KPI (e.g. Reduce CAC to $45)"
              value={metric}
              onChange={e => setMetric(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
          <textarea
            placeholder="Detailed scope or description..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              Save Action Item
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/30 text-slate-400 text-xs">
          No tasks found matching filter. Boardroom meetings automatically generate prioritized action items.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all ${
                task.status === 'done'
                  ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <button
                  onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                  className={`mt-0.5 rounded-full p-0.5 transition ${
                    task.status === 'done' ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {task.title}
                    </span>
                    {getPriorityBadge(task.priority)}
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 flex-wrap">
                    {task.owner && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {task.owner}
                      </span>
                    )}
                    {task.success_metric && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Clock className="w-3.5 h-3.5" />
                        Target: {task.success_metric}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Select & Delete */}
              <div className="flex items-center gap-3 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800 w-full sm:w-auto justify-end">
                <select
                  value={task.status}
                  onChange={(e) => onUpdateStatus(task.id, e.target.value as any)}
                  className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Completed</option>
                </select>

                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
