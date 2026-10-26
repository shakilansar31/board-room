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
  Wrench
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

  useEffect(() => {
    if (isMeetingRunning) {
      transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingMessages, activeSpeaker, isMeetingRunning]);

  const startMeeting = async (questionToAsk: string) => {
    if (!currentBusiness || !questionToAsk.trim()) return;
    setIsMeetingRunning(true);
    setStreamingMessages([]);
    setCurrentStage('clarification');
    setActiveSpeaker('ceo');

    try {
      const newMeeting = await api.createMeeting(currentBusiness.id, questionToAsk.trim(), selectedParticipants);
      setActiveMeeting(newMeeting);
      setMeetings(prev => [newMeeting, ...prev]);
      connectMeetingStream(newMeeting.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize boardroom meeting.';
      alert(msg);
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
      <div className="min-h-screen bg-[#FFFDF8] flex flex-col items-center justify-center text-black">
        <div className="w-16 h-16 rounded-2xl bg-[#FFE600] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] flex items-center justify-center animate-spin mb-4">
          <Sparkles className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-tight">Initializing Boardroom...</h2>
        <p className="text-xs text-slate-700 font-bold mt-1">Loading Indian Rupee (₹) Ledgers & Gemini Executive Models</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF8] text-black flex flex-col selection:bg-[#FFE600] selection:text-black">
      {/* Top Navigation Bar - Neo-Brutalist */}
      <header className="border-b-[3px] border-black bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 py-3 flex items-center justify-between gap-4">
          {/* Logo & Workspace Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
                <Shield className="w-6 h-6 text-black stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-black flex items-center gap-2">
                  AI BOARDROOM
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#BAE6FD] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                    ₹ INR / GEMINI
                  </span>
                </h1>
                <p className="text-[10px] text-slate-700 font-black tracking-wide">VIRTUAL EXECUTIVE ADVISORY COMMITTEE</p>
              </div>
            </div>

            <div className="h-7 w-[2.5px] bg-black hidden sm:block" />

            {/* Workspace Dropdown */}
            <div className="relative flex items-center gap-2">
              <select
                value={currentBusiness?.id || ''}
                onChange={(e) => {
                  const b = businesses.find(item => item.id === e.target.value);
                  if (b) switchWorkspace(b);
                }}
                className="text-xs bg-white border-2 border-black rounded-lg px-3 py-1.5 text-black font-black focus:outline-none shadow-[2px_2px_0px_0px_#000] max-w-[220px] truncate"
              >
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_sample ? '(Demo ₹)' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsWorkspaceModalOpen(true)}
                className="p-1.5 rounded-lg text-black bg-[#A7F3D0] hover:bg-[#86EFAC] border-2 border-black shadow-[2px_2px_0px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                title="Create Workspace"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-3">
            {health?.gemini_live ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-[#86EFAC] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                Live Gemini 3.8 Connected
              </div>
            ) : (
              <div
                title="Running in transparent offline simulation mode."
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-[#FED7AA] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                Offline Mode (No Key)
              </div>
            )}

            <button
              onClick={handleSeedSamples}
              className="flex items-center gap-1.5 text-xs font-black text-black bg-white hover:bg-yellow-100 px-3 py-1.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
              title="Reset sample workspaces"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden md:inline">Reset Demos (₹)</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Neo-Brutalist Badges */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto pb-2.5 pt-1">
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
                className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-lg border-2 border-black transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-black text-[#FFE600] shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                    : 'bg-white text-black hover:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]'
                }`}
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500 text-white border border-black animate-pulse">
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border border-black ${isActive ? 'bg-[#FFE600] text-black' : 'bg-slate-200 text-black'}`}>
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
            {/* Quick Start 4-Step User Onboarding Guide */}
            <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[5px_5px_0px_0px_#000]">
              <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_0px_#000]">
                    ?
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-tight flex items-center gap-2">
                      How The AI Executive Boardroom Works
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#BAE6FD] text-black border border-black">
                        4 Simple Steps
                      </span>
                    </h3>
                    <p className="text-xs text-slate-700 font-bold">
                      Follow these steps to explore financial KPIs, run executive deliberations, and export PDF reports
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-xs font-black px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] transition active:translate-x-0.5 active:translate-y-0.5"
                >
                  {showGuide ? 'Hide Guide ▲' : 'Show Guide ▼'}
                </button>
              </div>

              {showGuide && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {/* Step 1 */}
                  <div className="p-4 rounded-xl bg-[#F5F3FF] border-2 border-black shadow-[3px_3px_0px_0px_#000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black text-white">Step 1</span>
                        <Building2 className="w-4 h-4 text-purple-700 stroke-[2.5]" />
                      </div>
                      <h4 className="text-xs font-black text-black mt-2">Select or Create Workspace</h4>
                      <p className="text-[11px] text-slate-800 font-semibold mt-1 leading-relaxed">
                        Use the top selector to switch between Indian demo companies (Apex Bengaluru, Nova Pune, Lumina Mumbai) or create your custom workspace.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsWorkspaceModalOpen(true)}
                      className="mt-3 text-[11px] font-black text-purple-800 hover:underline flex items-center gap-1"
                    >
                      + Create Custom Workspace &rarr;
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-xl bg-[#ECFDF5] border-2 border-black shadow-[3px_3px_0px_0px_#000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black text-white">Step 2</span>
                        <BarChart3 className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                      </div>
                      <h4 className="text-xs font-black text-black mt-2">Audit Financial Ledgers (₹)</h4>
                      <p className="text-[11px] text-slate-800 font-semibold mt-1 leading-relaxed">
                        Review revenue, expenses, and gross margins computed deterministically by Python/Pandas from transaction records in ₹ INR.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('data')}
                      className="mt-3 text-[11px] font-black text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      Inspect Ledger &amp; Upload Data &rarr;
                    </button>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-xl bg-[#FEFCE8] border-2 border-black shadow-[3px_3px_0px_0px_#000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black text-white">Step 3</span>
                        <Sparkles className="w-4 h-4 text-amber-700 stroke-[2.5]" />
                      </div>
                      <h4 className="text-xs font-black text-black mt-2">Convene Executive Debate</h4>
                      <p className="text-[11px] text-slate-800 font-semibold mt-1 leading-relaxed">
                        Click preset strategic dilemmas or type your question. 5 AI executives (CEO, CFO, CMO, COO, CTO) cross-examine each other.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('boardroom')}
                      className="mt-3 text-[11px] font-black text-amber-800 hover:underline flex items-center gap-1"
                    >
                      Go to Boardroom &rarr;
                    </button>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 rounded-xl bg-[#EFF6FF] border-2 border-black shadow-[3px_3px_0px_0px_#000] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black text-white">Step 4</span>
                        <FileText className="w-4 h-4 text-blue-700 stroke-[2.5]" />
                      </div>
                      <h4 className="text-xs font-black text-black mt-2">Action Plan &amp; PDF Report</h4>
                      <p className="text-[11px] text-slate-800 font-semibold mt-1 leading-relaxed">
                        Read consolidated recommendations, examine minority dissent, track action items, and download executive PDF reports in ₹ INR.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="mt-3 text-[11px] font-black text-blue-800 hover:underline flex items-center gap-1"
                    >
                      View Deliverables &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Business Profile Neo-Brutalist Box */}
            <div className="bg-[#FFE600] border-[3px] border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-black tracking-tight">{currentBusiness?.name}</h2>
                    {currentBusiness?.is_sample === 1 && (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-md bg-black text-white border-2 border-black">
                        Sample Workspace (₹ INR)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-black font-bold mt-1">
                    <b>Industry:</b> {currentBusiness?.industry} | <b>Location:</b> {currentBusiness?.location || 'India'} | <b>Currency:</b> {currentBusiness?.currency} (₹)
                  </p>
                  <p className="text-xs text-black font-semibold mt-2 max-w-3xl leading-relaxed">
                    {currentBusiness?.description}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('boardroom')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black bg-black hover:bg-slate-800 text-white border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition shrink-0"
                >
                  <Users className="w-4 h-4 stroke-[2.5]" />
                  Convene Boardroom
                </button>
              </div>

              {/* Goals & Constraints */}
              {(currentBusiness?.goals || currentBusiness?.constraints) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t-2 border-black text-xs">
                  {currentBusiness.goals && (
                    <div className="bg-white p-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                      <p className="font-black text-black text-[11px] uppercase tracking-wider">🎯 Primary Strategic Goals</p>
                      <p className="text-black font-semibold mt-1">{currentBusiness.goals}</p>
                    </div>
                  )}
                  {currentBusiness.constraints && (
                    <div className="bg-white p-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                      <p className="font-black text-black text-[11px] uppercase tracking-wider">⚠️ Operating Constraints</p>
                      <p className="text-black font-semibold mt-1">{currentBusiness.constraints}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Financial Intelligence Dashboard */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-black flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-black stroke-[3]" />
                    Financial Intelligence Ledger (₹ INR)
                  </h3>
                  <p className="text-xs text-slate-700 font-bold">Deterministic Python & Pandas Calculations</p>
                </div>

                <button
                  onClick={() => setActiveTab('data')}
                  className="text-xs text-black font-black underline flex items-center gap-1 hover:text-blue-600"
                >
                  Upload New Ledger Data <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>

              <FinancialCharts metrics={metrics} currency={currentBusiness?.currency || 'INR'} />
            </div>

            {/* Recent Meeting Decisions & Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latest Boardroom Decision */}
              <div className="bg-white border-[2.5px] border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_#000] flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black text-black mb-2 border-b-2 border-black pb-1">
                    Latest Boardroom Recommendation
                  </h4>
                  {meetings.length > 0 && meetings[0].recommendations?.length > 0 ? (
                    <div className="space-y-2.5">
                      <div className="p-3.5 rounded-xl bg-[#BAE6FD] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                        <p className="text-xs font-black text-black">{meetings[0].recommendations[0].title}</p>
                        <p className="text-xs text-black font-medium mt-1 leading-relaxed">
                          {meetings[0].recommendations[0].rationale}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-black font-bold pt-2">
                        <span>Meeting: &quot;{meetings[0].question.slice(0, 40)}...&quot;</span>
                        <button
                          onClick={() => {
                            setActiveMeeting(meetings[0]);
                            setStreamingMessages(meetings[0].messages || []);
                            setActiveTab('boardroom');
                          }}
                          className="underline hover:text-blue-600 font-black"
                        >
                          Review Full Transcript
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 py-6 text-center font-bold">
                      No meeting recommendations recorded yet. Convene a boardroom session to generate decisions.
                    </p>
                  )}
                </div>
              </div>

              {/* Task Completion Snapshot */}
              <div className="bg-white border-[2.5px] border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_#000]">
                <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-1">
                  <h4 className="text-sm font-black text-black">Action Deliverables Status</h4>
                  <button onClick={() => setActiveTab('tasks')} className="text-xs font-black underline hover:text-blue-600">
                    View All ({tasks.length})
                  </button>
                </div>
                {tasks.length > 0 ? (
                  <div className="space-y-2.5">
                    {tasks.slice(0, 4).map(t => (
                      <div key={t.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                        <div className="flex items-center gap-2 truncate max-w-[70%]">
                          <span className={`w-2.5 h-2.5 rounded-full border border-black ${t.status === 'done' ? 'bg-[#86EFAC]' : 'bg-[#FFE600]'}`} />
                          <span className={`truncate font-bold ${t.status === 'done' ? 'line-through text-slate-400' : 'text-black'}`}>
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-black font-black uppercase bg-white px-2 py-0.5 rounded border border-black">{t.owner}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 py-6 text-center font-bold">
                    No active tasks. Boardroom meetings automatically generate actionable deliverables in ₹ INR.
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
                <h3 className="text-sm font-black text-black flex items-center gap-2">
                  <Users className="w-4 h-4 text-black stroke-[3]" />
                  Executive Board Committee (5 Specialists)
                </h3>
                <span className="text-xs text-black font-bold">
                  Toggle specialists or let CEO Elena Vance auto-moderate
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
              <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[5px_5px_0px_0px_#000] space-y-4">
                <div>
                  <h4 className="text-sm font-black text-black uppercase tracking-tight">Ask a Strategic Business Question (₹ INR)</h4>
                  <p className="text-xs text-slate-700 font-bold mt-0.5">
                    Your five executive specialists will examine evidence, cross-examine assumptions, and deliver a consolidated decision.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="e.g. How should we address our profit decline given rising customer acquisition costs in India?"
                    value={questionInput}
                    onChange={e => setQuestionInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') startMeeting(questionInput);
                    }}
                    className="flex-1 text-sm bg-slate-50 border-2 border-black rounded-xl px-4 py-3 text-black font-bold placeholder-slate-400 focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
                  />
                  <button
                    onClick={() => startMeeting(questionInput)}
                    disabled={!questionInput.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black bg-[#FFE600] hover:bg-[#FACC15] text-black border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-4 h-4 stroke-[3]" />
                    Convene Boardroom
                  </button>
                </div>

                {/* Preset Scenario Questions Cards */}
                <div className="pt-2 border-t-2 border-black/10">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-black stroke-[3]" />
                      Preset Scenario Dilemmas for {currentBusiness?.name}:
                    </p>
                    <span className="text-[10px] text-slate-600 font-bold hidden sm:inline">
                      Click any scenario to immediately start debate
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {getSuggestedQuestions().map((q, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setQuestionInput(q);
                          startMeeting(q);
                        }}
                        className="bg-[#FFFDF8] hover:bg-[#FEFCE8] border-2 border-black rounded-xl p-3.5 flex flex-col justify-between shadow-[3px_3px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#000] transition cursor-pointer group"
                      >
                        <p className="text-xs font-bold text-black leading-snug">&quot;{q}&quot;</p>
                        <div className="mt-3 pt-2 border-t border-black/20 flex items-center justify-between text-[11px] font-black text-black group-hover:text-blue-700">
                          <span>⚡ Convene Boardroom</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[3] group-hover:translate-x-1 transition-transform" />
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#BAE6FD] border-[2.5px] border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_#000]">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-black bg-white px-2 py-0.5 rounded border border-black">Active Question</span>
                  <h3 className="text-sm font-black text-black mt-1">&quot;{activeMeeting.question}&quot;</h3>
                </div>

                <div className="flex items-center gap-2">
                  {isMeetingRunning ? (
                    <button
                      onClick={cancelActiveMeeting}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-[#FDA4AF] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition"
                    >
                      Cancel Meeting
                    </button>
                  ) : (
                    <a
                      href={api.getReportPdfUrl(activeMeeting.id)}
                      download
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black bg-[#A7F3D0] hover:bg-[#86EFAC] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[3]" />
                      Export PDF Report (₹)
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Live Debate Transcript Stream */}
            <div className="bg-white border-[3px] border-black rounded-2xl p-5 space-y-4 shadow-[5px_5px_0px_0px_#000] min-h-[350px]">
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                  <FileText className="w-4 h-4 text-black stroke-[3]" />
                  Executive Debate Transcript & Evidence Citations
                </h4>
                {isMeetingRunning && (
                  <span className="flex items-center gap-1.5 text-xs text-black font-black bg-[#FFE600] px-2.5 py-0.5 rounded border-2 border-black shadow-[2px_2px_0px_0px_#000] animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-black" />
                    Boardroom in Session...
                  </span>
                )}
              </div>

              {streamingMessages.length === 0 ? (
                <div className="text-center py-16 text-black text-xs font-bold">
                  Enter a strategic business question above to convene your executive committee.
                </div>
              ) : (
                <div className="space-y-4">
                  {streamingMessages.map((msg, index) => {
                    const exec = EXECUTIVES[msg.executive] || EXECUTIVES.ceo;
                    return (
                      <div
                        key={index}
                        className={`rounded-xl border-[2.5px] border-black p-4 transition-all shadow-[4px_4px_0px_0px_#000] ${
                          msg.executive === 'ceo' ? 'bg-[#F3E8FF]' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Executive Persona Avatar Box */}
                          <div className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000] ${exec.bgColor}`}>
                            {msg.executive === 'ceo' && <Shield className="w-5 h-5 text-black stroke-[2.5]" />}
                            {msg.executive === 'cfo' && <IndianRupee className="w-5 h-5 text-black stroke-[2.5]" />}
                            {msg.executive === 'cmo' && <TrendingUp className="w-5 h-5 text-black stroke-[2.5]" />}
                            {msg.executive === 'coo' && <Wrench className="w-5 h-5 text-black stroke-[2.5]" />}
                            {msg.executive === 'cto' && <Cpu className="w-5 h-5 text-black stroke-[2.5]" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-black">{exec.title}</span>
                                <span className="text-[11px] text-slate-700 font-bold">({exec.name})</span>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white text-black border-2 border-black uppercase">
                                  {msg.stage.replace('_', ' ')}
                                </span>
                                {msg.is_simulated && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#FED7AA] text-black border border-black">
                                    Simulated Scenario
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Content */}
                            <div className="text-xs text-black font-medium leading-relaxed whitespace-pre-line space-y-2">
                              {msg.content}
                            </div>

                        {/* Structured Evidence / Assumptions / Risks Drawers */}
                        {((msg.evidence_refs?.length ?? 0) > 0 || (msg.assumptions?.length ?? 0) > 0 || (msg.risks?.length ?? 0) > 0 || (msg.dissent?.length ?? 0) > 0) && (
                          <div className="mt-3 pt-3 border-t-2 border-black flex flex-wrap gap-2 text-[11px]">
                            {msg.evidence_refs && msg.evidence_refs.length > 0 && (
                              <span className="px-2.5 py-1 rounded-md bg-[#BAE6FD] border-2 border-black font-bold text-black shadow-[2px_2px_0px_0px_#000]">
                                <b>Evidence:</b> {msg.evidence_refs.map((e: { data_point?: string; description?: string }) => e.data_point || e.description).join('; ')}
                              </span>
                            )}
                            {msg.assumptions && msg.assumptions.length > 0 && (
                              <span className="px-2.5 py-1 rounded-md bg-[#FEF08A] border-2 border-black font-bold text-black shadow-[2px_2px_0px_0px_#000]">
                                <b>Assumptions:</b> {msg.assumptions.join(' | ')}
                              </span>
                            )}
                            {msg.risks && msg.risks.length > 0 && (
                              <span className="px-2.5 py-1 rounded-md bg-[#FECDD3] border-2 border-black font-bold text-black shadow-[2px_2px_0px_0px_#000]">
                                <b>Risks:</b> {msg.risks.join(' | ')}
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
              <div className="bg-white border-[2.5px] border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_#000]">
                <h4 className="text-xs font-black text-black mb-2 uppercase">Ask a Follow-up Question</h4>
                <form onSubmit={handleFollowUp} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask follow-up referencing this meeting's decision..."
                    value={followUpInput}
                    onChange={e => setFollowUpInput(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-black font-bold focus:outline-none focus:bg-yellow-50"
                  />
                  <button
                    type="submit"
                    disabled={!followUpInput.trim() || isMeetingRunning}
                    className="px-4 py-2 rounded-lg text-xs font-black bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition disabled:opacity-50"
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
            <div className="bg-white border-[3px] border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_#000]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-black flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-black stroke-[2.5]" />
                    Data Ingestion & Grounding Ledger (₹ INR)
                  </h3>
                  <p className="text-xs text-slate-700 font-bold mt-1 max-w-xl">
                    Import transactions from CSV or Excel to compute deterministic KPIs in Indian Rupees. Upload PDFs to extract text and enable page-grounded document citations.
                  </p>
                </div>

                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#FFE600] hover:bg-[#FACC15] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer hover:-translate-y-0.5 transition">
                  <Plus className="w-4 h-4 stroke-[3]" />
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
            <div className="bg-white border-[2.5px] border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_#000] space-y-4">
              <h4 className="text-sm font-black text-black border-b-2 border-black pb-1">
                Uploaded Documents ({documents.length})
              </h4>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-xs text-black font-bold border-2 border-dashed border-black rounded-lg">
                  No documents uploaded yet. Add sample documents from sample_data/ or upload your own files.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documents.map(doc => {
                    const isTabular = doc.original_name.endsWith('.csv') || doc.original_name.endsWith('.xlsx') || doc.original_name.endsWith('.xls');
                    return (
                      <div key={doc.id} className="bg-slate-50 border-2 border-black rounded-xl p-4 flex flex-col justify-between shadow-[2.5px_2.5px_0px_0px_#000]">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-black text-black truncate">{doc.original_name}</span>
                            <button
                              onClick={async () => {
                                if (confirm('Delete document?')) {
                                  await api.deleteDocument(currentBusiness!.id, doc.id);
                                  setDocuments(documents.filter(d => d.id !== doc.id));
                                }
                              }}
                              className="text-black hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-700 font-bold mt-1">
                            {doc.page_count > 0 ? `${doc.page_count} pages extracted` : 'Tabular dataset'} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between">
                          {isTabular ? (
                            <button
                              onClick={async () => {
                                const preview = await api.previewDocument(currentBusiness!.id, doc.id);
                                setMappingModalDoc(doc);
                                setMappingPreviewData(preview);
                              }}
                              className="text-xs font-black text-black bg-[#BAE6FD] px-2.5 py-1 rounded border border-black hover:-translate-y-0.5 transition shadow-[1.5px_1.5px_0px_0px_#000]"
                            >
                              Map & Import (₹)
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const preview = await api.previewDocument(currentBusiness!.id, doc.id);
                                setPreviewPdfText({ title: doc.original_name, text: preview.text_excerpt });
                              }}
                              className="text-xs font-black text-black bg-[#FEF08A] px-2.5 py-1 rounded border border-black hover:-translate-y-0.5 transition shadow-[1.5px_1.5px_0px_0px_#000]"
                            >
                              View Text Citations
                            </button>
                          )}
                          <span className="text-[10px] text-black font-black bg-[#86EFAC] px-2 py-0.5 rounded border border-black">Ready</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ingested Transactions Ledger */}
            <div className="bg-white border-[2.5px] border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_#000] space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div>
                  <h4 className="text-sm font-black text-black">
                    Ingested Transactions Ledger ({transactions.length})
                  </h4>
                  <p className="text-xs text-slate-700 font-bold">
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
                    className="text-xs text-rose-600 font-black underline"
                  >
                    Clear Ledger
                  </button>
                )}
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-black font-bold border-2 border-dashed border-black rounded-lg">
                  No transactions imported yet. Click &quot;Map &amp; Import (₹)&quot; on an uploaded CSV file above.
                </div>
              ) : (
                <div className="overflow-x-auto border-2 border-black rounded-xl max-h-96">
                  <table className="w-full text-left text-xs text-black">
                    <thead className="bg-[#FFE600] text-black uppercase text-[10px] font-black border-b-2 border-black sticky top-0">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Kind</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Amount (₹ INR)</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-black font-bold">
                      {transactions.slice(0, 100).map((t) => (
                        <tr key={t.id} className="hover:bg-yellow-50">
                          <td className="p-3 whitespace-nowrap">{t.date}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border border-black ${t.kind === 'revenue' ? 'bg-[#86EFAC] text-black' : 'bg-[#FDA4AF] text-black'}`}>
                              {t.kind}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap font-black">{t.category}</td>
                          <td className="p-3 whitespace-nowrap text-right font-black">
                            ₹ {t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-slate-800 font-medium truncate max-w-xs">{t.description || '-'}</td>
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
            <div className="bg-white border-[3px] border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_#000]">
              <h3 className="text-base font-black text-black">Boardroom Meeting Archive</h3>
              <p className="text-xs text-slate-700 font-bold mt-1">
                Browse and reopen full transcripts, executive debate logs, minority dissents, and PDF reports in ₹ INR.
              </p>
            </div>

            {meetings.length === 0 ? (
              <div className="text-center py-16 text-black font-bold text-xs border-2 border-dashed border-black rounded-xl bg-white shadow-[4px_4px_0px_0px_#000]">
                No meetings held yet in this workspace. Go to the Boardroom Debate tab to convene your first meeting.
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border-[2.5px] border-black hover:-translate-y-0.5 rounded-xl p-5 transition shadow-[4px_4px_0px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border border-black ${m.status === 'completed' ? 'bg-[#86EFAC] text-black' : 'bg-[#BAE6FD] text-black'}`}>
                          {m.status}
                        </span>
                        <span className="text-xs text-slate-700 font-bold">
                          {new Date(m.started_at).toLocaleDateString()} at {new Date(m.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-black">&quot;{m.question}&quot;</h4>
                      <p className="text-xs text-slate-700 font-bold">
                        {m.messages?.length || 0} executive contributions • Model: {m.model_used || 'Standard Engine'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <a
                        href={api.getReportPdfUrl(m.id)}
                        download
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black bg-[#FFE600] hover:bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] transition"
                      >
                        <Download className="w-3.5 h-3.5 stroke-[3]" />
                        PDF (₹)
                      </a>

                      <button
                        onClick={() => {
                          setActiveMeeting(m);
                          setStreamingMessages(m.messages || []);
                          setCurrentStage(m.status === 'completed' ? 'completed' : 'clarification');
                          setActiveTab('boardroom');
                        }}
                        className="px-4 py-1.5 rounded-lg text-xs font-black bg-black text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:bg-slate-800 transition"
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
            <div className="bg-white border-[3px] border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_#000]">
              <h3 className="text-base font-black text-black">Prioritized Action Items & Deliverables</h3>
              <p className="text-xs text-slate-700 font-bold mt-1">
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
            <div className="bg-white border-[3px] border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_#000] space-y-4">
              <h3 className="text-base font-black text-black border-b-2 border-black pb-2">
                System Diagnostics & AI Engine
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  <p className="text-slate-700 font-bold">Google GenAI SDK Status</p>
                  <p className={`font-black mt-1 text-sm ${health?.gemini_live ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {health?.gemini_live ? 'Live Inference Ready 🟢' : 'Offline Mode (No Key)'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  <p className="text-slate-700 font-bold">Configured Model</p>
                  <p className="font-black text-black mt-1 text-sm">{health?.configured_model || 'gemini-3.8-flash'}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  <p className="text-slate-700 font-bold">Currency Mode</p>
                  <p className="font-black text-black mt-1 text-sm">Indian Rupees (₹ INR)</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  <p className="text-slate-700 font-bold">Local SQLite Database</p>
                  <p className="font-black text-black mt-1 text-sm">{health?.database || 'boardroom.db'}</p>
                </div>
              </div>
            </div>

            {/* Manage Workspace Details */}
            {currentBusiness && (
              <div className="bg-white border-[3px] border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_#000] space-y-4">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <h3 className="text-base font-black text-black">Workspace Metadata</h3>
                  <button
                    onClick={() => setIsWorkspaceModalOpen(true)}
                    className="text-xs font-black text-black bg-[#FFE600] px-3 py-1 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition"
                  >
                    Edit Workspace
                  </button>
                </div>
                <div className="text-xs space-y-2 text-black font-semibold">
                  <p><b>Name:</b> {currentBusiness.name}</p>
                  <p><b>Industry:</b> {currentBusiness.industry}</p>
                  <p><b>Currency:</b> {currentBusiness.currency} (₹)</p>
                  <p><b>Location:</b> {currentBusiness.location || 'India'}</p>
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
          <div className="bg-white border-[3px] border-black rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col p-6 shadow-[8px_8px_0px_0px_#000]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <h3 className="text-sm font-black text-black">Document Citations: {previewPdfText.title}</h3>
              <button onClick={() => setPreviewPdfText(null)} className="text-black font-black p-1 border border-black rounded hover:bg-slate-100">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto text-xs text-black font-mono whitespace-pre-wrap leading-relaxed flex-1 bg-slate-50 p-4 rounded-xl border-2 border-black">
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
