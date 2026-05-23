import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import sensible from '@fastify/sensible';
import { WebSocketServer } from 'ws';
import { env } from './lib/env';
import { handleTwilioMediaStream } from './coaching/twilio-stream';
import { healthRoute } from './routes/health';
import { runRoute } from './routes/run';
import { generateVerticalRoute } from './routes/generate-vertical';
import { ingestTranscriptRoute } from './routes/ingest-transcript';
import { chatRoute } from './routes/chat';
import { hubspotPushRoute } from './routes/hubspot-push';
import { callInitiateRoute } from './routes/call-initiate';
import { callerIdVerifyRoutes } from './routes/caller-id-verify';
import { twimlRoutes } from './routes/twiml';
import { twilioWebhookRoutes } from './routes/twilio-webhooks';
import { generatePlaybookRoute } from './routes/generate-playbook';
import { enrichCallRoute } from './routes/enrich-call';
import { applyOutcomeRoute } from './routes/apply-outcome';
import { onboardingRoutes } from './routes/onboarding';

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
        : undefined,
  },
  trustProxy: true,
});

await app.register(cors, {
  origin: true,
  credentials: true,
});
await app.register(sensible);
// Twilio webhooks send application/x-www-form-urlencoded
await app.register(formbody);

// Shared-secret guard. Public endpoints (auth-free):
//   /health           — uptime monitoring
//   /twiml/*          — Twilio fetches TwiML during call setup
//   /twilio/*         — Twilio webhooks (validated via X-Twilio-Signature instead)
app.addHook('onRequest', async (req, reply) => {
  const url = req.url;
  if (
    url.startsWith('/health') ||
    url.startsWith('/twiml/') ||
    url.startsWith('/twilio/')
  ) {
    return;
  }
  const secret = req.headers['x-worker-secret'];
  if (secret !== env.WORKER_PROXY_SECRET) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
});

// Routes
await app.register(healthRoute);
await app.register(runRoute);
await app.register(generateVerticalRoute);
await app.register(ingestTranscriptRoute);
await app.register(chatRoute);
await app.register(hubspotPushRoute);
await app.register(callInitiateRoute);
await app.register(callerIdVerifyRoutes);
await app.register(twimlRoutes);
await app.register(twilioWebhookRoutes);
await app.register(generatePlaybookRoute);
await app.register(enrichCallRoute);
await app.register(applyOutcomeRoute);
await app.register(onboardingRoutes);

const port = env.PORT;
await app.listen({ host: '0.0.0.0', port });

// Attach a WebSocket server for Twilio Media Streams on /twilio/media-stream.
// Uses noServer mode so we can route only that path; everything else stays HTTP.
const wss = new WebSocketServer({ noServer: true });

app.server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  console.log(`[ws-upgrade] incoming WS upgrade for ${url.pathname}${url.search}`);
  if (url.pathname === '/twilio/media-stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      const callId = url.searchParams.get('call_id') ?? undefined;
      console.log(`[ws-upgrade] accepted /twilio/media-stream for call_id=${callId}`);
      void handleTwilioMediaStream(ws, { call_id: callId });
    });
  } else {
    console.warn(`[ws-upgrade] rejected — unknown path: ${url.pathname}`);
    socket.destroy();
  }
});

app.log.info({ port, env: env.NODE_ENV }, 'deals-machine-worker started');
