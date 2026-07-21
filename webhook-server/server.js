/**
 * GitHub Issues → Jenkins Webhook Receiver
 *
 * Listens for GitHub "issues" webhook events and triggers Jenkins pipelines
 * based on the label applied to the issue:
 *
 *   Label "ci:lint"   → triggers sidequest-lint only
 *   Label "ci:test"   → triggers sidequest-test only
 *   Label "ci:build"  → triggers sidequest-build only
 *   Label "ci:all"    → triggers sidequest-master (runs lint → test → build)
 *
 * Environment variables (set in .env):
 *   PORT                  – port to listen on (default: 3000)
 *   GITHUB_WEBHOOK_SECRET – secret set in the GitHub webhook settings page
 *   JENKINS_URL           – base Jenkins URL, e.g. http://jenkins:8080
 *   JENKINS_USER          – Jenkins username (e.g. admin)
 *   JENKINS_API_TOKEN     – Jenkins API token (User → Configure → API Token)
 */

'use strict';

const express = require('express');
const crypto  = require('crypto');
const axios   = require('axios');
require('dotenv').config();

const app = express();

// ─── Configuration ────────────────────────────────────────────────────────────
const PORT           = process.env.PORT           || 3000;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const JENKINS_URL    = process.env.JENKINS_URL;
const JENKINS_USER   = process.env.JENKINS_USER;
const JENKINS_TOKEN  = process.env.JENKINS_API_TOKEN;

// Label → Jenkins job name mapping
const LABEL_TO_JOB = {
    'ci:lint'  : 'sidequest-lint',
    'ci:test'  : 'sidequest-test',
    'ci:build' : 'sidequest-build',
    'ci:all'   : 'sidequest-master',
};

// ─── Middleware ───────────────────────────────────────────────────────────────
// Keep the raw body buffer so we can verify the HMAC-SHA256 signature.
app.use(express.raw({ type: 'application/json' }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifies the X-Hub-Signature-256 header sent by GitHub.
 * Returns true only when the computed HMAC matches the header exactly.
 */
function verifySignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature || !WEBHOOK_SECRET) {
        console.warn('[webhook] Missing signature or WEBHOOK_SECRET is not set.');
        return false;
    }

    const hmac   = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(req.body).digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    } catch {
        // Buffers have different lengths → definitely not equal
        return false;
    }
}

/**
 * Calls the Jenkins REST API to queue a parameterized build.
 * @param {string} jobName   Jenkins job name (e.g. "sidequest-master")
 * @param {object} params    Key/value pairs passed as build parameters
 * @returns {number}         HTTP status returned by Jenkins (201 = queued)
 */
async function triggerJenkinsJob(jobName, params = {}) {
    const hasParams = Object.keys(params).length > 0;
    const endpoint  = hasParams
        ? `${JENKINS_URL}/job/${encodeURIComponent(jobName)}/buildWithParameters`
        : `${JENKINS_URL}/job/${encodeURIComponent(jobName)}/build`;

    console.log(`[webhook] → Triggering job "${jobName}" at ${endpoint}`);
    console.log(`[webhook]   params:`, params);

    const response = await axios.post(endpoint, null, {
        params,
        auth: { username: JENKINS_USER, password: JENKINS_TOKEN },
        // Jenkins may return 201 Created; axios treats non-2xx as errors by default
        validateStatus: (s) => s >= 200 && s < 400,
    });

    return response.status;
}

// ─── Webhook Endpoint ─────────────────────────────────────────────────────────
app.post('/webhook/github', async (req, res) => {

    // 1. Verify HMAC signature —————————————————————————————————————————————————
    if (!verifySignature(req)) {
        console.warn('[webhook] 401 — invalid or missing signature.');
        return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // 2. Parse JSON body (was kept raw for signature check) ———————————————————
    let payload;
    try {
        payload = JSON.parse(req.body.toString('utf8'));
    } catch {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const event  = req.headers['x-github-event'];
    const action = payload.action;

    console.log(`[webhook] Received event="${event}" action="${action}"`);

    // 3. Only handle issues.labeled ——————————————————————————————————————————
    if (event !== 'issues' || action !== 'labeled') {
        return res.status(200).json({ message: `Event "${event}.${action}" ignored` });
    }

    const labelName  = payload.label?.name   ?? '(unknown)';
    const issueNum   = payload.issue?.number ?? 0;
    const issueTitle = payload.issue?.title  ?? '';
    const repoName   = payload.repository?.full_name ?? '';

    console.log(`[webhook] Issue #${issueNum} in "${repoName}" labeled: "${labelName}"`);
    console.log(`[webhook] Issue title: "${issueTitle}"`);

    // 4. Resolve the Jenkins job ————————————————————————————————————————————————
    const jobName = LABEL_TO_JOB[labelName];
    if (!jobName) {
        console.log(`[webhook] No CI job mapped for label "${labelName}" — ignoring.`);
        return res.status(200).json({
            message : `No CI job mapped for label: ${labelName}`,
            label   : labelName,
        });
    }

    // 5. Trigger Jenkins ————————————————————————————————————————————————————————
    //    Pass issue context as build parameters so the Jenkinsfile can log them.
    try {
        const buildParams = {
            GITHUB_ISSUE_NUMBER : String(issueNum),
            GITHUB_ISSUE_TITLE  : issueTitle,
            TRIGGERED_BY        : 'github-issue-webhook',
        };

        const httpStatus = await triggerJenkinsJob(jobName, buildParams);

        console.log(`[webhook] Jenkins responded with HTTP ${httpStatus} for job "${jobName}"`);
        return res.status(200).json({
            message    : `Triggered Jenkins job: ${jobName}`,
            job        : jobName,
            label      : labelName,
            issue      : issueNum,
            httpStatus,
        });
    } catch (err) {
        const details = err.response
            ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`
            : err.message;

        console.error(`[webhook] Failed to trigger Jenkins job "${jobName}":`, details);
        return res.status(502).json({
            error   : `Failed to trigger Jenkins job: ${jobName}`,
            details,
        });
    }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status  : 'ok',
        jenkins : JENKINS_URL,
        mapping : LABEL_TO_JOB,
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const missingVars = ['GITHUB_WEBHOOK_SECRET', 'JENKINS_URL', 'JENKINS_USER', 'JENKINS_API_TOKEN']
    .filter((v) => !process.env[v]);

if (missingVars.length > 0) {
    console.warn(`[webhook] WARNING: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('[webhook] Copy .env.example → .env and fill in the values before going live.');
}

app.listen(PORT, () => {
    console.log(`[webhook] ─────────────────────────────────────────────`);
    console.log(`[webhook] GitHub Issues → Jenkins Webhook Receiver`);
    console.log(`[webhook] Listening on port ${PORT}`);
    console.log(`[webhook] Jenkins URL : ${JENKINS_URL || '(not set)'}`);
    console.log(`[webhook] Label → Job mapping:`);
    Object.entries(LABEL_TO_JOB).forEach(([label, job]) =>
        console.log(`[webhook]   ${label.padEnd(12)} →  ${job}`)
    );
    console.log(`[webhook] ─────────────────────────────────────────────`);
});
