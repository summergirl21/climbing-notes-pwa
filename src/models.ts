export type CompletionStyle = 'send_clean' | 'send_rested' | 'attempt';
export type ClimbStyle = 'top_rope' | 'lead';

export type Gym = {
  name: string;
  createdAt: string;
  updatedAt?: string;
};

export type Route = {
  routeId: string;
  gymName: string;
  ropeNumber: string;
  color: string;
  setDate: string;
  grade: string;
  createdAt: string;
  updatedAt?: string;
};

export type Attempt = {
  attemptId: string;
  routeId: string;
  climbDate: string;
  attemptIndex: number;
  climbStyle: ClimbStyle;
  completionStyle: CompletionStyle;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};

export type DataStore = {
  version: number;
  gyms: Gym[];
  routes: Route[];
  attempts: Attempt[];
};

export const createEmptyData = (): DataStore => ({ version: 1, gyms: [], routes: [], attempts: [] });

export const normalizeData = (data: DataStore): DataStore => ({
  version: data.version ?? 1,
  gyms: data.gyms ?? [],
  routes: data.routes ?? [],
  attempts: (data.attempts ?? []).map((attempt) => ({
    ...attempt,
    climbStyle: attempt.climbStyle ?? 'top_rope',
  })),
});
