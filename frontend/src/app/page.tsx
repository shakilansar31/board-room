'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Users,
  BarChart3,
  FileText,
  CheckSquare,
  Settings,
  Sparkles,
  Download,
  AlertTriangle,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Shield,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

import { api } from '../lib/api';
import {
  Business,
  FinancialMetrics,
  DocumentItem,
  TransactionItem,
  Meeting,
  Task,
  MeetingMessage,
  SystemHealth
} from '../lib/types';

import { ExecutiveCard, EXECUTIVES } from '../components/ExecutiveCard';
import { StageProgress } from '../components/StageProgress';
import { FinancialCharts } from '../components/FinancialCharts';
import { ColumnMappingModal } from '../components/ColumnMappingModal';
import { TaskBoard } from '../components/TaskBoard';
import { NewWorkspaceModal } from '../components/NewWorkspaceModal';

export default function Home() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'boardroom' | 'data' | 'meetings' | 'tasks' | 'settings'>('overview');

  // Core Data State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Meeting / Boardroom State
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [streamingMessages, setStreamingMessages] = useState<MeetingMessage[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('clarification');
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [isMeetingRunning, setIsMeetingRunning] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(['ceo', 'cfo', 'cmo', 'coo', 'cto']);
  const [followUpInput, setFollowUpInput] = useState('');
  const [meetingError, setMeetingError] = useState<string | null>(null);

  // Modals & Uploads
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [mappingModalDoc, setMappingModalDoc] = useState<any | null>(null);
  const [mappingPreviewData, setMappingPreviewData] = useState<any | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewPdfText, setPreviewPdfText] = useState<{ title: string; text: string } | null>(null);

  const transcriptBottomRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [healthData, bList] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getBusinesses().catch(() => [])
      ]);
      setHealth(healthData);
      setBusinesses(bList);

      if (bList.length > 0) {
        await switchWorkspace(bList[0]);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (b: Business) => {
    setCurrentBusiness(b);
    try {
      const [m, docs, txs, meets, tList] = await Promise.all([
        api.getMetrics(b.id).catch(() => null),
        api.getDocuments(b.id).catch(() => []),
        api.getTransactions(b.id).catch(() => []),
        api.getMeetings(b.id).catch(() => []),
        api.getTasks(b.id).catch(() => [])
      ]);
      setMetrics(m);
      setDocuments(docs);
      setTransactions(txs);
      setMeetings(meets);
      setTasks(tList);

      // If business has existing meetings, select the most recent one for boardroom review
      if (meets.length > 0) {
        setActiveMeeting(meets[0]);
        setStreamingMessages(meets[0].messages || []);
        setCurrentStage(meets[0].status === 'completed' ? 'completed' : 'clarification');
      } else {
        setActiveMeeting(null);
        setStreamingMessages([]);
      }
    } catch (err) {
      console.error('Failed to switch workspace data:', err);
    }
  };

  // Auto-scroll transcript when new contributions arrive
  useEffect(() => {
    if (isMeetingRunning) {
      transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingMessages, activeSpeaker]);

  // Handle Boardroom Meeting SSE Execution
  const startMeeting = async (questionToAsk: string) => {
    if (!currentBusiness || !questionToAsk.trim()) return;
    setMeetingError(null);
    setIsMeetingRunning(true);
    setStreamingMessages([]);
    setCurrentStage('clarification');
    setActiveSpeaker('ceo');

    try {
      const newMeeting = await api.createMeeting(currentBusiness.id, questionToAsk.trim(), selectedParticipants);
      setActiveMeeting(newMeeting);
      setMeetings(prev => [newMeeting, ...prev]);

      // Connect to SSE stream
      connectMeetingStream(newMeeting.id);
    } catch (err: any) {
      setMeetingError(err.message || 'Failed to initialize boardroom meeting.');
      setIsMeetingRunning(false);
    }
  };

  const connectMeetingStream = (meetingId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/meetings/${meetingId}/events`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('stage_start', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        setCurrentStage(payload.stage);
        if (payload.stage === 'clarification' || payload.stage === 'ceo_synthesis') {
          setActiveSpeaker('ceo');
        }
      } catch (err) {}
    });

    es.addEventListener('message', (e: any) => {
      try {
        const payload: MeetingMessage = JSON.parse(e.data);
        setActiveSpeaker(payload.executive);
        setStreamingMessages(prev => {
          return [...prev, payload];
        });
      } catch (err) {}
    });

    es.addEventListener('complete', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        setCurrentStage('completed');
        setActiveSpeaker(null);
        setIsMeetingRunning(false);
        es.close();

        // Refresh meeting data and tasks
        if (currentBusiness) {
          api.getMeeting(meetingId).then(m => {
            setActiveMeeting(m);
            setMeetings(prev => prev.map(item => item.id === m.id ? m : item));
          });
          api.getTasks(currentBusiness.id).then(setTasks);
        }
      } catch (err) {}
    });

    es.addEventListener('error', (e: any) => {
      console.error('SSE Error:', e);
      setIsMeetingRunning(false);
      setActiveSpeaker(null);
      es.close();
    });
  };

  const cancelActiveMeeting = async () => {
    if (!activeMeeting) return;
    try {
      await api.cancelMeeting(activeMeeting.id);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsMeetingRunning(false);
      setActiveSpeaker(null);
      const updated = await api.getMeeting(activeMeeting.id);
      setActiveMeeting(updated);
    } catch (err: any) {
      setMeetingError(err.message);
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting || !followUpInput.trim()) return;
    const q = followUpInput.trim();
    setFollowUpInput('');
    await startMeeting(q);
  };

  // Preset Scenario Questions
  const getSuggestedQuestions = () => {
    if (!currentBusiness) return [];
    if (currentBusiness.name.includes('Apex')) {
      return [
        'How should we address the 4-month margin decline caused by surging ad CAC and supplier MOQ hikes?',
        'Should we pause unprofitable retargeting ads and renegotiate component supplier terms immediately?',
        'What pricing adjustments or product bundling can restore our operating result to above 15%?'
      ];
    } else if (currentBusiness.name.includes('Nova')) {
      return [
        'Should we allocate 3 of our 6 developers to launch the AI predictive forecasting add-on this quarter?',
        'What are the unit economics and AWS cloud infrastructure cost risks of launching the enterprise tier now?',
        'How do we validate demand for the new module before committing engineering bandwidth?'
      ];
    } else if (currentBusiness.name.includes('Lumina')) {
      return [
        'Should we allocate our $150k expansion budget to 2 new retail store leases or scale national DTC e-commerce?',
        'What are the working capital and inventory lock-up trade-offs between physical stores vs digital channels?',
        'How does each executive evaluate the downside risk if retail foot-traffic underperforms projections?'
      ];
    }
    return [
      'What are our top 3 strategic priorities to accelerate revenue growth while protecting cash runway?',
      'How should we restructure operating expenses to improve net operating margin by 5%?',
      'Is our current technology stack and operational team equipped to handle a 50% increase in volume?'
    ];
  };

  // Seed sample businesses helper
  const handleSeedSamples = async () => {
    try {
      setLoading(true);
      await api.seedSamples();
      const bList = await api.getBusinesses();
      setBusinesses(bList);
      if (bList.length > 0) {
        await switchWorkspace(bList[0]);
      }
    } catch (err) {
      console.error('Failed to seed samples:', err);
    } finally {
      setLoading(false);
    }
  };

  // Document Upload & Preview
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentBusiness) return;

    try {
      setUploadLoading(true);
      const uploadedDoc = await api.uploadDocument(currentBusiness.id, file);
      setDocuments(prev => [uploadedDoc, ...prev]);

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        const preview = await api.previewDocument(currentBusiness.id, uploadedDoc.id);
        setMappingModalDoc(uploadedDoc);
        setMappingPreviewData(preview);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async (mapping: any) => {
    if (!currentBusiness || !mappingModalDoc) return;
    const res = await api.importTransactions(currentBusiness.id, mappingModalDoc.id, mapping);
    alert(`Successfully imported ${res.imported_count} transactions (${res.skipped_count} skipped/duplicates).`);
    const [m, txs] = await Promise.all([
      api.getMetrics(currentBusiness.id),
      api.getTransactions(currentBusiness.id)
    ]);
    setMetrics(m);
    setTransactions(txs);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Sparkles className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <h2 className="text-lg font-bold">Initializing Executive Boardroom...</h2>
        <p className="text-xs text-slate-500 mt-1">Checking database schema and Gemini agent adapters</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Workspace Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  AI Boardroom
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    Gemini 2.5
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400">Virtual Executive Advisory Committee</p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            {/* Workspace Dropdown */}
            <div className="relative flex items-center gap-2">
              <select
                value={currentBusiness?.id || ''}
                onChange={(e) => {
                  const b = businesses.find(item => item.id === e.target.value);
                  if (b) switchWorkspace(b);
                }}
                className="text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-semibold focus:outline-none focus:border-blue-500 max-w-[220px] truncate"
              >
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_sample ? '(Demo)' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsWorkspaceModalOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                title="Create Workspace"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-3">
            {/* Simulation vs Live Indicator */}
            {health?.gemini_live ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Gemini Connected
              </div>
            ) : (
              <div
                title="No GEMINI_API_KEY detected in .env. Running in transparent offline simulation mode with verified realistic scenarios."
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60 cursor-help"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Offline Simulation Mode
              </div>
            )}

            <button
              onClick={handleSeedSamples}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition"
              title="Reset sample workspaces"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Demos</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'boardroom', label: 'Boardroom Meeting', icon: Users, badge: isMeetingRunning ? 'Live' : null },
            { id: 'data', label: 'Data Ingestion', icon: BarChart3 },
            { id: 'meetings', label: 'Meeting History', icon: FileText, count: meetings.length },
            { id: 'tasks', label: 'Action Items', icon: CheckSquare, count: tasks.filter(t => t.status !== 'done').length },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white animate-pulse">
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Simulation Banner Notice (Honesty constraint) */}
      {!health?.gemini_live && (
        <div className="bg-amber-950/30 border-b border-amber-800/40 px-4 py-2 text-center text-xs text-amber-300/90 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <b>Demo Mode Notice:</b> Running with offline simulated debate models. All financial numbers and calculations reflect real Pandas imports. To enable live Gemini calls, add <code>GEMINI_API_KEY</code> to <code>.env</code>.
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* ========================================================
            TAB 1: OVERVIEW
            ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Business Profile Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-slate-100">{currentBusiness?.name}</h2>
                    {currentBusiness?.is_sample === 1 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-950 text-blue-300 border border-blue-800">
                        Sample Workspace
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    <b>Industry:</b> {currentBusiness?.industry} | <b>Location:</b> {currentBusiness?.location || 'Unspecified'} | <b>Currency:</b> {currentBusiness?.currency}
                  </p>
                  <p className="text-xs text-slate-300 mt-2 max-w-3xl leading-relaxed">
                    {currentBusiness?.description}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('boardroom')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition shrink-0"
                >
                  <Users className="w-4 h-4" />
                  Convene Boardroom
                </button>
              </div>

              {/* Goals & Constraints */}
              {(currentBusiness?.goals || currentBusiness?.constraints) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800/80 text-xs">
                  {currentBusiness.goals && (
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
                      <p className="font-semibold text-slate-400 text-[11px]">Primary Goals</p>
                      <p className="text-slate-300 mt-1">{currentBusiness.goals}</p>
                    </div>
                  )}
                  {currentBusiness.constraints && (
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
                      <p className="font-semibold text-slate-400 text-[11px]">Operating Constraints</p>
                      <p className="text-slate-300 mt-1">{currentBusiness.constraints}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Financial Intelligence Dashboard */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    Financial Intelligence (Deterministic Ledger)
                  </h3>
                  <p className="text-xs text-slate-400">Accurate metrics computed via Python & Pandas</p>
                </div>

                <button
                  onClick={() => setActiveTab('data')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  Upload New Data <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <FinancialCharts metrics={metrics} currency={currentBusiness?.currency || 'USD'} />
            </div>

            {/* Recent Meeting Decisions & Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latest Boardroom Decision */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 mb-2">Latest Executive Recommendation</h4>
                  {meetings.length > 0 && meetings[0].recommendations?.length > 0 ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/50">
                        <p className="text-xs font-bold text-blue-200">{meetings[0].recommendations[0].title}</p>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {meetings[0].recommendations[0].rationale}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                        <span>Meeting: &quot;{meetings[0].question.slice(0, 45)}...&quot;</span>
                        <button
                          onClick={() => {
                            setActiveMeeting(meetings[0]);
                            setStreamingMessages(meetings[0].messages || []);
                            setActiveTab('boardroom');
                          }}
                          className="text-blue-400 hover:underline"
                        >
                          Review Transcript
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      No meeting recommendations recorded yet. Convene a boardroom session to generate decisions.
                    </p>
                  )}
                </div>
              </div>

              {/* Task Completion Snapshot */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-200">Action Items Status</h4>
                  <button onClick={() => setActiveTab('tasks')} className="text-xs text-blue-400 hover:underline">
                    View All ({tasks.length})
                  </button>
                </div>
                {tasks.length > 0 ? (
                  <div className="space-y-2.5">
                    {tasks.slice(0, 4).map(t => (
                      <div key={t.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center gap-2 truncate max-w-[70%]">
                          <span className={`w-2 h-2 rounded-full ${t.status === 'done' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <span className={`truncate ${t.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium">{t.owner}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No active tasks. Boardroom meetings automatically prioritize actionable follow-ups.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: BOARDROOM (LIVE MEETING & DEBATE)
            ======================================================== */}
        {activeTab === 'boardroom' && (
          <div className="space-y-6">
            {/* Five Executive Persona Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Executive Committee (5 Gemini Specialists)
                </h3>
                <span className="text-xs text-slate-500">
                  Select participants or let CEO auto-moderate
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {(['ceo', 'cfo', 'cmo', 'coo', 'cto'] as const).map(id => (
                  <ExecutiveCard
                    key={id}
                    id={id}
                    isSpeaking={activeSpeaker === id}
                    hasSpoken={streamingMessages.some(m => m.executive === id)}
                    isSelected={selectedParticipants.includes(id)}
                    selectable={!isMeetingRunning}
                    onToggleSelect={() => {
                      if (selectedParticipants.includes(id)) {
                        setSelectedParticipants(selectedParticipants.filter(p => p !== id));
                      } else {
                        setSelectedParticipants([...selectedParticipants, id]);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Strategic Question Form */}
            {!isMeetingRunning && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Ask a Strategic Business Question</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your executive team will investigate, debate trade-offs with factual evidence, and deliver a consolidated decision.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="e.g. How should we address our profit decline given rising customer acquisition costs?"
                    value={questionInput}
                    onChange={e => setQuestionInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') startMeeting(questionInput);
                    }}
                    className="flex-1 text-sm bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => startMeeting(questionInput)}
                    disabled={!questionInput.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    Convene Meeting
                  </button>
                </div>

                {/* Suggested Questions for Demo */}
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 mb-2">Preset Scenario Questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {getSuggestedQuestions().map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuestionInput(q);
                          startMeeting(q);
                        }}
                        className="text-left text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg transition"
                      >
                        &quot;{q}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stage Progress Bar */}
            {(isMeetingRunning || activeMeeting) && (
              <StageProgress
                currentStage={currentStage}
                isComplete={currentStage === 'completed'}
                isFailed={activeMeeting?.status === 'failed'}
              />
            )}

            {/* Meeting Header & PDF Export Controls */}
            {activeMeeting && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Active Boardroom Question</span>
                  <h3 className="text-sm font-bold text-slate-100 mt-0.5">&quot;{activeMeeting.question}&quot;</h3>
                </div>

                <div className="flex items-center gap-2">
                  {isMeetingRunning ? (
                    <button
                      onClick={cancelActiveMeeting}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800/80 hover:bg-rose-900 transition"
                    >
                      Cancel Meeting
                    </button>
                  ) : (
                    <a
                      href={api.getReportPdfUrl(activeMeeting.id)}
                      download
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export PDF Report
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Live Debate Transcript Stream */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4 min-h-[350px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Executive Contributions & Debate Transcript
                </h4>
                {isMeetingRunning && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Boardroom in Session...
                  </span>
                )}
              </div>

              {streamingMessages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  Enter a strategic question above to initiate the boardroom investigation.
                </div>
              ) : (
                <div className="space-y-4">
                  {streamingMessages.map((msg, index) => {
                    const exec = EXECUTIVES[msg.executive] || EXECUTIVES.ceo;
                    return (
                      <div
                        key={index}
                        className={`rounded-xl border p-4 transition-all ${
                          msg.executive === 'ceo'
                            ? 'bg-slate-900 border-indigo-900/50'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        {/* Message Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">{exec.title}</span>
                            <span className="text-[10px] text-slate-400">({exec.name})</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                              {msg.stage.replace('_', ' ')}
                            </span>
                            {msg.is_simulated && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                                Simulated Model
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line space-y-2">
                          {msg.content}
                        </div>

                        {/* Structured Evidence / Assumptions / Risks Drawers */}
                        {(msg.evidence_refs?.length || msg.assumptions?.length || msg.risks?.length || msg.dissent?.length) && (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 text-[11px]">
                            {msg.evidence_refs && msg.evidence_refs.length > 0 && (
                              <span className="px-2 py-1 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300">
                                <b>Evidence:</b> {msg.evidence_refs.map((e: any) => e.data_point || e.description).join('; ')}
                              </span>
                            )}
                            {msg.assumptions && msg.assumptions.length > 0 && (
                              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                                <b>Assumptions:</b> {msg.assumptions.join(' | ')}
                              </span>
                            )}
                            {msg.risks && msg.risks.length > 0 && (
                              <span className="px-2 py-1 rounded bg-rose-950/50 border border-rose-800/50 text-rose-300">
                                <b>Risks:</b> {msg.risks.join(' | ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={transcriptBottomRef} />
                </div>
              )}
            </div>

            {/* Follow-up Question Form */}
            {activeMeeting && activeMeeting.status === 'completed' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-300 mb-2">Ask a Follow-up Question</h4>
                <form onSubmit={handleFollowUp} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask follow-up referencing this meeting's decision..."
                    value={followUpInput}
                    onChange={e => setFollowUpInput(e.target.value)}
                    className="flex-1 text-xs bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!followUpInput.trim() || isMeetingRunning}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                  >
                    Ask Boardroom
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: DATA INGESTION
            ======================================================== */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            {/* Ingestion Overview */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                    Data Ingestion & Grounding Sources
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Import transactions from CSV or Excel to compute deterministic KPIs. Upload PDFs to extract text and enable page-grounded document citations.
                  </p>
                </div>

                {/* Upload Button */}
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg shadow-blue-500/20 transition">
                  <Plus className="w-4 h-4" />
                  <span>{uploadLoading ? 'Uploading...' : 'Upload File (CSV, XLSX, PDF)'}</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploadLoading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Document Library */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-200">Uploaded Documents ({documents.length})</h4>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  No documents uploaded yet. Add sample documents from sample_data/ or upload your own files.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documents.map(doc => {
                    const isTabular = doc.original_name.endsWith('.csv') || doc.original_name.endsWith('.xlsx') || doc.original_name.endsWith('.xls');
                    return (
                      <div key={doc.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200 truncate">{doc.original_name}</span>
                            <button
                              onClick={async () => {
                                if (confirm('Delete document?')) {
                                  await api.deleteDocument(currentBusiness!.id, doc.id);
                                  setDocuments(documents.filter(d => d.id !== doc.id));
                                }
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {doc.page_count > 0 ? `${doc.page_count} pages extracted` : 'Tabular dataset'} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          {isTabular ? (
                            <button
                              onClick={async () => {
                                const preview = await api.previewDocument(currentBusiness!.id, doc.id);
                                setMappingModalDoc(doc);
                                setMappingPreviewData(preview);
                              }}
                              className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
                            >
                              Map & Import
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const preview = await api.previewDocument(currentBusiness!.id, doc.id);
                                setPreviewPdfText({ title: doc.original_name, text: preview.text_excerpt });
                              }}
                              className="text-xs font-semibold text-blue-400 hover:underline"
                            >
                              View Text Citations
                            </button>
                          )}
                          <span className="text-[10px] text-emerald-400 font-medium">Ready</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ingested Transactions Ledger */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">
                    Ingested Transactions ({transactions.length})
                  </h4>
                  <p className="text-xs text-slate-400">
                    Validated records powering deterministic financial calculations
                  </p>
                </div>

                {transactions.length > 0 && (
                  <button
                    onClick={async () => {
                      if (confirm('Clear all ingested transactions for this workspace?')) {
                        await api.clearTransactions(currentBusiness!.id);
                        setTransactions([]);
                        const m = await api.getMetrics(currentBusiness!.id);
                        setMetrics(m);
                      }
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Clear Ledger
                  </button>
                )}
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  No transactions imported yet. Click &quot;Map &amp; Import&quot; on an uploaded CSV/Excel file above.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-96">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Kind</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {transactions.slice(0, 100).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/30">
                          <td className="p-3 whitespace-nowrap">{t.date}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.kind === 'revenue' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                              {t.kind}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap font-medium text-slate-200">{t.category}</td>
                          <td className="p-3 whitespace-nowrap text-right font-bold">
                            {t.currency} {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-slate-400 truncate max-w-xs">{t.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: MEETINGS (ARCHIVE & HISTORY)
            ======================================================== */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-slate-100">Boardroom Meeting History</h3>
              <p className="text-xs text-slate-400 mt-1">
                Browse and reopen full transcripts, executive debate logs, minority dissents, and PDF reports.
              </p>
            </div>

            {meetings.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No meetings held yet in this workspace. Go to the Boardroom tab to convene your first meeting.
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div
                    key={m.id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.status === 'completed' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'}`}>
                          {m.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(m.started_at).toLocaleDateString()} at {new Date(m.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">&quot;{m.question}&quot;</h4>
                      <p className="text-xs text-slate-400">
                        {m.messages?.length || 0} executive contributions • Model: {m.model_used || 'Standard Engine'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <a
                        href={api.getReportPdfUrl(m.id)}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </a>

                      <button
                        onClick={() => {
                          setActiveMeeting(m);
                          setStreamingMessages(m.messages || []);
                          setCurrentStage(m.status === 'completed' ? 'completed' : 'clarification');
                          setActiveTab('boardroom');
                        }}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition"
                      >
                        Reopen Transcript
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 5: TASKS (ACTION ITEMS)
            ======================================================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-slate-100">Prioritized Action Items</h3>
              <p className="text-xs text-slate-400 mt-1">
                Manage execution deliverables synthesized from boardroom executive decisions.
              </p>
            </div>

            <TaskBoard
              tasks={tasks}
              onUpdateStatus={async (taskId, status) => {
                await api.updateTask(taskId, { status });
                setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
              }}
              onCreateTask={async (taskData) => {
                if (!currentBusiness) return;
                const newTask = await api.createTask(currentBusiness.id, taskData);
                setTasks([newTask, ...tasks]);
              }}
              onDeleteTask={async (taskId) => {
                await api.deleteTask(taskId);
                setTasks(tasks.filter(t => t.id !== taskId));
              }}
            />
          </div>
        )}

        {/* ========================================================
            TAB 6: SETTINGS
            ======================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            {/* System Diagnostics */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-100">System Diagnostics & AI Backend</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-slate-400 font-medium">Gemini GenAI SDK Status</p>
                  <p className={`font-bold mt-1 ${health?.gemini_live ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {health?.gemini_live ? 'Live Inference Ready' : 'Offline Simulation Mode (No Key)'}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-slate-400 font-medium">Configured Gemini Model</p>
                  <p className="font-bold text-slate-200 mt-1">{health?.configured_model || 'gemini-2.5-flash'}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-slate-400 font-medium">API Key Configured</p>
                  <p className={`font-bold mt-1 ${health?.api_key_configured ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {health?.api_key_configured ? 'Yes (Stored Server-Side Only)' : 'Not Set in .env'}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-slate-400 font-medium">Local SQLite Database</p>
                  <p className="font-bold text-slate-200 mt-1">{health?.database || 'boardroom.db'}</p>
                </div>
              </div>
            </div>

            {/* Manage Workspace Details */}
            {currentBusiness && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-100">Workspace Details</h3>
                  <button
                    onClick={() => setIsWorkspaceModalOpen(true)}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Edit Workspace
                  </button>
                </div>
                <div className="text-xs space-y-2 text-slate-300">
                  <p><b>Name:</b> {currentBusiness.name}</p>
                  <p><b>Industry:</b> {currentBusiness.industry}</p>
                  <p><b>Currency:</b> {currentBusiness.currency}</p>
                  <p><b>Description:</b> {currentBusiness.description}</p>
                  <p><b>Created:</b> {new Date(currentBusiness.created_at).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* PDF Text Excerpt Modal */}
      {previewPdfText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-100">Document Citations: {previewPdfText.title}</h3>
              <button onClick={() => setPreviewPdfText(null)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800">
              {previewPdfText.text}
            </div>
          </div>
        </div>
      )}

      {/* Column Mapping Modal */}
      {mappingModalDoc && mappingPreviewData && (
        <ColumnMappingModal
          isOpen={true}
          onClose={() => {
            setMappingModalDoc(null);
            setMappingPreviewData(null);
          }}
          documentId={mappingModalDoc.id}
          documentName={mappingModalDoc.original_name}
          previewData={mappingPreviewData}
          onConfirmImport={handleConfirmImport}
        />
      )}

      {/* Create / Edit Workspace Modal */}
      <NewWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSave={async (data) => {
          const newB = await api.createBusiness(data);
          const bList = await api.getBusinesses();
          setBusinesses(bList);
          await switchWorkspace(newB);
        }}
      />
    </div>
  );
}
