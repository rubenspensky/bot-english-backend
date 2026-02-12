import type OpenAI from 'openai';
import type {
  InterviewCoachService,
  InterviewerReply,
  TranscriptTurn
} from '../../domain/services/interview-coach-service.js';
import type { InterviewFeedback, ImprovedBestAnswer, CorrectionItem, TimingSummary } from '../../domain/entities/session.js';
import { MODEL } from './config.js';

export class OpenAIInterviewCoachService implements InterviewCoachService {
  constructor(private readonly client: OpenAI) {}

  async generateInterviewerReply(params: {
    question: string;
    answer: string;
  }): Promise<InterviewerReply> {
    const prompt = [
      'You are a friendly big-tech interviewer.',
      'Given the question and candidate answer, return strict JSON with keys:',
      '- replyText: short spoken response (1-2 sentences)',
      '- followUpQuestion: either one concise follow-up question OR null',
      'Rules:',
      '- Ask at most one follow-up question.',
      '- Keep tone encouraging and professional.',
      '- JSON only, no markdown.'
    ].join('\n');

    const completion = await this.client.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.5,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(params) }
      ]
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = safeJson(content);

    return {
      replyText:
        typeof parsed.replyText === 'string'
          ? parsed.replyText
          : 'Thanks, that helps me understand your approach.',
      followUpQuestion:
        typeof parsed.followUpQuestion === 'string' && parsed.followUpQuestion.trim()
          ? parsed.followUpQuestion.trim()
          : null
    };
  }

  async generateFollowUpClose(params: {
    question: string;
    answer: string;
    followUpQuestion: string;
    followUpAnswer: string;
  }): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are a friendly interviewer. Write one short spoken acknowledgement (max 20 words). No follow-up question.'
        },
        { role: 'user', content: JSON.stringify(params) }
      ]
    });

    return completion.choices[0]?.message?.content?.trim() || 'Thanks for clarifying.';
  }

  async generateFeedback(params: {
    timingSummary: TimingSummary;
    transcript: TranscriptTurn[];
  }): Promise<InterviewFeedback> {
    const prompt = [
      'You are an English coach for technical interviews.',
      'Return strict JSON with shape:',
      '{',
      '  "timingSummary": { "avgResponseDelaySec": number, "longPausesCount": number, "totalTurns": number },',
      '  "corrections": [',
      '    { "original": string, "corrected": string, "reason": string }',
      '  ],',
      '  "improvedBestAnswer": { "question": string, "answer": string },',
      '  "interviewTips": [string]',
      '}',
      'Rules:',
      '- Provide 5 to 8 corrections.',
      '- Provide 2 to 3 interviewTips.',
      '- improvedBestAnswer must be concise and interview-quality.',
      '- JSON only.'
    ].join('\n');

    const completion = await this.client.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.4,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(params) }
      ]
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = safeJson(content);

    return {
      timingSummary: params.timingSummary,
      corrections: normalizeCorrections(parsed.corrections),
      improvedBestAnswer: normalizeImprovedAnswer(parsed.improvedBestAnswer),
      interviewTips: normalizeTips(parsed.interviewTips)
    };
  }
}

function normalizeCorrections(value: unknown): CorrectionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const valueItem = item as Record<string, unknown>;
      return {
        original: String(valueItem.original || '').trim(),
        corrected: String(valueItem.corrected || '').trim(),
        reason: String(valueItem.reason || '').trim()
      };
    })
    .filter((item) => item.original && item.corrected && item.reason)
    .slice(0, 8);
}

function normalizeImprovedAnswer(value: unknown): ImprovedBestAnswer {
  if (!value || typeof value !== 'object') {
    return { question: '', answer: '' };
  }

  const normalized = value as Record<string, unknown>;

  return {
    question: String(normalized.question || '').trim(),
    answer: String(normalized.answer || '').trim()
  };
}

function normalizeTips(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((tip) => String(tip || '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function safeJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}
