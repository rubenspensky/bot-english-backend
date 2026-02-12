export type SessionStatus = 'in_progress' | 'completed';

export interface TimingSummary {
  avgResponseDelaySec: number;
  longPausesCount: number;
  totalTurns: number;
}

export interface CorrectionItem {
  original: string;
  corrected: string;
  reason: string;
}

export interface ImprovedBestAnswer {
  question: string;
  answer: string;
}

export interface InterviewFeedback {
  timingSummary: TimingSummary;
  corrections: CorrectionItem[];
  improvedBestAnswer: ImprovedBestAnswer;
  interviewTips: string[];
}

export interface SessionTurn {
  question: string;
  answer: string;
  followUpQuestion: string | null;
  followUpAnswer: string | null;
  mainResponseDelaySec: number;
  followUpResponseDelaySec: number | null;
}

export interface InterviewSession {
  id: string;
  createdAt: string;
  status: SessionStatus;
  allowFollowUps: boolean;
  questions: string[];
  questionIndex: number;
  awaitingFollowUp: boolean;
  pendingFollowUpQuestion: string | null;
  turns: SessionTurn[];
  result: InterviewFeedback | null;
}
