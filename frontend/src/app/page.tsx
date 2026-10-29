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
  Shield,
  FileSpreadsheet,
  ArrowRight,
  IndianRupee,
  TrendingUp,
  Cpu,
  Wrench,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle
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
  SystemHealth,
  MarketResearch
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
  const [marketResearch, setMarketResearch] = useState<MarketResearch | null>(null);
  const [guardrailError, setGuardrailError] = useState<string | null>(null);

  // Modals & Uploads
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [mappingModalDoc, setMappingModalDoc] = useState<DocumentItem | null>(null);
  const [mappingPreviewData, setMappingPreviewData] = useState<{
    columns: string[];
    total_rows: number;
    preview_rows: Record<string, unknown>[];
    suggested_mapping: {
      date_col: string;
      amount_col: string;
      category_col: string;
      kind_col?: string | null;
      default_kind?: string;
    };
  } | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewPdfText, setPreviewPdfText] = useState<{ title: string; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(true);

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
    setGuardrailError(null);
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

      if (meets.length > 0) {
        const firstMeet = meets[0];
        setActiveMeeting(firstMeet);
        setStreamingMessages(firstMeet.messages || []);
        setCurrentStage(firstMeet.status === 'completed' ? 'completed' : 'clarification');

        if (firstMeet.market_research_json) {
          try {
            setMarketResearch(JSON.parse(firstMeet.market_research_json));
          } catch {
            setMarketResearch(null);
          }
        } else {
          setMarketResearch(null);
        }
      } else {
        setActiveMeeting(null);
        setStreamingMessages([]);
        setMarketResearch(null);
      }
    } catch (err) {
      console.error('Failed to switch workspace data:', err);
    }
  };

  useEffect(() => {
    if (isMeetingRunning) {
      transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingMessages, activeSpeaker, isMeetingRunning]);

  const startMeeting = async (questionToAsk: string) => {
    if (!currentBusiness || !questionToAsk.trim()) return;
    setGuardrailError(null);
    setIsMeetingRunning(true);
    setStreamingMessages([]);
    setMarketResearch(null);
    setCurrentStage('clarification');
    setActiveSpeaker('ceo');

    try {
      const newMeeting = await api.createMeeting(currentBusiness.id, questionToAsk.trim(), selectedParticipants);
      setActiveMeeting(newMeeting);
      setMeetings(prev => [newMeeting, ...prev]);

      if (newMeeting.market_research_json) {
        try {
          setMarketResearch(JSON.parse(newMeeting.market_research_json));
        } catch {}
      }

      connectMeetingStream(newMeeting.id);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize boardroom meeting.';
      setGuardrailError(errorMsg);
      setIsMeetingRunning(false);
      setActiveSpeaker(null);
    }
  };

  const connectMeetingStream = (meetingId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/meetings/${meetingId}/events`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('market_research', (e: MessageEvent) => {
      try {
        const payload: MarketResearch = JSON.parse(e.data);
        setMarketResearch(payload);
      } catch {}
    });

    es.addEventListener('stage_start', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setCurrentStage(payload.stage);
        if (payload.stage === 'clarification' || payload.stage === 'ceo_synthesis') {
          setActiveSpeaker('ceo');
        }
      } catch {}
    });

    es.addEventListener('message', (e: MessageEvent) => {
      try {
        const payload: MeetingMessage = JSON.parse(e.data);
        setActiveSpeaker(payload.executive);
        setStreamingMessages(prev => [...prev, payload]);
      } catch {}
    });

    es.addEventListener('complete', () => {
      try {
        setCurrentStage('completed');
        setActiveSpeaker(null);
        setIsMeetingRunning(false);
        es.close();

        if (currentBusiness) {
          api.getMeeting(meetingId).then(m => {
            setActiveMeeting(m);
            if (m.market_research_json) {
              try {
                setMarketResearch(JSON.parse(m.market_research_json));
              } catch {}
            }
            setMeetings(prev => prev.map(item => item.id === m.id ? m : item));
          });
          api.getTasks(currentBusiness.id).then(setTasks);
        }
      } catch {}
    });

    es.addEventListener('error', () => {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error canceling meeting.';
      alert(msg);
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting || !followUpInput.trim()) return;
    const q = followUpInput.trim();
    setFollowUpInput('');
    await startMeeting(q);
  };

  const getSuggestedQuestions = () => {
    if (!currentBusiness) return [];
    if (currentBusiness.name.includes('Apex')) {
      return [
        'How should we address our 4-month margin decline caused by surging ad CAC and supplier MOQ hikes?',
        'Should we halt unprofitable Meta retargeting ads and renegotiate component supplier terms in Bengaluru?',
        'What product bundling can restore our net operating result above 15% in the Indian market?'
      ];
    } else if (currentBusiness.name.includes('Nova')) {
      return [
        'Should we allocate 3 of our 6 developers to launch the AI predictive forecasting add-on in INR?',
        'What are the unit economics and AWS cloud hosting cost risks for our Pune development team?',
        'How do we validate Indian enterprise customer willingness-to-pay before writing custom code?'
      ];
    } else if (currentBusiness.name.includes('Lumina')) {
      return [
        'Should we allocate our ₹15 Lakh expansion capital to 2 new retail store leases or scale national D2C e-commerce?',
        'What are the working capital and inventory lock-up trade-offs between Mumbai retail stores vs online shipping?',
        'What is each executive\'s evaluation of downside risk if foot-traffic lags projections in secondary metros?'
      ];
    }
    return [
      'What are our top 3 strategic priorities to accelerate revenue growth while protecting cash runway in ₹ INR?',
      'How should we restructure operating expenses to improve net operating margin by 5%?',
      'Is our current operational capacity equipped to handle a 50% increase in Indian volume?'
    ];
  };

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      alert(msg);
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async (mapping: Record<string, unknown>) => {
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center animate-spin mb-4 shadow-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Initializing Boardroom...</h2>
        <p className="text-xs text-slate-500 mt-1">Auditing Indian Rupee (₹) Ledgers & Live Strategy Models</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Header - Minimal & Sleek */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Workspace Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Shield className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  AI Boardroom
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    ₹ INR
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500">Executive Advisory & Market Intelligence</p>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1" />

            {/* Workspace Dropdown */}
            <div className="relative flex items-center gap-1.5">
              <select
                value={currentBusiness?.id || ''}
                onChange={(e) => {
                  const b = businesses.find(item => item.id === e.target.value);
                  if (b) switchWorkspace(b);
                }}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[200px] truncate transition"
              >
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_sample ? '(Demo ₹)' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsWorkspaceModalOpen(true)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                title="Create Workspace"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-2.5">
            {health?.gemini_live ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Gemini 3.8
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Simulation
              </div>
            )}

            {health?.tavily_live ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <Globe className="w-3 h-3 text-blue-600" />
                Tavily Live
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <Globe className="w-3 h-3 text-slate-400" />
                Domain Benchmarks
              </div>
            )}

            <button
              onClick={handleSeedSamples}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm transition"
              title="Reset sample workspaces"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span className="hidden md:inline">Reset Demos</span>
            </button>
          </div>
        </div>

        {/* Minimal Pill Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'boardroom', label: 'Boardroom Debate', icon: Users, badge: isMeetingRunning ? 'LIVE' : null },
            { id: 'data', label: 'Data Ingestion (₹)', icon: BarChart3 },
            { id: 'meetings', label: 'Meeting Archive', icon: FileText, count: meetings.length },
            { id: 'tasks', label: 'Action Deliverables', icon: CheckSquare, count: tasks.filter(t => t.status !== 'done').length },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'boardroom' | 'data' | 'meetings' | 'tasks' | 'settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white font-medium shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-normal'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white animate-pulse">
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* ========================================================
            TAB 1: OVERVIEW
            ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Business Header Card */}
            {currentBusiness && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{currentBusiness.name}</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {currentBusiness.industry}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {currentBusiness.location || 'India'} (₹ INR)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">{currentBusiness.description}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('boardroom')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                  >
                    <span>Convene Boardroom</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Goals & Constraints */}
                {(currentBusiness.goals || currentBusiness.constraints) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {currentBusiness.goals && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <span className="font-semibold text-slate-700 block mb-1">Strategic Objective:</span>
                        <span className="text-slate-600">{currentBusiness.goals}</span>
                      </div>
                    )}
                    {currentBusiness.constraints && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <span className="font-semibold text-slate-700 block mb-1">Operating Guardrails:</span>
                        <span className="text-slate-600">{currentBusiness.constraints}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quick-Start 4 Step Guide */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    How The Executive Boardroom Operates
                  </h3>
                </div>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 transition"
                >
                  {showGuide ? 'Hide Guide ▲' : 'Show Guide ▼'}
                </button>
              </div>

              {showGuide && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Step 1</span>
                    <h4 className="text-xs font-semibold text-slate-900 mb-1">Ingest Financials (₹)</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Upload your transaction ledgers in CSV/Excel. Deterministic Pandas computes revenue, runway, and cash burn in ₹ INR.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Step 2</span>
                    <h4 className="text-xs font-semibold text-slate-900 mb-1">Live Market Intelligence</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Tavily Search queries live web benchmarks, market trends, and competitor dynamics grounded to your sector.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Step 3</span>
                    <h4 className="text-xs font-semibold text-slate-900 mb-1">Executive Cross-Examination</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      5 specialized C-suite personas debate tradeoffs, challenge assumptions, and air minority dissents.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Step 4</span>
                    <h4 className="text-xs font-semibold text-slate-900 mb-1">Synthesis & PDF Export</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      CEO synthesizes a final decision matrix, prioritized deliverables, and a downloadable executive PDF report.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Ingested Financial Health Charts */}
            <FinancialCharts metrics={metrics} currency={currentBusiness?.currency || 'INR'} />
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
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  Executive Board Committee
                </h3>
                <span className="text-xs text-slate-500">
                  Select specialists to convene or include all 5
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

            {/* Guardrail Violation Alert */}
            {guardrailError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 flex items-start gap-3 shadow-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-rose-900">Executive Guardrail Refusal</p>
                  <p className="text-rose-700 leading-relaxed">{guardrailError}</p>
                  <p className="text-[11px] text-rose-500 mt-1">
                    Please submit questions strictly focused on business strategy, financial runway, marketing CAC/LTV, operations, or technology execution.
                  </p>
                </div>
              </div>
            )}

            {/* Strategic Question Form */}
            {!isMeetingRunning && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Convene Boardroom Session</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter a strategic question to trigger live Tavily market intelligence, multi-perspective debate, and CEO synthesis.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="e.g. How should we address our profit decline given rising customer acquisition costs in India?"
                    value={questionInput}
                    onChange={e => setQuestionInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') startMeeting(questionInput);
                    }}
                    className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <button
                    onClick={() => startMeeting(questionInput)}
                    disabled={!questionInput.trim()}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Convene Boardroom
                  </button>
                </div>

                {/* Preset Scenario Questions Cards */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Suggested strategic scenarios for {currentBusiness?.name}:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {getSuggestedQuestions().map((q, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setQuestionInput(q);
                          startMeeting(q);
                        }}
                        className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-lg p-3 flex flex-col justify-between shadow-xs hover:shadow-sm transition cursor-pointer group"
                      >
                        <p className="text-xs text-slate-700 group-hover:text-slate-900 leading-relaxed">&quot;{q}&quot;</p>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-medium text-indigo-600">
                          <span>Convene meeting</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
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
              />
            )}

            {/* Meeting Header & Export */}
            {activeMeeting && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active Boardroom Agenda</span>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5">&quot;{activeMeeting.question}&quot;</h3>
                </div>

                <div className="flex items-center gap-2">
                  {isMeetingRunning ? (
                    <button
                      onClick={cancelActiveMeeting}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
                    >
                      Cancel Meeting
                    </button>
                  ) : (
                    <a
                      href={api.getReportPdfUrl(activeMeeting.id)}
                      download
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export PDF Report (₹)
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Live Tavily Market Research Display */}
            {marketResearch && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                      Live Market Intelligence & Competitive Benchmarks (Tavily Search)
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                    marketResearch.is_live
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {marketResearch.is_live ? 'Live Tavily Web Stream' : 'Domain Benchmark Corpus'}
                  </span>
                </div>

                {marketResearch.summary && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <strong className="text-slate-800 font-medium">Market Overview: </strong>
                    {marketResearch.summary}
                  </p>
                )}

                {marketResearch.sources && marketResearch.sources.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Extracted Real-World Sources & Strategy Benchmarks:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {marketResearch.sources.map((src, sIdx) => {
                        let hostname = '';
                        try {
                          hostname = new URL(src.url).hostname.replace('www.', '');
                        } catch {
                          hostname = src.url;
                        }

                        return (
                          <div key={sIdx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 truncate">
                                  {hostname}
                                </span>
                                <span className="text-[10px] font-semibold text-indigo-600">
                                  {(src.score * 100).toFixed(0)}% match
                                </span>
                              </div>
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-slate-900 hover:text-indigo-600 flex items-center gap-1 leading-snug line-clamp-1 transition"
                              >
                                {src.title || 'Market Intelligence Reference'}
                                <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                              </a>
                              <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                {src.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Debate Transcript Stream */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm min-h-[350px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Executive Deliberation Transcript
                </h4>
                {isMeetingRunning && (
                  <span className="flex items-center gap-1.5 text-xs text-indigo-700 font-medium bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    Deliberating...
                  </span>
                )}
              </div>

              {streamingMessages.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Enter a strategic business question above to convene your executive committee.
                </div>
              ) : (
                <div className="space-y-3">
                  {streamingMessages.map((msg, index) => {
                    const exec = EXECUTIVES[msg.executive] || EXECUTIVES.ceo;
                    return (
                      <div
                        key={index}
                        className={`rounded-xl border p-4 transition-all shadow-xs ${
                          msg.executive === 'ceo'
                            ? 'bg-purple-50/30 border-purple-100'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Executive Avatar Box */}
                          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${exec.avatarBg}`}>
                            {msg.executive === 'ceo' && <Shield className="w-4 h-4" />}
                            {msg.executive === 'cfo' && <IndianRupee className="w-4 h-4" />}
                            {msg.executive === 'cmo' && <TrendingUp className="w-4 h-4" />}
                            {msg.executive === 'coo' && <Wrench className="w-4 h-4" />}
                            {msg.executive === 'cto' && <Cpu className="w-4 h-4" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">{exec.title}</span>
                                <span className="text-[11px] text-slate-500">({exec.name})</span>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                  {msg.stage.replace('_', ' ')}
                                </span>
                                {msg.is_simulated && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                    Simulated
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Content */}
                            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line space-y-2">
                              {msg.content}
                            </div>

                            {/* Structured Evidence / Assumptions / Risks Drawers */}
                            {((msg.evidence_refs?.length ?? 0) > 0 || (msg.assumptions?.length ?? 0) > 0 || (msg.risks?.length ?? 0) > 0 || (msg.dissent?.length ?? 0) > 0) && (
                              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
                                {msg.evidence_refs && msg.evidence_refs.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800">
                                    <strong>Evidence:</strong> {msg.evidence_refs.map((e: { data_point?: string; description?: string }) => e.data_point || e.description).join('; ')}
                                  </span>
                                )}
                                {msg.assumptions && msg.assumptions.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800">
                                    <strong>Assumptions:</strong> {msg.assumptions.join(' | ')}
                                  </span>
                                )}
                                {msg.risks && msg.risks.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800">
                                    <strong>Risks:</strong> {msg.risks.join(' | ')}
                                  </span>
                                )}
                                {msg.dissent && msg.dissent.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-800">
                                    <strong>Dissent:</strong> {msg.dissent.join(' | ')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={transcriptBottomRef} />
                </div>
              )}
            </div>

            {/* Follow-up Question Form */}
            {activeMeeting && activeMeeting.status === 'completed' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h4 className="text-xs font-semibold text-slate-800 mb-2 uppercase tracking-wide">Ask a Strategic Follow-up</h4>
                <form onSubmit={handleFollowUp} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask follow-up referencing this meeting's decision..."
                    value={followUpInput}
                    onChange={e => setFollowUpInput(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!followUpInput.trim() || isMeetingRunning}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
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
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                    Data Ingestion & Grounding Ledger (₹ INR)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Import transactions from CSV or Excel to compute deterministic KPIs in Indian Rupees. Upload PDFs to extract text and enable page-grounded document citations.
                  </p>
                </div>

                <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer transition">
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
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
                Uploaded Documents ({documents.length})
              </h4>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  No documents uploaded yet. Add sample documents from sample_data/ or upload your own files.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documents.map(doc => {
                    const isTabular = doc.original_name.endsWith('.csv') || doc.original_name.endsWith('.xlsx') || doc.original_name.endsWith('.xls');
                    return (
                      <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 truncate">{doc.original_name}</span>
                            <button
                              onClick={async () => {
                                if (confirm('Delete document?')) {
                                  await api.deleteDocument(currentBusiness!.id, doc.id);
                                  setDocuments(documents.filter(d => d.id !== doc.id));
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-0.5 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {doc.page_count > 0 ? `${doc.page_count} pages extracted` : 'Tabular dataset'} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                          {isTabular ? (
                            <button
                              onClick={async () => {
                                const preview = await api.previewDocument(currentBusiness!.id, doc.id);
                                setMappingModalDoc(doc);
                                setMappingPreviewData(preview);
                              }}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                            >
                              Map & Import (₹)
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const preview = await api.previewDocument(currentBusiness!.id, doc.id);
                                setPreviewPdfText({ title: doc.original_name, text: preview.text_excerpt });
                              }}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                            >
                              View Text Citations
                            </button>
                          )}
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">Ready</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ingested Transactions Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Ingested Transactions Ledger ({transactions.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Validated records in Indian Rupees (₹) powering deterministic calculations
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
                    className="text-xs text-rose-600 font-medium hover:underline"
                  >
                    Clear Ledger
                  </button>
                )}
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  No transactions imported yet. Click &quot;Map &amp; Import (₹)&quot; on an uploaded CSV file above.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Kind</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Amount (₹ INR)</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-slate-100">
                      {transactions.slice(0, 100).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-3 whitespace-nowrap text-slate-600">{t.date}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${t.kind === 'revenue' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                              {t.kind}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap font-medium text-slate-900">{t.category}</td>
                          <td className="p-3 whitespace-nowrap text-right font-medium text-slate-900">
                            ₹ {t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-slate-500 truncate max-w-xs">{t.description || '-'}</td>
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
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Boardroom Meeting Archive</h3>
              <p className="text-xs text-slate-500 mt-1">
                Browse and reopen full transcripts, executive debate logs, minority dissents, and PDF reports in ₹ INR.
              </p>
            </div>

            {meetings.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-white">
                No meetings held yet in this workspace. Go to the Boardroom Debate tab to convene your first meeting.
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 transition shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${m.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {m.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(m.started_at).toLocaleDateString()} at {new Date(m.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">&quot;{m.question}&quot;</h4>
                      <p className="text-xs text-slate-500">
                        {m.messages?.length || 0} executive contributions • Model: {m.model_used || 'Standard Engine'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <a
                        href={api.getReportPdfUrl(m.id)}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF (₹)
                      </a>

                      <button
                        onClick={() => {
                          setActiveMeeting(m);
                          setStreamingMessages(m.messages || []);
                          if (m.market_research_json) {
                            try {
                              setMarketResearch(JSON.parse(m.market_research_json));
                            } catch {
                              setMarketResearch(null);
                            }
                          } else {
                            setMarketResearch(null);
                          }
                          setCurrentStage(m.status === 'completed' ? 'completed' : 'clarification');
                          setActiveTab('boardroom');
                        }}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
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
            TAB 5: TASKS (ACTION DELIVERABLES)
            ======================================================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Prioritized Action Items & Deliverables</h3>
              <p className="text-xs text-slate-500 mt-1">
                Manage operational deliverables synthesized from boardroom executive recommendations.
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
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
                System Diagnostics & AI Engine
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <p className="text-slate-500 font-medium">Google GenAI SDK Status</p>
                  <p className={`font-semibold mt-1 text-sm ${health?.gemini_live ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {health?.gemini_live ? 'Live Inference Ready (Gemini 3.8)' : 'Offline Simulation Mode'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <p className="text-slate-500 font-medium">Market Intelligence Engine</p>
                  <p className={`font-semibold mt-1 text-sm ${health?.tavily_live ? 'text-blue-700' : 'text-slate-700'}`}>
                    {health?.tavily_live ? 'Tavily Search API Connected' : 'Domain Benchmark Corpus'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <p className="text-slate-500 font-medium">Currency Mode</p>
                  <p className="font-semibold text-slate-900 mt-1 text-sm">Indian Rupees (₹ INR)</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <p className="text-slate-500 font-medium">Local SQLite Database</p>
                  <p className="font-semibold text-slate-900 mt-1 text-sm">{health?.database || 'boardroom.db'}</p>
                </div>
              </div>
            </div>

            {/* Manage Workspace Details */}
            {currentBusiness && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Workspace Metadata</h3>
                  <button
                    onClick={() => setIsWorkspaceModalOpen(true)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Edit Workspace
                  </button>
                </div>
                <div className="text-xs space-y-2 text-slate-700">
                  <p><strong>Name:</strong> {currentBusiness.name}</p>
                  <p><strong>Industry:</strong> {currentBusiness.industry}</p>
                  <p><strong>Currency:</strong> {currentBusiness.currency} (₹)</p>
                  <p><strong>Location:</strong> {currentBusiness.location || 'India'}</p>
                  <p><strong>Description:</strong> {currentBusiness.description}</p>
                  <p><strong>Created:</strong> {new Date(currentBusiness.created_at).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* PDF Text Excerpt Modal */}
      {previewPdfText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Document Citations: {previewPdfText.title}</h3>
              <button onClick={() => setPreviewPdfText(null)} className="text-slate-400 hover:text-slate-700 font-semibold p-1">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed flex-1 bg-slate-50 p-4 rounded-lg border border-slate-200">
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
