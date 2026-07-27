/*
 * MASTER / UPSTREAM JOB: sidequest-master
 *
 * This pipeline is the sole entry point for the CI system. It:
 *   1. Creates an isolated Docker bridge network for this build.
 *   2. Triggers downstream jobs in sequence, passing the network name
 *      and this build number as parameters.
 *   3. Gates each successive job on the result of the previous one:
 *
 *      Lint SUCCESS  → trigger Test
 *      Lint FAILURE  → skip Test and Build, mark master FAILURE
 *
 *      Test SUCCESS  → trigger Build
 *      Test UNSTABLE → trigger Build (build still runs; master marked UNSTABLE)
 *      Test FAILURE  → skip Build, mark master FAILURE
 *
 *      Build SUCCESS → master SUCCESS
 *      Build FAILURE → master FAILURE
 *
 * Downstream job script paths (all in the same repository):
 *   sidequest-lint   →  Jenkinsfile.lint
 *   sidequest-test   →  Jenkinsfile.test
 *   sidequest-build  →  Jenkinsfile.build
 */
pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        // Shared Docker bridge network — created here, destroyed in post.
        PIPELINE_NETWORK = "sidequest-ci-${BUILD_NUMBER}"
        // Convenience vars used only in post-block summary messages.
        BACKEND_IMAGE    = "sidequest-backend:${BUILD_NUMBER}"
        FRONTEND_IMAGE   = "sidequest-frontend:${BUILD_NUMBER}"
    }

    parameters {
        // ── Which stages to run (set by webhook server; default runs everything) ─
        string(
            name: 'PIPELINE_STAGES',
            defaultValue: 'all',
            description: 'Stages to run: all | lint | test | build | deploy | lint,test | test,build | lint,build | build,deploy'
        )
        // ── Deployment target ─────────────────────────────────────────────────
        string(
            name: 'EC2_HOST',
            defaultValue: '13.48.57.103',
            description: 'Public IP of the EC2 instance to deploy to (overridable per-run)'
        )
        // ── Webhook trigger context (empty when triggered manually) ──────────
        string(
            name: 'GITHUB_ISSUE_NUMBER',
            defaultValue: '',
            description: 'GitHub issue number that triggered this build (blank = manual run)'
        )
        string(
            name: 'GITHUB_ISSUE_TITLE',
            defaultValue: '',
            description: 'GitHub issue title for log context'
        )
        // ── Pull Request context (empty when triggered manually or by issue) ──
        string(
            name: 'GITHUB_PR_NUMBER',
            defaultValue: '',
            description: 'GitHub pull request number that triggered this build'
        )
        string(
            name: 'GITHUB_PR_TITLE',
            defaultValue: '',
            description: 'GitHub pull request title for log context'
        )
        string(
            name: 'GITHUB_PR_SHA',
            defaultValue: '',
            description: 'GitHub pull request head commit SHA to check out'
        )
        string(
            name: 'GITHUB_PR_HEAD_REF',
            defaultValue: '',
            description: 'GitHub pull request head branch ref'
        )
        string(
            name: 'GITHUB_REPO',
            defaultValue: '',
            description: 'Full repo name (owner/repo) used to post GitHub comments'
        )
        string(
            name: 'TRIGGERED_BY',
            defaultValue: 'manual',
            description: 'Trigger source: "github-issue-webhook" | "github-pr-webhook" | "manual"'
        )
    }

    stages {

        // ─────────────────────────────────────────────────────────────────
        // PREPARE: stand up the shared Docker network and checkout PR head commit if applicable.
        // ─────────────────────────────────────────────────────────────────
        stage('Prepare') {
            steps {
                script {
                    if (params.TRIGGERED_BY == 'github-pr-webhook' || params.TRIGGERED_BY == 'github-comment-webhook') {
                        echo "=== [MASTER] Triggered by GitHub PR #${params.GITHUB_PR_NUMBER} via ${params.TRIGGERED_BY}: \"${params.GITHUB_PR_TITLE}\" (SHA: ${params.GITHUB_PR_SHA}) ==="
                        if (params.GITHUB_PR_SHA) {
                            echo "=== [MASTER] Checking out PR head commit: ${params.GITHUB_PR_SHA} ==="
                            sh "git fetch origin ${params.GITHUB_PR_SHA} && git checkout -f ${params.GITHUB_PR_SHA}"
                        } else if (params.GITHUB_PR_NUMBER) {
                            echo "=== [MASTER] Checking out PR #${params.GITHUB_PR_NUMBER} head ref ==="
                            sh "git fetch origin pull/${params.GITHUB_PR_NUMBER}/head && git checkout -f FETCH_HEAD"
                        }
                    } else if (params.TRIGGERED_BY == 'github-issue-webhook') {
                        echo "=== [MASTER] Triggered by GitHub Issue #${params.GITHUB_ISSUE_NUMBER}: \"${params.GITHUB_ISSUE_TITLE}\" ==="
                    } else {
                        echo "=== [MASTER] Triggered manually ==="
                    }

                    // Parse PIPELINE_STAGES into per-stage flags.
                    // FULL_PIPELINE=true  → cross-stage gating is active (lint must pass before test, etc.)
                    // FULL_PIPELINE=false → each requested stage runs independently (no cross-gating)
                    def s = params.PIPELINE_STAGES ?: 'all'
                    env.RUN_LINT      = (s == 'all' || s.contains('lint')).toString()
                    env.RUN_TEST      = (s == 'all' || s.contains('test')).toString()
                    env.RUN_BUILD     = (s == 'all' || s.contains('build')).toString()
                    env.RUN_DEPLOY    = (s == 'all' || s.contains('deploy')).toString()
                    env.FULL_PIPELINE = (s == 'all').toString()

                    echo "=== [MASTER] Pipeline stages : ${s} ==="
                    echo "=== [MASTER]   RUN_LINT=${env.RUN_LINT}  RUN_TEST=${env.RUN_TEST}  RUN_BUILD=${env.RUN_BUILD}  RUN_DEPLOY=${env.RUN_DEPLOY}  FULL_PIPELINE=${env.FULL_PIPELINE} ==="
                }
                echo "=== [MASTER] Creating isolated Docker network: ${env.PIPELINE_NETWORK} ==="
                sh "docker network create ${env.PIPELINE_NETWORK} || true"
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // TRIGGER LINT: delegate all lint work to sidequest-lint.
        // Full pipeline: a FAILURE here blocks both Test and Build.
        // Partial run:   runs independently; does not gate other stages.
        // ─────────────────────────────────────────────────────────────────
        stage('Trigger Lint') {
            when {
                expression { env.RUN_LINT == 'true' }
            }
            steps {
                script {
                    echo "=== [MASTER] Triggering downstream job: sidequest-lint ==="

                    def lintJob = build(
                        job: 'sidequest-lint',
                        parameters: [
                            string(name: 'UPSTREAM_BUILD_NUMBER', value: "${BUILD_NUMBER}"),
                            string(name: 'PIPELINE_NETWORK',       value: "${env.PIPELINE_NETWORK}"),
                            string(name: 'GITHUB_ISSUE_NUMBER',    value: "${params.GITHUB_ISSUE_NUMBER}"),
                            string(name: 'GITHUB_ISSUE_TITLE',     value: "${params.GITHUB_ISSUE_TITLE}"),
                            string(name: 'GITHUB_PR_NUMBER',       value: "${params.GITHUB_PR_NUMBER}"),
                            string(name: 'GITHUB_PR_TITLE',        value: "${params.GITHUB_PR_TITLE}"),
                            string(name: 'GITHUB_PR_SHA',          value: "${params.GITHUB_PR_SHA}"),
                            string(name: 'GITHUB_PR_HEAD_REF',     value: "${params.GITHUB_PR_HEAD_REF}"),
                            string(name: 'GITHUB_REPO',            value: "${params.GITHUB_REPO}"),
                            string(name: 'TRIGGERED_BY',           value: "${params.TRIGGERED_BY}")
                        ],
                        propagate: false,
                        wait: true
                    )

                    env.LINT_RESULT = lintJob.result
                    echo "=== [MASTER] sidequest-lint finished with result: ${env.LINT_RESULT} ==="

                    // In a full pipeline, lint failure blocks Test and Build.
                    // In a partial run (lint only) it just marks master FAILURE.
                    if (env.LINT_RESULT != 'SUCCESS') {
                        currentBuild.result = 'FAILURE'
                        if (env.FULL_PIPELINE == 'true') {
                            error("[MASTER] Lint FAILED — Test and Build stages are SKIPPED.")
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // TRIGGER TEST
        // Full pipeline: only runs when lint succeeded; FAILURE skips Build.
        // Partial run:   runs independently regardless of lint result.
        // ─────────────────────────────────────────────────────────────────
        stage('Trigger Test') {
            when {
                // Run when TEST is requested AND (not a full pipeline OR lint passed).
                expression {
                    env.RUN_TEST == 'true' &&
                    !(env.FULL_PIPELINE == 'true' && env.LINT_RESULT == 'FAILURE')
                }
            }
            steps {
                script {
                    echo "=== [MASTER] Triggering downstream job: sidequest-test ==="

                    def testJob = build(
                        job: 'sidequest-test',
                        parameters: [
                            string(name: 'UPSTREAM_BUILD_NUMBER', value: "${BUILD_NUMBER}"),
                            string(name: 'PIPELINE_NETWORK',       value: "${env.PIPELINE_NETWORK}"),
                            string(name: 'GITHUB_ISSUE_NUMBER',    value: "${params.GITHUB_ISSUE_NUMBER}"),
                            string(name: 'GITHUB_ISSUE_TITLE',     value: "${params.GITHUB_ISSUE_TITLE}"),
                            string(name: 'GITHUB_PR_NUMBER',       value: "${params.GITHUB_PR_NUMBER}"),
                            string(name: 'GITHUB_PR_TITLE',        value: "${params.GITHUB_PR_TITLE}"),
                            string(name: 'GITHUB_PR_SHA',          value: "${params.GITHUB_PR_SHA}"),
                            string(name: 'GITHUB_PR_HEAD_REF',     value: "${params.GITHUB_PR_HEAD_REF}"),
                            string(name: 'GITHUB_REPO',            value: "${params.GITHUB_REPO}"),
                            string(name: 'TRIGGERED_BY',           value: "${params.TRIGGERED_BY}")
                        ],
                        propagate: false,
                        wait: true
                    )

                    env.TEST_RESULT = testJob.result
                    echo "=== [MASTER] sidequest-test finished with result: ${env.TEST_RESULT} ==="

                    if (env.TEST_RESULT == 'UNSTABLE') {
                        currentBuild.result = 'UNSTABLE'
                        echo "[MASTER] Tests UNSTABLE — Build will still run (if requested)."
                    } else if (env.TEST_RESULT != 'SUCCESS') {
                        currentBuild.result = 'FAILURE'
                        if (env.FULL_PIPELINE == 'true') {
                            error("[MASTER] Tests FAILED — Build stage is SKIPPED.")
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // TRIGGER BUILD
        // Full pipeline: runs when lint passed AND tests did not hard-fail.
        // Partial run:   runs independently regardless of other stage results.
        // ─────────────────────────────────────────────────────────────────
        stage('Trigger Build') {
            when {
                expression {
                    env.RUN_BUILD == 'true' &&
                    !(env.FULL_PIPELINE == 'true' && env.LINT_RESULT == 'FAILURE') &&
                    !(env.FULL_PIPELINE == 'true' && env.TEST_RESULT == 'FAILURE')
                }
            }
            steps {
                script {
                    echo "=== [MASTER] Triggering downstream job: sidequest-build ==="

                    def buildJob = build(
                        job: 'sidequest-build',
                        parameters: [
                            string(name: 'UPSTREAM_BUILD_NUMBER', value: "${BUILD_NUMBER}"),
                            string(name: 'PIPELINE_NETWORK',       value: "${env.PIPELINE_NETWORK}"),
                            string(name: 'GITHUB_ISSUE_NUMBER',    value: "${params.GITHUB_ISSUE_NUMBER}"),
                            string(name: 'GITHUB_ISSUE_TITLE',     value: "${params.GITHUB_ISSUE_TITLE}"),
                            string(name: 'GITHUB_PR_NUMBER',       value: "${params.GITHUB_PR_NUMBER}"),
                            string(name: 'GITHUB_PR_TITLE',        value: "${params.GITHUB_PR_TITLE}"),
                            string(name: 'GITHUB_PR_SHA',          value: "${params.GITHUB_PR_SHA}"),
                            string(name: 'GITHUB_PR_HEAD_REF',     value: "${params.GITHUB_PR_HEAD_REF}"),
                            string(name: 'GITHUB_REPO',            value: "${params.GITHUB_REPO}"),
                            string(name: 'TRIGGERED_BY',           value: "${params.TRIGGERED_BY}")
                        ],
                        propagate: false,
                        wait: true
                    )

                    env.BUILD_RESULT = buildJob.result
                    echo "=== [MASTER] sidequest-build finished with result: ${env.BUILD_RESULT} ==="

                    if (env.BUILD_RESULT != 'SUCCESS') {
                        currentBuild.result = 'FAILURE'
                        error("[MASTER] Build FAILED — check sidequest-build logs.")
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // TRIGGER DEPLOY
        // Runs only when: deploy is requested AND build succeeded.
        // ─────────────────────────────────────────────────────────────────
        stage('Trigger Deploy') {
            when {
                expression {
                    env.RUN_DEPLOY == 'true' &&
                    !(env.FULL_PIPELINE == 'true' && env.BUILD_RESULT != 'SUCCESS')
                }
            }
            steps {
                script {
                    echo "=== [MASTER] Triggering downstream job: sidequest-deploy ==="

                    def deployJob = build(
                        job: 'sidequest-deploy',
                        parameters: [
                            string(name: 'UPSTREAM_BUILD_NUMBER', value: "${BUILD_NUMBER}"),
                            string(name: 'PIPELINE_NETWORK',       value: "${env.PIPELINE_NETWORK}"),
                            string(name: 'EC2_HOST',               value: "${params.EC2_HOST}"),
                            string(name: 'GITHUB_ISSUE_NUMBER',    value: "${params.GITHUB_ISSUE_NUMBER}"),
                            string(name: 'GITHUB_ISSUE_TITLE',     value: "${params.GITHUB_ISSUE_TITLE}"),
                            string(name: 'GITHUB_PR_NUMBER',       value: "${params.GITHUB_PR_NUMBER}"),
                            string(name: 'GITHUB_PR_TITLE',        value: "${params.GITHUB_PR_TITLE}"),
                            string(name: 'GITHUB_PR_SHA',          value: "${params.GITHUB_PR_SHA}"),
                            string(name: 'GITHUB_PR_HEAD_REF',     value: "${params.GITHUB_PR_HEAD_REF}"),
                            string(name: 'GITHUB_REPO',            value: "${params.GITHUB_REPO}"),
                            string(name: 'TRIGGERED_BY',           value: "${params.TRIGGERED_BY}")
                        ],
                        propagate: false,
                        wait: true
                    )

                    env.DEPLOY_RESULT = deployJob.result
                    echo "=== [MASTER] sidequest-deploy finished with result: ${env.DEPLOY_RESULT} ==="

                    if (env.DEPLOY_RESULT != 'SUCCESS') {
                        currentBuild.result = 'FAILURE'
                        error("[MASTER] Deploy FAILED — check sidequest-deploy logs.")
                    }
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST: always tear down the Docker network; then emit a summary.
    // ─────────────────────────────────────────────────────────────────────
    post {
        always {
            echo "=== [MASTER] Tearing down Docker network: ${env.PIPELINE_NETWORK} ==="
            sh "docker network rm ${env.PIPELINE_NETWORK} || true"

            script {
                def lintSummary   = env.LINT_RESULT   ?: 'SKIPPED'
                def testSummary   = env.TEST_RESULT   ?: 'SKIPPED'
                def buildSummary  = env.BUILD_RESULT  ?: 'SKIPPED'
                def deploySummary = env.DEPLOY_RESULT ?: 'SKIPPED'

                echo """
=== [MASTER] ─── Pipeline Summary ───────────────────────────
    sidequest-lint   : ${lintSummary}
    sidequest-test   : ${testSummary}
    sidequest-build  : ${buildSummary}
    sidequest-deploy : ${deploySummary}
─────────────────────────────────────────────────────────────
"""

                // ── Post GitHub comment (webhook-triggered runs only) ────
                def isPRWeb = (params.TRIGGERED_BY == 'github-pr-webhook')
                def isPRComment = (params.TRIGGERED_BY == 'github-comment-webhook')
                def isIssue = (params.TRIGGERED_BY == 'github-issue-webhook')
                def isPR = (isPRWeb || isPRComment)
                def targetNum = isPR ? params.GITHUB_PR_NUMBER : (isIssue ? params.GITHUB_ISSUE_NUMBER : '')

                if ((isPR || isIssue) && targetNum) {

                    // Map a stage result string to a status emoji
                    def statusEmoji = { String s ->
                        s == 'SUCCESS' ? '\u2705' : s == 'UNSTABLE' ? '\u26a0\ufe0f' : s == 'SKIPPED' ? '\u23ed\ufe0f' : '\u274c'
                    }

                    // Compute overall status based on requested stages
                    def requestedFailed = (env.RUN_LINT == 'true'   && env.LINT_RESULT   == 'FAILURE') ||
                                          (env.RUN_TEST == 'true'   && env.TEST_RESULT   == 'FAILURE') ||
                                          (env.RUN_BUILD == 'true'  && env.BUILD_RESULT  == 'FAILURE') ||
                                          (env.RUN_DEPLOY == 'true' && env.DEPLOY_RESULT == 'FAILURE')

                    def requestedUnstable = (env.RUN_TEST == 'true' && env.TEST_RESULT == 'UNSTABLE')

                    def overallStatus = requestedFailed ? 'FAILURE' : (requestedUnstable ? 'UNSTABLE' : 'SUCCESS')
                    if (currentBuild.result == null) {
                        currentBuild.result = overallStatus
                    }
                    def overallEmoji = statusEmoji(overallStatus)

                    def triggerDetails = isPRComment ?
                        "**Triggered by:** PR Comment on #${params.GITHUB_PR_NUMBER} \u2014 \"${params.GITHUB_PR_TITLE}\"\n**Commit:** `${params.GITHUB_PR_SHA ?: 'head'}`" :
                        (isPRWeb ?
                            "**Triggered by:** Pull Request #${params.GITHUB_PR_NUMBER} \u2014 \"${params.GITHUB_PR_TITLE}\"\n**Commit:** `${params.GITHUB_PR_SHA ?: 'head'}`" :
                            "**Triggered by:** Issue #${params.GITHUB_ISSUE_NUMBER} \u2014 \"${params.GITHUB_ISSUE_TITLE}\"")

                    def commentBody = """## ${overallEmoji} Jenkins CI Report — Build #${BUILD_NUMBER}

${triggerDetails}
**Stages requested:** `${params.PIPELINE_STAGES ?: 'all'}`

| Stage | Result |
|-------|--------|
| \ud83d\udd0d Lint   | ${statusEmoji(lintSummary)} ${lintSummary} |
| \ud83e\uddea Test   | ${statusEmoji(testSummary)} ${testSummary} |
| \ud83c\udfd7\ufe0f Build  | ${statusEmoji(buildSummary)} ${buildSummary} |
| \ud83d\ude80 Deploy | ${statusEmoji(deploySummary)} ${deploySummary} |

**Overall: ${overallEmoji} ${overallStatus}**

> \ud83d\udd17 [View Build Log](${BUILD_URL}console)"""

                    try {
                        writeFile file: 'gh_comment.json',
                                  text: groovy.json.JsonOutput.toJson([body: commentBody])

                        withCredentials([string(credentialsId: 'github-pat-issue-comment', variable: 'GH_TOKEN')]) {
                            def httpCode = sh(
                                returnStdout: true,
                                script: """
                                    curl -s -o /dev/null -w "%{http_code}" -X POST \\
                                        -H "Authorization: token \${GH_TOKEN}" \\
                                        -H "Content-Type: application/json" \\
                                        --data @gh_comment.json \\
                                        "https://api.github.com/repos/${params.GITHUB_REPO}/issues/${targetNum}/comments"
                                """
                            ).trim()
                            echo "[MASTER] GitHub API returned HTTP ${httpCode}"
                        }
                        echo "[MASTER] \u2705 Comment posted on ${isPR ? 'PR' : 'Issue'} #${targetNum} in ${params.GITHUB_REPO}"
                    } catch (err) {
                        echo "[MASTER] \u26a0\ufe0f Could not post GitHub comment (check 'github-pat-issue-comment' credential): ${err.message}"
                    }
                }
            }
        }

        success {
            echo "[MASTER] All downstream jobs PASSED. Images ready: ${env.BACKEND_IMAGE}, ${env.FRONTEND_IMAGE}"
        }

        unstable {
            echo "[MASTER] Pipeline UNSTABLE — tests had failures but images were still built."
        }

        failure {
            echo "[MASTER] Pipeline FAILED. See downstream job logs for details."
        }
    }
}
