import React, { useState } from 'react';
import { Task } from '../lib/types';
import { CheckCircle2, Clock, Plus, Trash2, User } from 'lucide-react';

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
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#FDA4AF] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">HIGH</span>;
      case 'medium':
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#FDE047] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">MEDIUM</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#BAE6FD] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">LOW</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border-[2.5px] border-black p-3.5 rounded-xl shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'todo', 'in_progress', 'done'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition-all border-2 border-black ${
                filter === tab
                  ? 'bg-[#FFE600] text-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                  : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-black'
              }`}
            >
              {tab.replace('_', ' ')} ({tab === 'all' ? tasks.length : tasks.filter(t => t.status === tab).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black bg-[#A7F3D0] hover:bg-[#86EFAC] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Add Deliverable
        </button>
      </div>

      {/* Add Task Modal / Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white border-[2.5px] border-black rounded-xl p-5 shadow-[5px_5px_0px_0px_#000] space-y-3">
          <h4 className="text-xs font-black text-black uppercase tracking-wider">New Action Item Deliverable</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Deliverable Title *"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-xs bg-slate-50 border-2 border-black rounded-lg p-2.5 text-black font-semibold focus:outline-none focus:bg-yellow-50"
              required
            />
            <input
              type="text"
              placeholder="Recommended Owner (e.g. Operations Lead)"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              className="text-xs bg-slate-50 border-2 border-black rounded-lg p-2.5 text-black font-semibold focus:outline-none focus:bg-yellow-50"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Target Measurable Metric (e.g. Reduce CAC below ₹400)"
              value={metric}
              onChange={e => setMetric(e.target.value)}
              className="text-xs bg-slate-50 border-2 border-black rounded-lg p-2.5 text-black font-semibold focus:outline-none focus:bg-yellow-50"
            />
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="text-xs bg-slate-50 border-2 border-black rounded-lg p-2.5 text-black font-bold focus:outline-none focus:bg-yellow-50"
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
            className="w-full text-xs bg-slate-50 border-2 border-black rounded-lg p-2.5 text-black font-semibold focus:outline-none focus:bg-yellow-50"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-bold text-black hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-black bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 rounded-lg transition"
            >
              Save Deliverable
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center p-8 border-[2px] border-dashed border-black rounded-xl bg-white text-black text-xs font-bold shadow-[3px_3px_0px_0px_#000]">
          No action deliverables found matching filter. Boardroom meetings automatically generate prioritized deliverables.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border-[2.5px] border-black transition-all ${
                task.status === 'done'
                  ? 'bg-slate-100 opacity-60 shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <button
                  onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                  className={`mt-0.5 rounded-md p-1 border-2 border-black transition ${
                    task.status === 'done' ? 'bg-[#86EFAC] text-black' : 'bg-white text-transparent hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-black ${task.status === 'done' ? 'line-through text-slate-500' : 'text-black'}`}>
                      {task.title}
                    </span>
                    {getPriorityBadge(task.priority)}
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-800 font-medium leading-relaxed max-w-2xl">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-[11px] text-black font-bold pt-1 flex-wrap">
                    {task.owner && (
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-black">
                        <User className="w-3.5 h-3.5" />
                        {task.owner}
                      </span>
                    )}
                    {task.success_metric && (
                      <span className="flex items-center gap-1 bg-[#BAE6FD] px-2 py-0.5 rounded border border-black">
                        <Clock className="w-3.5 h-3.5" />
                        KPI: {task.success_metric}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Select & Delete */}
              <div className="flex items-center gap-3 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t-2 sm:border-0 border-black w-full sm:w-auto justify-end">
                <select
                  value={task.status}
                  onChange={(e) => onUpdateStatus(task.id, e.target.value as 'todo' | 'in_progress' | 'done')}
                  className="text-xs bg-white border-2 border-black rounded-lg px-3 py-1.5 text-black font-black focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Completed</option>
                </select>

                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-black hover:bg-rose-100 border-2 border-black rounded-lg transition shadow-[2px_2px_0px_0px_#000]"
                  title="Delete Deliverable"
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
