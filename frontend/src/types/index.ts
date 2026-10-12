export type SupportedLanguage = 'c' | 'cpp' | 'python' | 'java' | 'javascript';

export interface ProjectFile {
  id: number;
  project_id?: number;
  name: string;
  path: string;
  content: string;
  language: SupportedLanguage | string;
  is_folder: boolean;
  parent_id?: number | null;
  is_entry?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: number;
  user_id?: number | null;
  name: string;
  description?: string;
  language: SupportedLanguage;
  files: ProjectFile[];
  file_count: number;
  entry_file_id?: number | null;
  entry_file_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionResponse {
  stdout: string;
  stderr: string;
  output?: string;
  error?: string;
  exit_code: number;
  execution_time: number;
  memory_mb?: number | null;
  memory_used?: number | null;
  status: 'Accepted' | 'Compilation Error' | 'Runtime Error' | 'Time Limit Exceeded' | 'Memory Limit Exceeded' | 'Execution Failed' | 'Error';
  raw_error?: string | null;
  language?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  projects_count: number;
  saved_count: number;
  problems_solved: number;
  ai_requests: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface HistoryItem {
  id: number;
  title: string;
  language: SupportedLanguage;
  code: string;
  stdin: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time: number;
  memory_mb: number;
  status: string;
  created_at: string;
}

export interface AIResponse {
  action: string;
  content: string;
  generated_code?: string;
  language?: string;
  summary?: string;
}

export interface VisualStep {
  step_number: number;
  line_number: number;
  code_line: string;
  description: string;
  variables: Record<string, any>;
  arrays: Record<string, any[]>;
  linked_lists: Record<string, any[]>;
  output: string;
}

export interface VisualizerResponse {
  steps: VisualStep[];
  total_steps: number;
  language: string;
}

export interface ProblemListItem {
  id: number;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
}

export interface ProblemDetail {
  id: number;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  input_format: string;
  output_format: string;
  constraints: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  starter_templates: Record<string, string>;
}

export interface TestCaseVerdict {
  id: number;
  is_hidden: boolean;
  input: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  error?: string | null;
}

export interface ProblemSubmitResponse {
  status: string;
  passed_count: number;
  total_count: number;
  test_cases: TestCaseVerdict[];
  execution_time: number;
}
