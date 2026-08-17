/**
 * InterviewAI - canonical frontend types aligned with the FastAPI API.
 *
 * The API layer normalizes a few backend-only persistence shapes into these
 * UI-friendly types so components do not need to know MongoDB details.
 */

export type QuestionType =
  | 'project'
  | 'experience'
  | 'technical'
  | 'hr'
  | 'jd_matched'
  | 'problem_solving'
  | 'follow_up'
  | 'aptitude'
  | 'quiz';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type AptitudeCategory = 'quantitative' | 'verbal' | 'logical';

export interface User {
  id?: string;
  email: string;
  full_name?: string;
  created_at?: string;
}

export interface BackendUserResponse {
  user_id: string;
  email: string;
  name: string;
  full_name?: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  name: string;
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface EvidenceObject {
  source: string;
  section?: string | null;
  reference?: string | null;
  snippet?: string | null;
}

export interface Project {
  title: string;
  description: string;
  tech_stack: string[];
  role?: string;
  highlights?: string[];
  evidence_snippet?: string;
}

export interface Experience {
  role: string;
  company: string;
  duration_months: number;
  responsibilities: string[];
  // UI aliases retained for the existing design components.
  duration?: string;
  highlights?: string[];
  location?: string;
}

export interface Education {
  degree: string;
  institution: string;
  year: number;
  score?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  year?: string;
}

export interface StructuredProfile {
  name?: string | null;
  skills: string[];
  projects: Project[];
  experience: Experience[];
  certifications: Certification[];
  education: Education[];
}

export interface ResumeProfileResponse {
  resume_hash: string;
  structured_profile: StructuredProfile;
  cached: boolean;
  created_at?: string;
  filename?: string;
  upload_date?: string;
}

export interface StoredResumeItem {
  id: string;
  resume_hash: string;
  filename: string;
  upload_date?: string;
  structured_profile: StructuredProfile;
  extracted_skills: string[];
  projects_count: number;
  experience_count: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionSetRecord {
  id: string;
  title: string;
  role?: string;
  company?: string;
  mode: 'self_based' | 'role_based';
  date: string;
  questions_count: number;
  difficulty: string;
  questions: InterviewQuestion[];
  generation_summary?: GenerationSummary;
  resume_hash?: string;
  jd_hash?: string;
}

export interface InterviewQuestion {
  question_id: string;
  category: QuestionType | string;
  difficulty: Difficulty | string;
  question: string;
  suggested_answer: string;
  skill_tag?: string | null;
  evidence: EvidenceObject;
  source: string;
  linked_to?: string | null;
  options?: string[] | null;
  correct_answer?: string | null;
  why_asked: string[];
  focus?: string | null;

  // Backward-compatible UI aliases used by older screens.
  id?: string;
  type?: QuestionType | string;
  expected_answer?: string;
}

export interface GenerationSummary {
  questions_requested: number;
  cached_questions: number;
  fresh_questions: number;
  cache_hit_rate: number;
  gemini_requests: number;
}

export interface GenerateQuestionsRequest {
  resume_hash: string;
  jd_hash?: string | null;
  mode?: 'self_based' | 'job_specific';
  total_questions?: number;
  distribution?: Record<string, number>;
}

export interface GenerateQuestionsResponse {
  questions: InterviewQuestion[];
  generation_summary: GenerationSummary;
  resume_hash: string;
  jd_hash?: string | null;
}

export interface SubmittedResponseRecord {
  question_id: string;
  question: string;
  category: string;
  skill_tag?: string | null;
  evidence?: EvidenceObject;
  user_answer: string;
  feedback?: AnswerFeedback | null;
  is_follow_up?: boolean;
  submitted_at?: string;
  score?: number | null;
  is_correct?: boolean | null;
  // UI alias
  type?: string;
}

export interface CreateSessionRequest {
  resume_hash: string;
  jd_hash?: string | null;
  mode?: 'job_specific' | 'self_based' | 'quiz' | 'aptitude';
  title?: string;
  role?: string;
  difficulty?: string;
  total_questions?: number;
  questions?: InterviewQuestion[];
  generation_summary?: GenerationSummary;
}

export interface SessionQuestion extends InterviewQuestion {}

export interface SessionResponse {
  session_id: string;
  user_id?: string;
  resume_hash: string;
  jd_hash?: string | null;
  mode: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  current_question_index: number;
  questions: SessionQuestion[];
  responses: SubmittedResponseRecord[];
  overall_score?: number | null;
  started_at: string;
  completed_at?: string | null;
  created_at?: string;
  title?: string | null;
  role?: string | null;
  difficulty?: string | null;
  total_questions?: number | null;
  stats?: SessionStatsResponse;
}

export interface SessionAnswerRequest {
  question_id: string;
  user_answer: string;
}

export interface AnswerFeedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missing_points: string[];
  improvement_suggestions: string[];
  ideal_answer: string;
}

export interface SubmitAnswerResponse {
  feedback: AnswerFeedback | null;
  is_correct?: boolean | null;
  follow_up_question?: SessionQuestion | null;
  next_question?: SessionQuestion | null;
  is_completed: boolean;
  current_score?: number | null;
  session: SessionResponse;
}

export interface SessionStatsResponse {
  session_id: string;
  total_sessions: number;
  questions_attempted: number;
  questions_completed: number;
  average_score: number;
  technical_score: number;
  hr_score: number;
  aptitude_score?: number;
  quiz_score?: number;
  accuracy: number;
  strong_skills: string[];
  weak_skills: string[];
  cache_hit_rate: number;
  cached_questions: number;
  fresh_questions: number;
  gemini_requests: number;
  generation_summary?: GenerationSummary;
}

export interface SessionHistoryItem {
  id: string;
  session_id?: string | null;
  title?: string | null;
  date?: string | null;
  score?: number | null;
  questions_attempted?: number;
  total_questions?: number;
  type?: string | null;
  mode?: string | null;
  status?: 'in_progress' | 'completed' | null;
  overall_score?: number | null;
  started_at?: string | null;
}

export interface DashboardMetrics {
  total_sessions: number;
  questions_attempted: number;
  questions_completed: number;
  average_score: number;
  technical_score: number;
  hr_score: number;
  aptitude_score: number;
  quiz_score: number;
  accuracy: number;
  strong_skills: string[];
  weak_skills: string[];
  cache_hit_rate: number;
  cached_questions: number;
  fresh_questions: number;
  gemini_requests: number;
  session_history: SessionHistoryItem[];
}

export interface AptitudeQuestion {
  question_id: string;
  category: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correct_answer?: number;
  explanation: string;
}

export interface OnboardingPreferences {
  focus: 'interview_prep' | 'aptitude_tests';
  targetRole: string;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface SystemStatus {
  connected: boolean;
  backendUrl: string;
  latencyMs?: number;
  version?: string;
}
