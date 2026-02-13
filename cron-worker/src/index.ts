export interface Env {
  CRON_SECRET: string;
  API_BASE_URL: string;
}

// Day of week routing for the 6pm SGT trigger (0=Sun in JS Date.getUTCDay())
const DAY_ENDPOINT: Record<number, string> = {
  0: "/api/generate/day-a", // Sun
  1: "/api/generate/day-a", // Mon
  2: "/api/generate/day-b", // Tue
  3: "/api/generate/day-a", // Wed
  4: "/api/generate/day-b", // Thu
  5: "/api/generate/day-c", // Fri
  6: "/api/generate/day-b", // Sat
};

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const now = new Date(controller.scheduledTime);
    let endpoint: string;

    if (controller.cron === "0 2 * * *") {
      endpoint = "/api/generate/news";
    } else {
      endpoint = DAY_ENDPOINT[now.getUTCDay()];
    }

    if (!endpoint) {
      console.log(`No endpoint for cron=${controller.cron} dow=${now.getUTCDay()}`);
      return;
    }

    const url = `${env.API_BASE_URL}${endpoint}`;
    console.log(`Triggering ${url} at ${now.toISOString()}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CRON_SECRET}`,
      },
    });

    const body = await response.text();
    console.log(`Response: ${response.status} ${body.substring(0, 200)}`);

    if (!response.ok) {
      throw new Error(`Failed: ${response.status} ${body.substring(0, 200)}`);
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(
      JSON.stringify({
        name: "nansen-telegram-cron",
        schedules: [
          "News: 10am SGT daily (02:00 UTC)",
          "Day A: 6pm SGT Sun/Mon/Wed (10:00 UTC)",
          "Day B: 6pm SGT Tue/Thu/Sat (10:00 UTC)",
          "Day C: 6pm SGT Fri (10:00 UTC)",
        ],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};
