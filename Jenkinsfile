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
            description: 'Stages to run: all | lint | test | build | lint,test | test,build | lint,build'
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
        string(
            name: 'GITHUB_REPO',
            defaultValue: '',
            description: 'Full repo name (owner/repo) used to post GitHub issue comments'
        )
        string(
            name: 'TRIGGERED_BY',
            defaultValue: 'manual',
            description: 'Trigger source: "github-issue-webhook" | "manual"'
        )
    }

    stages {

        // ─────────────────────────────────────────────────────────────────
        // PREPARE: stand up the shared Docker network for this build run.
        // ─────────────────────────────────────────────────────────────────
        stage('Prepare') {
            steps {
                script {
                    if (params.TRIGGERED_BY == 'github-issue-webhook') {
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
                    env.FULL_PIPELINE = (s == 'all').toString()

                    echo "=== [MASTER] Pipeline stages : ${s} ==="
                    echo "=== [MASTER]   RUN_LINT=${env.RUN_LINT}  RUN_TEST=${env.RUN_TEST}  RUN_BUILD=${env.RUN_BUILD}  FULL_PIPELINE=${env.FULL_PIPELINE} ==="
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
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST: always tear down the Docker network; then emit a summary.
    // ─────────────────────────────────────────────────────────────────────
    post {
        always {
            echo "=== [MASTER] Tearing down Docker network: ${env.PIPELINE_NETWORK} ==="
            sh "docker network rm ${env.PIPELINE_NETWORK} || true"

            script {
                def lintSummary  = env.LINT_RESULT  ?: 'SKIPPED'
                def testSummary  = env.TEST_RESULT  ?: 'SKIPPED'
                def buildSummary = env.BUILD_RESULT ?: 'SKIPPED'

                echo """
=== [MASTER] ─── Pipeline Summary ───────────────────────────
    sidequest-lint   : ${lintSummary}
    sidequest-test   : ${testSummary}
    sidequest-build  : ${buildSummary}
─────────────────────────────────────────────────────────────
"""

                // ── Post GitHub issue comment (webhook-triggered runs only) ────
                if (params.TRIGGERED_BY == 'github-issue-webhook' && params.GITHUB_ISSUE_NUMBER) {

                    // Map a stage result string to a status emoji
                    def statusEmoji = { String s ->
                        s == 'SUCCESS' ? '\u2705' : s == 'UNSTABLE' ? '\u26a0\ufe0f' : s == 'SKIPPED' ? '\u23ed\ufe0f' : '\u274c'
                    }

                    def overallStatus = currentBuild.currentResult ?: 'FAILURE'
                    def overallEmoji  = statusEmoji(overallStatus)

                    def commentBody = """## ${overallEmoji} Jenkins CI Report \u2014 Build #${BUILD_NUMBER}

**Triggered by:** Issue #${params.GITHUB_ISSUE_NUMBER} \u2014 \"${params.GITHUB_ISSUE_TITLE}\"
**Stages requested:** `${params.PIPELINE_STAGES ?: 'all'}`

| Stage | Result |
|-------|--------|
| \ud83d\udd0d Lint  | ${statusEmoji(lintSummary)} ${lintSummary} |
| \ud83e\uddea Test  | ${statusEmoji(testSummary)} ${testSummary} |
| \ud83c\udfd7\ufe0f Build | ${statusEmoji(buildSummary)} ${buildSummary} |

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
                                        "https://api.github.com/repos/${params.GITHUB_REPO}/issues/${params.GITHUB_ISSUE_NUMBER}/comments"
                                """
                            ).trim()
                            echo "[MASTER] GitHub Issues API returned HTTP ${httpCode}"
                        }
                        echo "[MASTER] \u2705 Comment posted on Issue #${params.GITHUB_ISSUE_NUMBER} in ${params.GITHUB_REPO}"
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
