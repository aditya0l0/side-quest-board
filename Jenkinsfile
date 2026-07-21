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
                }
                echo "=== [MASTER] Creating isolated Docker network: ${env.PIPELINE_NETWORK} ==="
                sh "docker network create ${env.PIPELINE_NETWORK} || true"
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // TRIGGER LINT: delegate all lint work to sidequest-lint.
        // A FAILURE here blocks both Test and Build.
        // ─────────────────────────────────────────────────────────────────
        stage('Trigger Lint') {
            steps {
                script {
                    echo "=== [MASTER] Triggering downstream job: sidequest-lint ==="

                    def lintJob = build(
                        job: 'sidequest-lint',
                        parameters: [
                            string(name: 'UPSTREAM_BUILD_NUMBER', value: "${BUILD_NUMBER}"),
                            string(name: 'PIPELINE_NETWORK',       value: "${env.PIPELINE_NETWORK}")
                        ],
                        propagate: false,   // capture result ourselves; do NOT fail master immediately
                        wait: true
                    )

                    env.LINT_RESULT = lintJob.result
                    echo "=== [MASTER] sidequest-lint finished with result: ${env.LINT_RESULT} ==="

                    if (env.LINT_RESULT != 'SUCCESS') {
                        // Propagate failure to master so the final build status is FAILURE.
                        // when{} expressions on downstream stages will prevent them from running.
                        currentBuild.result = 'FAILURE'
                        error("[MASTER] Lint FAILED — Test and Build stages are SKIPPED.")
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // TRIGGER TEST: only runs when lint succeeded.
        // UNSTABLE result → Build still runs (tests failed but code compiled).
        // FAILURE result  → Build is skipped.
        // ─────────────────────────────────────────────────────────────────
        stage('Trigger Test') {
            when {
                // Skip cleanly (no error thrown) if lint did not pass.
                expression { env.LINT_RESULT == 'SUCCESS' }
            }
            steps {
                script {
                    echo "=== [MASTER] Triggering downstream job: sidequest-test ==="

                    def testJob = build(
                        job: 'sidequest-test',
                        parameters: [
                            string(name: 'UPSTREAM_BUILD_NUMBER', value: "${BUILD_NUMBER}"),
                            string(name: 'PIPELINE_NETWORK',       value: "${env.PIPELINE_NETWORK}")
                        ],
                        propagate: false,
                        wait: true
                    )

                    env.TEST_RESULT = testJob.result
                    echo "=== [MASTER] sidequest-test finished with result: ${env.TEST_RESULT} ==="

                    if (env.TEST_RESULT == 'UNSTABLE') {
                        // Mark master UNSTABLE but do not throw — Build stage will still run.
                        currentBuild.result = 'UNSTABLE'
                        echo "[MASTER] Tests UNSTABLE — Build will still run."
                    } else if (env.TEST_RESULT != 'SUCCESS') {
                        // Hard failure: skip Build.
                        currentBuild.result = 'FAILURE'
                        error("[MASTER] Tests FAILED — Build stage is SKIPPED.")
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // TRIGGER BUILD: runs when lint passed AND tests did not hard-fail.
        // (SUCCESS or UNSTABLE test results both proceed here.)
        // ─────────────────────────────────────────────────────────────────
        stage('Trigger Build') {
            when {
                allOf {
                    expression { env.LINT_RESULT == 'SUCCESS' }
                    // Allow UNSTABLE (test warnings) but not FAILURE or null.
                    expression { env.TEST_RESULT != 'FAILURE' && env.TEST_RESULT != null }
                }
            }
            steps {
                script {
                    echo "=== [MASTER] Triggering downstream job: sidequest-build ==="

                    def buildJob = build(
                        job: 'sidequest-build',
                        parameters: [
                            string(name: 'UPSTREAM_BUILD_NUMBER', value: "${BUILD_NUMBER}"),
                            string(name: 'PIPELINE_NETWORK',       value: "${env.PIPELINE_NETWORK}")
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
                def testSummary  = env.TEST_RESULT   ?: 'SKIPPED'
                def buildSummary = env.BUILD_RESULT  ?: 'SKIPPED'

                echo """
=== [MASTER] ─── Pipeline Summary ───────────────────────────
    sidequest-lint   : ${lintSummary}
    sidequest-test   : ${testSummary}
    sidequest-build  : ${buildSummary}
─────────────────────────────────────────────────────────────
"""
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
