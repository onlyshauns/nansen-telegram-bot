import { NextResponse } from 'next/server';

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';

  // Test the bot token with getMe
  let getMeResult = null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    getMeResult = await res.json();
  } catch (e) {
    getMeResult = { error: String(e) };
  }

  return NextResponse.json({
    tokenPresent: !!botToken,
    tokenLength: botToken.length,
    tokenStart: botToken.slice(0, 5) + '...',
    tokenEnd: '...' + botToken.slice(-5),
    chatId,
    chatIdLength: chatId.length,
    getMeResult,
  });
}
