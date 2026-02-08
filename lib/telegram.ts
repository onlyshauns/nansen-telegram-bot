const TELEGRAM_API = 'https://api.telegram.org';

export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
}): Promise<number[]> {
  const { botToken, chatId, text, parseMode = 'HTML' } = params;

  const chunks = splitMessage(text, 4096);
  const messageIds: number[] = [];

  for (const chunk of chunks) {
    const response = await fetch(
      `${TELEGRAM_API}/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await response.json();

    if (!result.ok) {
      throw new Error(
        `Telegram API error: ${result.description || 'Unknown error'}`
      );
    }

    messageIds.push(result.result.message_id);
  }

  return messageIds;
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at double newline (paragraph boundary)
    let splitIndex = remaining.lastIndexOf('\n\n', maxLength);

    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      // Fall back to single newline
      splitIndex = remaining.lastIndexOf('\n', maxLength);
    }

    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      // Last resort: split at max length
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}
