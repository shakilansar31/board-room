export interface Business {
  id: string;
  name: string;
  industry: string;
  location?: string;
  currency: string;
  description: string;
  goals?: string;
  constraints?: string;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyMetric {
  month: string;
  revenue: number;
  expense: number;
  operating_result: number;
  margin_percent?: number | null;
}

export interface CategoryBreakdown {
  category: string;
  kind: string;
  total_amount: number;
  percentage_of_total: number;
}

export interface FinancialMetrics {
  currency: string;
  total_revenue: number;
  total_expenses: number;
  net_operating_result: number;
  operating_margin_percent?: number | null;
  coverage_start?: string | null;
  coverage_end?: string | null;
  total_transactions: number;
  monthly_trend: MonthlyMetric[];
  category_breakdown: CategoryBreakdown[];
  mom_revenue_growth_percent?: number | null;
  mom_expense_growth_percent?: number | null;
  accounting_limitations: string[];
  is_sample_data: boolean;
}

export interface DocumentItem {
  id: string;
  business_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  page_count: number;
  status: string;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  business_id: string;
  date: string;
  kind: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  source_id?: string;
  created_at: string;
}

export interface MarketResearchSource {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface MarketResearch {
  query: string;
  summary: string;
  sources: MarketResearchSource[];
  is_live: boolean;
  source_engine?: string;
}

export interface MeetingMessage {
  id?: string;
  meeting_id?: string;
  executive: 'ceo' | 'cfo' | 'cmo' | 'coo' | 'cto';
  stage: string;
  content: string;
  evidence_refs?: any[];
  assumptions?: string[];
  risks?: string[];
  dissent?: string[];
  confidence?: string;
  is_simulated?: boolean;
  created_at?: string;
}

export interface PrioritizedTaskItem {
  title: string;
  description: string;
  priority: string;
  recommended_owner: string;
  estimated_timeline: string;
  measurable_kpi: string;
}

export interface CeoSynthesis {
  executive: string;
  role_title: string;
  problem_clarification: string;
  evidence_summary: string;
  specialist_perspectives_summary: string;
  core_disagreements_debated: string[];
  options_considered: { name: string; pros: string; cons: string }[];
  final_recommendation: string;
  justification: string;
  preserved_minority_dissent: string[];
  known_limitations_and_uncertainties: string[];
  priority_tasks: PrioritizedTaskItem[];
  confidence_statement: string;
  is_simulated?: boolean;
}

export interface Recommendation {
  id: string;
  meeting_id: string;
  business_id: string;
  title: string;
  rationale: string;
  risks?: string;
  status: 'proposed' | 'accepted' | 'rejected';
  priority: string;
  created_at: string;
}

export interface Task {
  id: string;
  business_id: string;
  meeting_id?: string | null;
  title: string;
  description?: string;
  priority: string;
  owner?: string;
  due_date?: string;
  success_metric?: string;
  status: 'todo' | 'in_progress' | 'done';
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  business_id: string;
  question: string;
  status: 'created' | 'running' | 'completed' | 'failed' | 'canceled';
  participants_json: string;
  started_at: string;
  completed_at?: string | null;
  error?: string | null;
  model_used?: string | null;
  token_usage_json?: string | null;
  synthesis_json?: string | null;
  market_research_json?: string | null;
  messages: MeetingMessage[];
  recommendations: Recommendation[];
  tasks: Task[];
}

export interface SystemHealth {
  status: string;
  gemini_live: boolean;
  tavily_live?: boolean;
  configured_model: string;
  api_key_configured: boolean;
  simulation_mode_allowed: boolean;
  database: string;
}
