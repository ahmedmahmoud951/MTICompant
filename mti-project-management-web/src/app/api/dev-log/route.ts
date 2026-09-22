import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timestamp, category, message, data, level } = body;

    // Terminal ANSI colors
    const colors: Record<string, string> = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Bright Green
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Bright Red
      signalr: '\x1b[35m',  // Magenta / Violet
    };

    const color = colors[level] || '\x1b[37m';
    const reset = '\x1b[0m';
    const dim = '\x1b[2m';
    const bold = '\x1b[1m';

    const time = timestamp || new Date().toISOString().split('T')[1].slice(0, 12);
    const cat = (category || 'SYS').toUpperCase().padEnd(7, ' ');
    const extra = data ? `\n    ${dim}${typeof data === 'object' ? JSON.stringify(data) : data}${reset}` : '';

    // Print directly to terminal where npm run dev is running
    console.log(`${dim}[${time}]${reset} ${bold}${color}[MTI-${cat}]${reset} ${message}${extra}`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
