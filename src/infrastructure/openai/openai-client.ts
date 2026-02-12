import OpenAI from 'openai';

export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY. Add it in your .env file.');
  }

  return new OpenAI({ apiKey });
}

export async function verifyOpenAIAuth(client: OpenAI): Promise<void> {
  try {
    await client.models.list();
  } catch (error: unknown) {
    const maybeStatus = (error as { status?: number }).status;
    if (maybeStatus === 401 || maybeStatus === 403) {
      throw new Error(
        'OpenAI auth verification failed (401/403). Check OPENAI_API_KEY and project permissions.'
      );
    }

    const maybeMessage = (error as { message?: string }).message || 'unknown OpenAI error';
    throw new Error(`OpenAI auth verification request failed: ${maybeMessage}`);
  }
}
