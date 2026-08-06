/**
 * GitHub Issues → Jenkins Webhook Receiver
 *
 * Listens for GitHub "issues" webhook events and triggers the sidequest-master
 * Jenkins pipeline with a PIPELINE_STAGES parameter based on the CI labels
 * applied to the issue.
 *
 * Supported labels:
 *   ci:lint   → PIPELINE_STAGES=lint
 *   ci:test   → PIPELINE_STAGES=test
 *   ci:build  → PIPELINE_STAGES=build
 *   ci:all    → PIPELINE_STAGES=all  (lint → test → build with full gating)
 *
 * Multiple labels on the same issue within the 15-second debounce window are
 * merged into one trigger (e.g. ci:lint + ci:test → PIPELINE_STAGES=lint,test).
 *
 * Handled events:
 *   issues.labeled  – a CI label was applied to an existing issue
 *   issues.opened   – an issue was created that already has CI labels
 *
 * Environment variables (set in .env):
 *   PORT                  – port to listen on (default: 3000)
 *   GITHUB_WEBHOOK_SECRET – secret set in the GitHub webhook settings page
 *   JENKINS_URL           – base Jenkins URL, e.g. http://jenkins:8080
 *   JENKINS_USER          – Jenkins username (e.g. admin)
 *   JENKINS_API_TOKEN     – Jenkins API token (User → Configure → API Token)
 *   TRIGGER_DELAY_MS      – ms to wait before firing (default: 15000)
 */

'use strict';

const express = require('express');
const crypto  = require('crypto');
const axios   = require('axios');
require('dotenv').config();

const app = express();

// ─── Configuration ────────────────────────────────────────────────────────────
const PORT            = process.env.PORT             || 3000;
const WEBHOOK_SECRET  = process.env.GITHUB_WEBHOOK_SECRET;
const JENKINS_URL     = process.env.JENKINS_URL;
const JENKINS_USER    = process.env.JENKINS_USER;
const JENKINS_TOKEN   = process.env.JENKINS_API_TOKEN;
const GITHUB_TOKEN    = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const TRIGGER_DELAY   = parseInt(process.env.TRIGGER_DELAY_MS ?? '15000', 10);

// CI label → pipeline stage token
const LABEL_TO_STAGE = {
    'ci:lint':  'lint',
    'ci:test':  'test',
    'ci:build': 'build',
    'ci:all':   'all',
};

// All individual stage tokens
const ALL_STAGE_TOKENS = new Set(['lint', 'test', 'build']);

// ─── Debounce State ───────────────────────────────────────────────────────────
/**
 * pendingBuilds — keyed by issue number (string).
 * Each value: { timer: TimeoutHandle, labels: Set<string>, issueData: object }
 *
 * When a CI label event arrives for issue N:
 *   1. Add the stage token to pendingBuilds[N].labels
 *   2. Clear & restart the 15-second timer
 * When the timer fires, resolve all accumulated labels → trigger master once.
 */
const pendingBuilds = new Map();

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
        return false; // buffers have different lengths → definitely not equal
    }
}

/**
 * Converts a Set of CI label names into the PIPELINE_STAGES string for master.
 *
 * Rules:
 *   - If the set contains 'all' (from ci:all)            → "all"
 *   - If the set contains all three individual stages     → "all"
 *   - Otherwise join the stage tokens with commas         → e.g. "lint,test"
 *   - If no recognised CI labels → null (nothing to do)
 *
 * @param   {Set<string>} labels   CI label names (e.g. 'ci:lint', 'ci:all')
 * @returns {string|null}          PIPELINE_STAGES value, or null if no CI labels
 */
function resolveStages(labels) {
    const stages = new Set();
    for (const label of labels) {
        const stage = LABEL_TO_STAGE[label];
        if (stage) stages.add(stage);
    }

    if (stages.size === 0)                   return null;
    if (stages.has('all'))                   return 'all';
    if (ALL_STAGE_TOKENS.size === [...stages].filter(s => ALL_STAGE_TOKENS.has(s)).length &&
        [...ALL_STAGE_TOKENS].every(s => stages.has(s))) return 'all';

    return [...stages].join(',');
}

/**
 * Triggers the sidequest-master Jenkins job with the given stage list and
 * issue context parameters.
 *
 * @param {string} pipelineStages  Value for PIPELINE_STAGES (e.g. "all", "lint,test")
 * @param {object} issueData       { issueNum, issueTitle, repoName }
 * @returns {number}               HTTP status returned by Jenkins (201 = queued)
 */
async function triggerMaster(pipelineStages, issueData) {
    const { issueNum, issueTitle, repoName } = issueData;
    const jobName  = 'sidequest-master';
    const endpoint = `${JENKINS_URL}/job/${encodeURIComponent(jobName)}/buildWithParameters`;

    const buildParams = {
        PIPELINE_STAGES:     pipelineStages,
        GITHUB_ISSUE_NUMBER: String(issueNum),
        GITHUB_ISSUE_TITLE:  issueTitle,
        GITHUB_REPO:         repoName,
        TRIGGERED_BY:        'github-issue-webhook',
    };

    console.log(`[webhook] → Triggering sidequest-master`);
    console.log(`[webhook]   PIPELINE_STAGES : ${pipelineStages}`);
    console.log(`[webhook]   Issue            : #${issueNum} "${issueTitle}" in ${repoName}`);

    const response = await axios.post(endpoint, null, {
        params: buildParams,
        auth:   { username: JENKINS_USER, password: JENKINS_TOKEN },
        validateStatus: (s) => s >= 200 && s < 400,
    });

    console.log(`[webhook] Jenkins responded HTTP ${response.status} for sidequest-master`);
    return response.status;
}

/**
 * Triggers the sidequest-master Jenkins job for Pull Request events with
 * PIPELINE_STAGES=all.
 *
 * @param {object} prData  { prNum, prTitle, prSha, prHeadRef, repoName }
 * @returns {number}       HTTP status returned by Jenkins (201 = queued)
 */
async function triggerMasterForPR(prData) {
    const { prNum, prTitle, prSha, prHeadRef, repoName } = prData;
    const jobName  = 'sidequest-master';
    const endpoint = `${JENKINS_URL}/job/${encodeURIComponent(jobName)}/buildWithParameters`;

    const buildParams = {
        PIPELINE_STAGES:     'all',
        GITHUB_PR_NUMBER:    String(prNum),
        GITHUB_PR_TITLE:     prTitle,
        GITHUB_PR_SHA:       prSha,
        GITHUB_PR_HEAD_REF:  prHeadRef,
        GITHUB_REPO:         repoName,
        TRIGGERED_BY:        'github-pr-webhook',
    };

    console.log(`[webhook] → Triggering sidequest-master for PR #${prNum}`);
    console.log(`[webhook]   PIPELINE_STAGES : all`);
    console.log(`[webhook]   PR               : #${prNum} "${prTitle}" (${prHeadRef}@${prSha}) in ${repoName}`);

    const response = await axios.post(endpoint, null, {
        params: buildParams,
        auth:   { username: JENKINS_USER, password: JENKINS_TOKEN },
        validateStatus: (s) => s >= 200 && s < 400,
    });

    console.log(`[webhook] Jenkins responded HTTP ${response.status} for sidequest-master (PR #${prNum})`);
    return response.status;
}

/**
 * Parses a comment body for CI slash commands (/lint, /test, /build, /all).
 * Returns canonical stage string (e.g., 'all', 'lint,test', 'lint,build') or null if no command found.
 */
function parsePRCommentCommands(commentBody) {
    if (!commentBody || typeof commentBody !== 'string') return null;

    const matches = commentBody.match(/\/(lint|test|build|all)\b/gi);
    if (!matches) return null;

    const commands = new Set(matches.map((m) => m.substring(1).toLowerCase()));
    if (commands.size === 0) return null;

    if (commands.has('all')) return 'all';

    const canonicalOrder = ['lint', 'test', 'build'];
    const requested = canonicalOrder.filter((stage) => commands.has(stage));

    if (requested.length === 0) return null;
    if (requested.length === 3) return 'all';

    return requested.join(',');
}

/**
 * Fetches pull request details (head SHA, head branch ref, and title) from GitHub REST API.
 */
async function fetchPRDetails(repoName, prNum) {
    const url = `https://api.github.com/repos/${repoName}/pulls/${prNum}`;
    const headers = {
        'User-Agent': 'sidequest-webhook-server',
        'Accept':     'application/vnd.github+json',
    };
    if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    try {
        const res = await axios.get(url, { headers });
        return {
            prSha:     res.data?.head?.sha  || '',
            prHeadRef: res.data?.head?.ref  || '',
            prTitle:   res.data?.title      || '',
        };
    } catch (err) {
        console.warn(`[webhook] Could not fetch PR #${prNum} details via GitHub API: ${err.message}`);
        return { prSha: '', prHeadRef: '', prTitle: '' };
    }
}

/**
 * Adds an emoji reaction (e.g. "eyes") to a GitHub issue/PR comment.
 */
async function addCommentReaction(repoName, commentId, reaction = 'eyes') {
    if (!commentId || !repoName) return;

    const url = `https://api.github.com/repos/${repoName}/issues/comments/${commentId}/reactions`;
    const headers = {
        'User-Agent': 'sidequest-webhook-server',
        'Accept':     'application/vnd.github+json',
    };
    if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    } else {
        console.warn('[webhook] Skipping reaction (GITHUB_TOKEN / GH_TOKEN not set).');
        return;
    }

    try {
        await axios.post(url, { content: reaction }, { headers });
        console.log(`[webhook] Added "${reaction}" reaction to comment #${commentId}`);
    } catch (err) {
        console.warn(`[webhook] Failed to add reaction to comment #${commentId}: ${err.message}`);
    }
}

/**
 * Triggers the sidequest-master Jenkins job for PR comment triggers.
 *
 * @param {object} prData  { prNum, prTitle, prSha, prHeadRef, repoName, stages, commentId }
 * @returns {number}       HTTP status returned by Jenkins (201 = queued)
 */
async function triggerMasterForPRComment(prData) {
    const { prNum, prTitle, prSha, prHeadRef, repoName, stages, commentId } = prData;
    const jobName  = 'sidequest-master';
    const endpoint = `${JENKINS_URL}/job/${encodeURIComponent(jobName)}/buildWithParameters`;

    const buildParams = {
        PIPELINE_STAGES:     stages,
        GITHUB_PR_NUMBER:    String(prNum),
        GITHUB_PR_TITLE:     prTitle,
        GITHUB_PR_SHA:       prSha,
        GITHUB_PR_HEAD_REF:  prHeadRef,
        GITHUB_REPO:         repoName,
        GITHUB_COMMENT_ID:   String(commentId || ''),
        TRIGGERED_BY:        'github-comment-webhook',
    };

    console.log(`[webhook] → Triggering sidequest-master for PR comment #${commentId} on PR #${prNum}`);
    console.log(`[webhook]   PIPELINE_STAGES : ${stages}`);
    console.log(`[webhook]   PR               : #${prNum} "${prTitle}" (${prHeadRef}@${prSha}) in ${repoName}`);

    const response = await axios.post(endpoint, null, {
        params: buildParams,
        auth:   { username: JENKINS_USER, password: JENKINS_TOKEN },
        validateStatus: (s) => s >= 200 && s < 400,
    });

    console.log(`[webhook] Jenkins responded HTTP ${response.status} for sidequest-master (PR Comment #${commentId})`);
    return response.status;
}

/**
 * Schedules (or re-schedules) a master build for the given issue.
 * If a pending timer already exists for this issue it is reset, giving a fresh
 * 15-second window for additional labels to arrive.
 *
 * @param {number} issueNum     GitHub issue number
 * @param {string} labelName    CI label just applied (may be null for issues.opened scan)
 * @param {object} issueData    { issueNum, issueTitle, repoName }
 */
function scheduleBuild(issueNum, labelName, issueData) {
    const key = String(issueNum);

    // Retrieve or create the pending entry for this issue
    let pending = pendingBuilds.get(key);
    if (!pending) {
        pending = { timer: null, labels: new Set(), issueData };
        pendingBuilds.set(key, pending);
    }

    // Add the new label (if provided)
    if (labelName) {
        pending.labels.add(labelName);
        console.log(`[webhook] Issue #${issueNum} — accumulated labels: [${[...pending.labels].join(', ')}] (${TRIGGER_DELAY / 1000}s timer reset)`);
    }

    // Reset the debounce timer
    if (pending.timer) clearTimeout(pending.timer);

    pending.timer = setTimeout(async () => {
        pendingBuilds.delete(key);

        const stages = resolveStages(pending.labels);
        if (!stages) {
            console.log(`[webhook] Issue #${issueNum} — no recognised CI labels; skipping.`);
            return;
        }

        console.log(`[webhook] Issue #${issueNum} — debounce elapsed → triggering master with PIPELINE_STAGES="${stages}"`);
        try {
            await triggerMaster(stages, pending.issueData);
        } catch (err) {
            const details = err.response
                ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`
                : err.message;
            console.error(`[webhook] Failed to trigger sidequest-master for issue #${issueNum}:`, details);
        }
    }, TRIGGER_DELAY);
}

// ─── Webhook Endpoint ─────────────────────────────────────────────────────────
app.post('/webhook/github', async (req, res) => {

    // 1. Verify HMAC signature ─────────────────────────────────────────────────
    if (!verifySignature(req)) {
        console.warn('[webhook] 401 — invalid or missing signature.');
        return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // 2. Parse JSON body ────────────────────────────────────────────────────────
    let payload;
    try {
        payload = JSON.parse(req.body.toString('utf8'));
    } catch {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const event  = req.headers['x-github-event'];
    const action = payload.action;

    console.log(`[webhook] Received event="${event}" action="${action}"`);

    // 3. Check for CI slash commands across any event type (pull_request, issue_comment, pull_request_review, etc.) ─────
    const commentBody = payload.comment?.body || payload.review?.body || (action === 'edited' ? payload.pull_request?.body : null) || '';
    const stages      = parsePRCommentCommands(commentBody);

    if (stages) {
        const prNum     = payload.pull_request?.number ?? payload.issue?.number ?? 0;
        const repoName  = payload.repository?.full_name ?? '';
        const commentId = payload.comment?.id ?? payload.review?.id ?? 0;

        let prSha     = payload.pull_request?.head?.sha ?? '';
        let prHeadRef = payload.pull_request?.head?.ref ?? '';
        let prTitle   = payload.pull_request?.title     ?? payload.issue?.title ?? '';

        console.log(`[webhook] Event "${event}" (action="${action}") contains CI command: stages="${stages}" for PR #${prNum}`);

        // React with 👀 to acknowledge comment receipt (if commentId present)
        if (commentId) {
            await addCommentReaction(repoName, commentId, 'eyes');
        }

        // If PR head details missing from payload, fetch via GitHub API
        if (!prSha && prNum && repoName) {
            const details = await fetchPRDetails(repoName, prNum);
            prSha     = details.prSha     || prSha;
            prHeadRef = details.prHeadRef || prHeadRef;
            prTitle   = details.prTitle   || prTitle;
        }

        const prData = { prNum, prTitle, prSha, prHeadRef, repoName, stages, commentId };

        try {
            await triggerMasterForPRComment(prData);
            return res.status(200).json({
                message:   `Jenkins CI triggered for PR #${prNum} comment/command`,
                pr:         prNum,
                stages:     stages,
                commentId:  commentId,
                sha:        prSha,
            });
        } catch (err) {
            const details = err.response
                ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`
                : err.message;
            console.error(`[webhook] Failed to trigger sidequest-master for PR comment on #${prNum}:`, details);
            return res.status(500).json({ error: `Failed to trigger Jenkins for PR #${prNum}`, details });
        }
    }

    // 4. Handle standard Pull Request events (opened, synchronize, reopened) ────
    if (event === 'pull_request') {
        const targetBranch = payload.pull_request?.base?.ref;
        if (targetBranch !== 'main') {
            console.log(`[webhook] PR target branch "${targetBranch}" is not "main" — ignoring.`);
            return res.status(200).json({ message: `PR target branch "${targetBranch}" is not main; ignored` });
        }

        if (!['opened', 'synchronize', 'reopened'].includes(action)) {
            console.log(`[webhook] PR action "${action}" ignored.`);
            return res.status(200).json({ message: `PR action "${action}" ignored` });
        }

        const prNum     = payload.pull_request?.number ?? 0;
        const prTitle   = payload.pull_request?.title  ?? '';
        const prSha     = payload.pull_request?.head?.sha ?? '';
        const prHeadRef = payload.pull_request?.head?.ref ?? '';
        const repoName  = payload.repository?.full_name ?? '';
        const prData    = { prNum, prTitle, prSha, prHeadRef, repoName };

        console.log(`[webhook] PR #${prNum} "${prTitle}" (${prHeadRef}@${prSha}) ${action} against main`);

        try {
            await triggerMasterForPR(prData);
            return res.status(200).json({
                message: `Jenkins CI triggered for PR #${prNum}`,
                pr:       prNum,
                action:   action,
                sha:      prSha,
            });
        } catch (err) {
            const details = err.response
                ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`
                : err.message;
            console.error(`[webhook] Failed to trigger sidequest-master for PR #${prNum}:`, details);
            return res.status(500).json({ error: `Failed to trigger Jenkins for PR #${prNum}`, details });
        }
    }

    // 4. Handle Issues events ──────────────────────────────────────────────────
    if (event !== 'issues') {
        return res.status(200).json({ message: `Event "${event}" ignored` });
    }

    const issueNum   = payload.issue?.number  ?? 0;
    const issueTitle = payload.issue?.title   ?? '';
    const repoName   = payload.repository?.full_name ?? '';
    const issueData  = { issueNum, issueTitle, repoName };

    // ── Case A: a label was just applied ──────────────────────────────────────
    if (action === 'labeled') {
        const labelName = payload.label?.name ?? '';
        console.log(`[webhook] Issue #${issueNum} labeled: "${labelName}"`);

        if (!LABEL_TO_STAGE[labelName]) {
            console.log(`[webhook] Label "${labelName}" is not a CI label — ignoring.`);
            return res.status(200).json({ message: `Label "${labelName}" not a CI label; ignored` });
        }

        scheduleBuild(issueNum, labelName, issueData);

        return res.status(200).json({
            message:     `CI label received; build scheduled in ${TRIGGER_DELAY / 1000}s`,
            issue:       issueNum,
            label:       labelName,
            triggerInMs: TRIGGER_DELAY,
        });
    }

    // ── Case B: issue was just opened — check its existing labels ─────────────
    if (action === 'opened') {
        const existingLabels = (payload.issue?.labels ?? []).map((l) => l.name);
        const ciLabels = existingLabels.filter((l) => LABEL_TO_STAGE[l]);

        console.log(`[webhook] Issue #${issueNum} opened — labels: [${existingLabels.join(', ') || 'none'}]`);

        if (ciLabels.length === 0) {
            return res.status(200).json({ message: 'No CI labels on new issue; ignored' });
        }

        for (const label of ciLabels) {
            scheduleBuild(issueNum, label, issueData);
        }

        return res.status(200).json({
            message:     `CI labels found on new issue; build scheduled in ${TRIGGER_DELAY / 1000}s`,
            issue:       issueNum,
            ciLabels,
            triggerInMs: TRIGGER_DELAY,
        });
    }

    // ── Anything else (closed, edited, unlabeled, …) ─────────────────────────
    return res.status(200).json({ message: `Action "${action}" ignored` });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status:        'ok',
        jenkins:       JENKINS_URL,
        triggerDelayMs: TRIGGER_DELAY,
        labelMapping:  LABEL_TO_STAGE,
        pendingBuilds: Object.fromEntries(
            [...pendingBuilds.entries()].map(([k, v]) => [
                `issue#${k}`,
                { labels: [...v.labels], issueTitle: v.issueData.issueTitle },
            ])
        ),
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
    console.log(`[webhook] ─────────────────────────────────────────────────────`);
    console.log(`[webhook] GitHub Issues → Jenkins Webhook Receiver`);
    console.log(`[webhook] Listening on port ${PORT}`);
    console.log(`[webhook] Jenkins URL      : ${JENKINS_URL || '(not set)'}`);
    console.log(`[webhook] Trigger delay    : ${TRIGGER_DELAY / 1000}s`);
    console.log(`[webhook] CI label mapping :`);
    Object.entries(LABEL_TO_STAGE).forEach(([label, stage]) =>
        console.log(`[webhook]   ${label.padEnd(12)} →  PIPELINE_STAGES=${stage}`)
    );
    console.log(`[webhook] ─────────────────────────────────────────────────────`);
});
