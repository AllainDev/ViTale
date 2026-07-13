// Central API client — calls ViTale REST API
const _baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
const BASE_URL = _baseUrl.endsWith('/api/v1') ? _baseUrl : `${_baseUrl}/api/v1`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...init?.headers,
  };

  if (typeof window !== 'undefined') {
    const jwt = localStorage.getItem('vitale_jwt');
    if (jwt) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${jwt}`;
    }

    const travelerId = localStorage.getItem('vitale_traveler_id');
    if (travelerId) {
      (headers as Record<string, string>)['X-Traveler-Id'] = travelerId;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include', // send vitale_session cookie
    headers,
  });

  // Extract X-Traveler-Id from response and save it
  if (typeof window !== 'undefined') {
    const newTravelerId = res.headers.get('X-Traveler-Id');
    if (newTravelerId) {
      localStorage.setItem('vitale_traveler_id', newTravelerId);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, err.error ?? err.errorMessage ?? 'Request failed', err.errorCode);
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  linkAccount: (provider: 'google' | 'facebook', idToken: string) =>
    request<{ token: string; isNewAccount: boolean }>('/auth/link-account', {
      method: 'POST',
      body: JSON.stringify({ provider, idToken }),
    }),
  refresh: (token: string) =>
    request<{ token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};


// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatResponse {
  message: string;
  action: string | null;
  audioUrl: string | null;
  sessionId: string;
  turnCount: number;
}
export const chatApi = {
  sendMessage: (message: string, sessionId?: string, languageCode = 'vi-VN') =>
    request<ChatResponse>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId, languageCode }),
    }),
};


// ─── Partners ────────────────────────────────────────────────────────────────
export interface Partner {
  id: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  availableVouchersCount: number;
  priorityScore: number;
}
export const partnersApi = {
  getRecommendations: (lat?: number, lng?: number, type?: string) => {
    const params = new URLSearchParams();
    if (lat != null) params.set('lat', lat.toString());
    if (lng != null) params.set('lng', lng.toString());
    if (type) params.set('type', type);
    return request<{ partners: Partner[] }>(`/partners/recommendations?${params}`);
  },
  getVouchers: (partnerId: string) =>
    request<Array<{ id: string; title: string; discountType: string; discountValue: number; validUntil: string }>>(
      `/partners/${partnerId}/vouchers`
    ),
};

// ─── Gamification ─────────────────────────────────────────────────────────────

export interface GamificationStamp {
  checkpointId: string;
  checkpointName: string | null;
  unlockedAt: string;
  hasDollBonus: boolean;
}

export interface GamificationStatus {
  totalXp: number;
  currentLevel: number;
  checkinsCount: number;
  stampsUnlocked: number;
  badgesEarned: number;
  nextLevelXp: number;
  stamps: GamificationStamp[];
}

export interface CheckinResult {
  success: boolean;
  checkpointId?: string;
  checkpointName?: string;
  checkpointRegion?: string;
  storyAssetUrl?: string | null;
  xpAwarded?: number;
  totalXp?: number;
  currentLevel?: number;
  nextLevelXp?: number;
  leveledUp?: boolean;
  isNewStamp?: boolean;
  hasDollBonus?: boolean;
  dollName?: string | null;
  dollRegion?: string | null;
  errorCode?: string;
  errorMessage?: string;
}

export interface GamificationCheckpoint {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  storyAssetUrl: string | null;
  isVisited: boolean;
  hasDollBonus: boolean;
  regionDollOwned: boolean;
}

export interface ClaimDollResult {
  success: boolean;
  dollId: string | null;
  dollName: string | null;
  region: string | null;
  retroactiveBonusAwarded: boolean;
  xpAwarded: number;
  totalXp: number;
  currentLevel: number;
  leveledUp: boolean;
}

export const gamificationApi = {
  getStatus: async () => request<GamificationStatus>('/gamification/status', { cache: 'no-store' }),

  checkin: (params: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    checkpointId?: string;
  }) =>
    request<CheckinResult>('/gamification/checkin', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  claimDoll: (dollToken: string) =>
    request<ClaimDollResult>('/gamification/claim-doll', {
      method: 'POST',
      body: JSON.stringify({ dollToken }),
    }),

  getNearbyCheckpoints: (lat: number, lng: number) =>
    request<{ checkpoints: GamificationCheckpoint[]; count: number }>(
      `/gamification/checkpoints/nearby?lat=${lat}&lng=${lng}`
    ),

  getCheckpoints: async () => request<{ checkpoints: GamificationCheckpoint[], count: number }>('/gamification/all-checkpoints', { cache: 'no-store' }),
};
