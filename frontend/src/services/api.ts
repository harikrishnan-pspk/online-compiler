import {
  ExecutionResponse,
  Project,
  ProjectFile,
  AIResponse,
  VisualizerResponse,
  ProblemListItem,
  ProblemDetail,
  ProblemSubmitResponse,
  HistoryItem,
  User
} from '../types';

const BASE_URL = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('codeforge_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.detail || 'Something went wrong while processing your request. Please try again.';
      throw new Error(msg);
    }

    return await res.json();
  } catch (err: any) {
    if (err.message) throw err;
    throw new Error('Connection failed. Please check your network and backend server status.');
  }
}

export const api = {
  // Execution
  execute: (
    language: string,
    code: string,
    stdin: string = '',
    title: string = 'Untitled',
    files?: Array<{ name: string; path?: string; content: string; is_folder?: boolean }>,
    entryFile?: string
  ) => {
    let cleanStdin = (stdin || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (cleanStdin && !cleanStdin.endsWith('\n')) {
      cleanStdin += '\n';
    }
    return request<ExecutionResponse>('/execute', {
      method: 'POST',
      body: JSON.stringify({
        language,
        code,
        stdin: cleanStdin,
        input: cleanStdin,
        title,
        files,
        entry_file: entryFile
      })
    });
  },

  // Interactive Execution WebSocket
  createInteractiveSession: (
    language: string,
    code: string,
    title: string = 'Untitled',
    callbacks: {
      onStdout: (data: string) => void;
      onStderr: (data: string) => void;
      onExit: (code: number, status: string, duration?: number) => void;
      onError: (err: any) => void;
    },
    initialStdin: string = '',
    files?: Array<{ name: string; path?: string; content: string; is_folder?: boolean }>,
    entryFile?: string
  ) => {
    const isHttps = window.location.protocol === 'https:';
    const wsProto = isHttps ? 'wss:' : 'ws:';
    const host = (window.location.port === '5173' || window.location.port === '3000')
      ? `${window.location.hostname}:8000`
      : window.location.host;
    const wsUrl = `${wsProto}//${host}/api/execute/interactive`;
    const socket = new WebSocket(wsUrl);

    let isConnected = false;
    const queuedStdin: string[] = [];

    socket.onopen = () => {
      isConnected = true;
      socket.send(JSON.stringify({
        type: 'start',
        language,
        code,
        title,
        stdin: initialStdin || '',
        files,
        entry_file: entryFile
      }));
      while (queuedStdin.length > 0) {
        const item = queuedStdin.shift()!;
        socket.send(JSON.stringify({ type: 'stdin', data: item }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'stdout') {
          callbacks.onStdout(msg.data);
        } else if (msg.type === 'stderr') {
          callbacks.onStderr(msg.data);
        } else if (msg.type === 'exit') {
          callbacks.onExit(msg.code, msg.status, msg.execution_time);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    socket.onerror = (e) => {
      callbacks.onError(e);
    };

    socket.onclose = () => {
      isConnected = false;
    };

    return {
      sendStdin: (text: string) => {
        if (isConnected && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'stdin', data: text }));
        } else {
          queuedStdin.push(text);
        }
      },
      stop: () => {
        if (isConnected && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'stop' }));
        }
      },
      close: () => {
        try {
          socket.close();
        } catch (_) {}
      }
    };
  },

  // AI Assistant
  aiAction: (
    action: string,
    language: string,
    code: string = '',
    selected_code: string = '',
    prompt: string = '',
    target_language?: string
  ) =>
    request<AIResponse>(`/ai/${action}`, {
      method: 'POST',
      body: JSON.stringify({ action, language, code, selected_code, prompt, target_language })
    }),

  // Visualizer
  visualize: (language: string, code: string, stdin: string = '') =>
    request<VisualizerResponse>('/visualize', {
      method: 'POST',
      body: JSON.stringify({ language, code, stdin })
    }),

  // Projects
  getProjects: () => request<Project[]>('/projects'),
  createProject: (name: string, description: string = '', language: string = 'c') =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description, language })
    }),
  getProject: (id: number) => request<Project>(`/projects/${id}`),
  updateProject: (id: number, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteProject: (id: number) =>
    request<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),

  // Files
  createFile: (data: Partial<ProjectFile>) =>
    request<ProjectFile>('/files', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateFile: (id: number, data: { name?: string; content?: string; language?: string }) =>
    request<ProjectFile>(`/files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteFile: (id: number) =>
    request<{ message: string }>(`/files/${id}`, { method: 'DELETE' }),

  // History
  getHistory: () =>
    request<HistoryItem[]>('/history', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }),
  clearHistory: () =>
    request<{ message: string }>('/history', {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }),

  // Practice / Competitive
  getProblems: () => request<ProblemListItem[]>('/practice/problems'),
  getProblem: (slug: string) => request<ProblemDetail>(`/practice/problems/${slug}`),
  submitProblem: (id: number, language: string, code: string) =>
    request<ProblemSubmitResponse>(`/practice/problems/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ language, code })
    }),

  // Auth
  login: (username_or_email: string, password: string) =>
    request<{ access_token: string; token_type: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password })
    }),
  register: (username: string, email: string, password: string) =>
    request<{ access_token: string; token_type: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    }),
  getMe: () => request<User>('/auth/me')
};
