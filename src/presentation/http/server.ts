import Fastify, { type FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { z } from 'zod';
import { NotFoundError } from '../../application/errors/not-found-error.js';
import { ValidationError } from '../../application/errors/validation-error.js';
import { CreateSessionUseCase } from '../../application/use-cases/create-session.js';
import { GetCurrentPromptUseCase } from '../../application/use-cases/get-current-prompt.js';
import { GetSessionResultUseCase } from '../../application/use-cases/get-session-result.js';
import { SubmitAnswerUseCase } from '../../application/use-cases/submit-answer.js';
import { SynthesizeSpeechUseCase } from '../../application/use-cases/synthesize-speech.js';

const createSessionSchema = z.object({
  questionCount: z.number().int().min(1).max(10).optional(),
  allowFollowUps: z.boolean().optional()
});

const synthesizeSpeechSchema = z.object({
  text: z.string().min(1).max(5000)
});

const submitAnswerSchema = z.object({
  answerText: z.string().min(1).optional(),
  audioBase64: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  responseDelaySec: z.number().min(0).optional()
});

const errorResponseSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string' }
  }
} as const;

const sessionIdParamSchema = {
  type: 'object',
  required: ['sessionId'],
  properties: {
    sessionId: { type: 'string', format: 'uuid' }
  }
} as const;

export function buildServer(deps: {
  createSession: CreateSessionUseCase;
  getCurrentPrompt: GetCurrentPromptUseCase;
  submitAnswer: SubmitAnswerUseCase;
  getSessionResult: GetSessionResultUseCase;
  synthesizeSpeech: SynthesizeSpeechUseCase;
}): Promise<FastifyInstance> {
  const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });

  return registerAndBuild(app, deps);
}

async function registerAndBuild(
  app: FastifyInstance,
  deps: {
    createSession: CreateSessionUseCase;
    getCurrentPrompt: GetCurrentPromptUseCase;
    submitAnswer: SubmitAnswerUseCase;
    getSessionResult: GetSessionResultUseCase;
    synthesizeSpeech: SynthesizeSpeechUseCase;
  }
): Promise<FastifyInstance> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Bot English Coach API',
        version: '1.0.0',
        description: 'Backend API for interview coaching sessions.'
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  });

  app.get(
    '/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Health check',
        response: {
          200: {
            type: 'object',
            required: ['status'],
            properties: {
              status: { type: 'string', enum: ['ok'] }
            }
          }
        }
      }
    },
    async () => ({ status: 'ok' })
  );

  app.get(
    '/openapi.json',
    {
      schema: {
        tags: ['System'],
        summary: 'Generated OpenAPI document',
        response: {
          200: { type: 'object' }
        }
      }
    },
    async () => app.swagger()
  );

  app.post(
    '/sessions',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Start an interview session',
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            questionCount: { type: 'integer', minimum: 1, maximum: 10 },
            allowFollowUps: { type: 'boolean' }
          }
        },
        response: {
          201: {
            type: 'object',
            required: [
              'sessionId',
              'status',
              'allowFollowUps',
              'questionNumber',
              'totalQuestions',
              'promptType',
              'prompt'
            ],
            properties: {
              sessionId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['in_progress'] },
              allowFollowUps: { type: 'boolean' },
              questionNumber: { type: 'integer' },
              totalQuestions: { type: 'integer' },
              promptType: { type: 'string', enum: ['question'] },
              prompt: { type: 'string' }
            }
          },
          400: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request, reply) => {
      const parsed = createSessionSchema.safeParse(request.body || {});
      if (!parsed.success) {
        throw new ValidationError('Invalid request body for creating session.');
      }

      const session = await deps.createSession.execute({
        questionCount: parsed.data.questionCount,
        allowFollowUps: parsed.data.allowFollowUps
      });

      return reply.status(201).send({
        sessionId: session.id,
        status: session.status,
        allowFollowUps: session.allowFollowUps,
        questionNumber: 1,
        totalQuestions: session.questions.length,
        promptType: 'question',
        prompt: session.questions[0]
      });
    }
  );

  app.get(
    '/sessions/:sessionId/question',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Get current prompt for a session',
        params: sessionIdParamSchema,
        response: {
          200: {
            type: 'object',
            required: [
              'sessionId',
              'status',
              'prompt',
              'promptType',
              'questionNumber',
              'totalQuestions'
            ],
            properties: {
              sessionId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['in_progress', 'completed'] },
              prompt: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              promptType: { type: 'string', enum: ['question', 'follow_up', 'completed'] },
              questionNumber: { type: 'integer' },
              totalQuestions: { type: 'integer' }
            }
          },
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request) => {
      const params = z.object({ sessionId: z.string().uuid() }).parse(request.params);
      return deps.getCurrentPrompt.execute({ sessionId: params.sessionId });
    }
  );

  app.post(
    '/sessions/:sessionId/answer',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Submit answer text/audio for current prompt',
        params: sessionIdParamSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            answerText: { type: 'string', minLength: 1 },
            audioBase64: { type: 'string', minLength: 1 },
            mimeType: { type: 'string', minLength: 1 },
            responseDelaySec: { type: 'number', minimum: 0 }
          },
          anyOf: [{ required: ['answerText'] }, { required: ['audioBase64'] }]
        },
        response: {
          200: {
            type: 'object',
            required: [
              'sessionId',
              'status',
              'usedTranscript',
              'interviewerMessage',
              'nextPrompt',
              'promptType',
              'result'
            ],
            properties: {
              sessionId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['in_progress', 'completed'] },
              usedTranscript: { type: 'string' },
              interviewerMessage: { type: 'string' },
              nextPrompt: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              promptType: { type: 'string', enum: ['question', 'follow_up', 'completed'] },
              result: {
                anyOf: [
                  { type: 'null' },
                  {
                    type: 'object',
                    required: ['timingSummary', 'corrections', 'improvedBestAnswer', 'interviewTips'],
                    properties: {
                      timingSummary: {
                        type: 'object',
                        required: ['avgResponseDelaySec', 'longPausesCount', 'totalTurns'],
                        properties: {
                          avgResponseDelaySec: { type: 'number' },
                          longPausesCount: { type: 'integer' },
                          totalTurns: { type: 'integer' }
                        }
                      },
                      corrections: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['original', 'corrected', 'reason'],
                          properties: {
                            original: { type: 'string' },
                            corrected: { type: 'string' },
                            reason: { type: 'string' }
                          }
                        }
                      },
                      improvedBestAnswer: {
                        type: 'object',
                        required: ['question', 'answer'],
                        properties: {
                          question: { type: 'string' },
                          answer: { type: 'string' }
                        }
                      },
                      interviewTips: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                ]
              }
            }
          },
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request) => {
      const params = z.object({ sessionId: z.string().uuid() }).parse(request.params);
      const parsed = submitAnswerSchema.safeParse(request.body || {});

      if (!parsed.success) {
        throw new ValidationError('Invalid request body for answer submission.');
      }

      if (!parsed.data.answerText && !parsed.data.audioBase64) {
        throw new ValidationError('Provide either answerText or audioBase64.');
      }

      return deps.submitAnswer.execute({
        sessionId: params.sessionId,
        answerText: parsed.data.answerText,
        audioBase64: parsed.data.audioBase64,
        mimeType: parsed.data.mimeType,
        responseDelaySec: parsed.data.responseDelaySec
      });
    }
  );

  app.get(
    '/sessions/:sessionId/result',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Get final session result/feedback',
        params: sessionIdParamSchema,
        response: {
          200: {
            type: 'object',
            required: ['sessionId', 'status', 'result'],
            properties: {
              sessionId: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['in_progress', 'completed'] },
              result: {
                anyOf: [
                  { type: 'null' },
                  {
                    type: 'object',
                    required: ['timingSummary', 'corrections', 'improvedBestAnswer', 'interviewTips'],
                    properties: {
                      timingSummary: {
                        type: 'object',
                        required: ['avgResponseDelaySec', 'longPausesCount', 'totalTurns'],
                        properties: {
                          avgResponseDelaySec: { type: 'number' },
                          longPausesCount: { type: 'integer' },
                          totalTurns: { type: 'integer' }
                        }
                      },
                      corrections: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['original', 'corrected', 'reason'],
                          properties: {
                            original: { type: 'string' },
                            corrected: { type: 'string' },
                            reason: { type: 'string' }
                          }
                        }
                      },
                      improvedBestAnswer: {
                        type: 'object',
                        required: ['question', 'answer'],
                        properties: {
                          question: { type: 'string' },
                          answer: { type: 'string' }
                        }
                      },
                      interviewTips: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                ]
              }
            }
          },
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request) => {
      const params = z.object({ sessionId: z.string().uuid() }).parse(request.params);
      return deps.getSessionResult.execute({ sessionId: params.sessionId });
    }
  );

  app.post(
    '/tts',
    {
      schema: {
        tags: ['TTS'],
        summary: 'Synthesize speech from text',
        body: {
          type: 'object',
          required: ['text'],
          additionalProperties: false,
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 5000 }
          }
        },
        response: {
          200: {
            type: 'string',
            description: 'MP3 audio binary'
          },
          400: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request, reply) => {
      const parsed = synthesizeSpeechSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request body for TTS.');
      }

      const result = await deps.synthesizeSpeech.execute({ text: parsed.data.text });
      return reply.header('Content-Type', result.mimeType).send(result.audio);
    }
  );

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError || error instanceof ValidationError) {
      reply.status(400).send({ error: error.message });
      return;
    }

    if (error instanceof NotFoundError) {
      reply.status(404).send({ error: error.message });
      return;
    }

    request.log.error(error);
    reply.status(500).send({ error: 'Internal server error' });
  });

  return app;
}
