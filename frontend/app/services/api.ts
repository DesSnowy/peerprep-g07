  const API_BASE = '/api';

// ─── Helper ──────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed (${res.status})`);
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ token: string }>(res);
}

export async function signupUser(email: string, username: string, password: string) {
  const res = await fetch(`${API_BASE}/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  return handleResponse<{ id: number; email: string; username: string; created_at: string }>(res);
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  access_role: string;
  created_at: string;
}

export async function getMyProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/me`, { headers: authHeaders() });
  const data = await handleResponse<UserProfile & { hashed_password?: string }>(res);
  const { hashed_password: _, ...profile } = data;
  return profile;
}

export async function updateMyProfile(username: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ username }),
  });
  return handleResponse<UserProfile>(res);
}

// ─── Questions ───────────────────────────────────────────────────────────────

export interface Question {
  questionId: number;
  title: string;
  description: string;
  constraints: string | null;
  testCases: Array<{ input: string; expectedOutput: string }>;
  leetcodeLink: string | null;
  difficulty: string;
  topics: string[];
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getQuestions(params?: { topics?: string; difficulty?: string }) {
  const sp = new URLSearchParams();
  if (params?.topics) sp.set('topics', params.topics);
  if (params?.difficulty) sp.set('difficulty', params.difficulty);
  const qs = sp.toString();
  const res = await fetch(`${API_BASE}/questions${qs ? '?' + qs : ''}`);
  return handleResponse<{ count: number; questions: Question[] }>(res);
}

export async function getQuestionById(id: number) {
  const res = await fetch(`${API_BASE}/questions/${id}`);
  return handleResponse<{ question: Question }>(res);
}

export async function createQuestion(data: {
  title: string;
  description: string;
  difficulty: string;
  topics: string[];
  testCases: Array<{ input: string; expectedOutput: string }>;
  constraints?: string;
  leetcodeLink?: string;
  imageUrls?: string[];
}) {
  const res = await fetch(`${API_BASE}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<{ message: string; question: Question }>(res);
}

export async function updateQuestion(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    difficulty: string;
    topics: string[];
    testCases: Array<{ input: string; expectedOutput: string }>;
    constraints: string;
    leetcodeLink: string;
    imageUrls: string[];
  }>
) {
  const res = await fetch(`${API_BASE}/questions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<{ message: string; question: Question }>(res);
}

export async function deleteQuestion(id: number) {
  const res = await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE' });
  return handleResponse<{ message: string }>(res);
}

// ─── Matching ────────────────────────────────────────────────────────────────

export interface Match {
  matchId: string;
  users: [string, string];
  createdAt: number;
  topic: string;
  difficulty: string;
  language: string;
}

export interface QueueResponse {
  status: 'queued' | 'matched';
  queueKey?: string;
  match?: Match;
}

export interface UserStateResponse {
  state: 'queued' | 'matched' | 'timeout';
  queueKey?: string;
  elapsedMs?: number;
  queueLength?: number;
  match?: Match;
}

export async function joinMatchQueue(data: {
  userId: string;
  topic: string;
  difficulty: string;
  language: string;
}) {
  const res = await fetch(`${API_BASE}/match/queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<QueueResponse>(res);
}

export async function getMatchStatus(userId: string) {
  const res = await fetch(`${API_BASE}/match/${userId}`);
  return handleResponse<UserStateResponse>(res);
}

export async function cancelMatch(userId: string) {
  const res = await fetch(`${API_BASE}/match/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return handleResponse<{ message: string }>(res);
}
