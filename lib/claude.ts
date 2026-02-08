import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes('your_')) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function generateContent(params: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}): Promise<string> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: params.maxTokens || 4096,
    system: params.systemPrompt,
    messages: [
      { role: 'user', content: params.userPrompt },
    ],
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  if (!textBlock?.text) {
    throw new Error('Claude returned no text content');
  }

  return textBlock.text;
}
