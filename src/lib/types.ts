/**
 * Common types used throughout the application
 */

export type Quiz = {
  id: number;
  title: string;
  theme: string;
  event_name?: string;
  event_date?: string;
  created_by: string | null;
  active?: boolean;
  questions?: Question[];
  primary_color?: string;
  quiz_started?: boolean;
  launched_at?: string;
  started_at?: string;
  ended_at?: string;
  active_question_id?: string | null;
  finished?: boolean;
}

export type Question = {
  id: string;
  quiz_id: number;
  title: string;
  content?: string;
  options: string[];
  correct: number;
  correct_option?: string;
  duration?: number;
  image_url?: string;
  order_index?: number;
}

export type Participant = {
  id: string;
  name: string;
  quiz_id: string | number;
  avatar?: string;
  avatar_emoji?: string;
  avatar_id?: string;
  connected_at?: string;
  score?: number;
}

export type ParticipantAnswer = {
  id: string;
  participant_id: string;
  question_id: string;
  selected_option: number;
  answered_at: string;
  score?: number;
  participants?: Participant;
}

export type Theme = {
  id: string;
  name: string;
  description?: string;
}

export type ThemeQuestion = {
  id: string;
  theme_id: string;
  content: string;
  options: string[];
  correct_option: string;
  duration: number;
  image_url?: string;
}

export type ActiveQuestion = {
  quiz_id: string;
  question_id: string;
  show_results: boolean;
  correct_option?: number;
  stage?: 'question' | 'answer' | 'results' | 'next';
}

export type NotificationType = 'success' | 'error' | 'info';

export type Notification = {
  show: boolean;
  message: string;
  type: NotificationType;
}
