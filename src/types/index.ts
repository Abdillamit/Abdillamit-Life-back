export type MoodTrend = 'improving' | 'declining' | 'stable';

export type EventType =
  | 'education'
  | 'work'
  | 'personal'
  | 'achievement'
  | 'travel'
  | 'milestone';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export interface Profile {
  id: string;
  name: string;
  birth_date: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  mood: number | null;
  tags: string[];
  photos: string[];
  date: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: EventType | null;
  icon: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  progress: number;
  status: GoalStatus;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiDigest {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  created_at: string;
}

export interface WeeklyDigestResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  mood_trend: MoodTrend;
}
