#!/usr/bin/env node
import process from 'node:process';
import { loadEnv } from './lib/load-env.mjs';

loadEnv();

const jobs = new Set(['expire-holds', 'process-outbox', 'cleanup-images']);
const job = process.argv[2];
if (!job || !jobs.has(job)) {
  console.error(`Usage: node scripts/run-job.mjs ${[...jobs].join('|')}`);
  process.exit(1);
}

const baseUrl = process.env.APP_BASE_URL;
const secret = process.env.CRON_SECRET;
if (!baseUrl || !secret) {
  console.error('APP_BASE_URL and CRON_SECRET are required.');
  process.exit(1);
}

async function main() {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/jobs/${job}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Job failed (${response.status}): ${body}`);
  console.log(body);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
