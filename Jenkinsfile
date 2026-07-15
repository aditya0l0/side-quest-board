// ============================================================
//  Side Quest Board — CI Pipeline
//  Orchestrator: Jenkins master (this file)
//  Workers:
//    1. lint-worker   — node:20-alpine (frontend oxlint)
//                     + maven:3.9.7-eclipse-temurin-17 (backend checkstyle)
//    2. test-worker   — same images; runs vitest + mvn test
//    3. build-worker  — docker:27-cli with DooD; builds final Docker images
//
//  Flow:
//    Lint ──(pass)──► Test ──(pass OR fail)──► Build
//         └─(fail)──► ABORT (Test + Build are skipped)
//
//  Prerequisites on the Jenkins agent host (WSL2 / Docker Desktop):
//    • Docker Engine accessible via /var/run/docker.sock (DooD pattern)
//    • Jenkins agent container must be started with:
//        -v /var/run/docker.sock:/var/run/docker.sock
//        -v jenkins-home:/var/jenkins_home
//    • No Maven or Node.js needed on the host — all tooling is in containers
// ============================================================

pipeline {

    // The orchestrating agent — runs on the Jenkins built-in node or any
    // agent that has Docker available (DooD setup on WSL2 / Docker Desktop).
    agent any

    // ---------- Global pipeline options ----------
    options {
        timestamps()
        // Keep only the last 10 builds to save disk space
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Fail the whole pipeline if it runs longer than 30 minutes
        timeout(time: 30, unit: 'MINUTES')
        // Prevent concurrent builds on the same branch
        disableConcurrentBuilds()
    }

    // ---------- Pipeline-wide environment ----------
    environment {
        // Isolated Docker network shared by all worker containers this build
        PIPELINE_NETWORK = "sidequest-ci-${BUILD_NUMBER}"
        // Final application image tags produced by the Build stage
        BACKEND_IMAGE    = "sidequest-backend:${BUILD_NUMBER}"
        FRONTEND_IMAGE   = "sidequest-frontend:${BUILD_NUMBER}"
        // Flags written by each stage and read in the post summary
        LINT_PASSED      = 'false'
        TEST_PASSED      = 'false'
    }

    stages {

        // ──────────────────────────────────────────────────────────────────
        //  STAGE 0 — Preparation
        //  Create an isolated Docker bridge network so all worker containers
        //  in this build share the same namespace (useful if they ever need
        //  to reach each other, e.g. a DB sidecar for integration tests).
        // ──────────────────────────────────────────────────────────────────
        stage('Prepare') {
            steps {
                echo "=== [MASTER] Creating isolated Docker network: ${env.PIPELINE_NETWORK} ==="
                sh "docker network create ${env.PIPELINE_NETWORK} || true"
            }
        }

        // ──────────────────────────────────────────────────────────────────
        //  STAGE 1 — LINT WORKER CONTAINERS
        //
        //  Two short-lived worker containers are launched sequentially:
        //    • lint-backend  → maven:3.9.7-eclipse-temurin-17
        //                      runs: mvn checkstyle:check  (Google style)
        //    • lint-frontend → node:20-alpine
        //                      runs: npm run lint  (oxlint)
        //
        //  If EITHER container exits non-zero the stage errors out and
        //  Jenkins skips all downstream stages (Test + Build are aborted).
        // ──────────────────────────────────────────────────────────────────
        stage('Lint') {
            steps {
                echo "=== [MASTER] Launching LINT worker containers ==="

                script {
                    // ── Worker 1: Backend Checkstyle ──────────────────────
                    def backendLintStatus = sh(
                        label: '[lint-backend] Checkstyle worker container',
                        returnStatus: true,
                        script: """
                            docker run --rm \\
                                --name lint-backend-${BUILD_NUMBER} \\
                                --network ${env.PIPELINE_NETWORK} \\
                                -v "${WORKSPACE}/backend":/workspace/backend:ro \\
                                -w /workspace/backend \\
                                maven:3.9.7-eclipse-temurin-17 \\
                                mvn --no-transfer-progress checkstyle:check
                        """
                    )

                    // ── Worker 2: Frontend oxlint ─────────────────────────
                    def frontendLintStatus = sh(
                        label: '[lint-frontend] oxlint worker container',
                        returnStatus: true,
                        script: """
                            docker run --rm \\
                                --name lint-frontend-${BUILD_NUMBER} \\
                                --network ${env.PIPELINE_NETWORK} \\
                                -v "${WORKSPACE}/frontend":/workspace/frontend \\
                                -w /workspace/frontend \\
                                node:20-alpine \\
                                sh -c "npm ci --prefer-offline && npm run lint"
                        """
                    )

                    // ── Aggregate: both workers must succeed ──────────────
                    if (backendLintStatus != 0 || frontendLintStatus != 0) {
                        error(
                            "[MASTER] LINT FAILED. " +
                            "backend-exit=${backendLintStatus}, " +
                            "frontend-exit=${frontendLintStatus}. " +
                            "Test and Build stages are SKIPPED."
                        )
                    }

                    env.LINT_PASSED = 'true'
                    echo "=== [MASTER] All lint workers finished SUCCESSFULLY ==="
                }
            }
        }

        // ──────────────────────────────────────────────────────────────────
        //  STAGE 2 — TEST WORKER CONTAINERS
        //
        //  Two short-lived worker containers run tests:
        //    • test-backend  → maven:3.9.7-eclipse-temurin-17
        //                      runs: mvn test  (JUnit / Spring Boot Test)
        //                      uses H2 in-memory DB so no MySQL is needed
        //    • test-frontend → node:20-alpine
        //                      runs: npm test -- --run  (vitest)
        //
        //  IMPORTANT: catchError wraps both so that test failures set the
        //  build to UNSTABLE but do NOT prevent the Build stage from running.
        // ──────────────────────────────────────────────────────────────────
        stage('Test') {
            steps {
                echo "=== [MASTER] Launching TEST worker containers ==="

                // ── Worker 3: Backend JUnit tests ─────────────────────────
                // H2 env vars override MySQL so the test container is self-contained.
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh """
                        docker run --rm \\
                            --name test-backend-${BUILD_NUMBER} \\
                            --network ${env.PIPELINE_NETWORK} \\
                            -v "${WORKSPACE}/backend":/workspace/backend \\
                            -w /workspace/backend \\
                            -e SPRING_DATASOURCE_URL="jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1" \\
                            -e SPRING_DATASOURCE_DRIVER_CLASS_NAME="org.h2.Driver" \\
                            -e SPRING_JPA_DATABASE_PLATFORM="org.hibernate.dialect.H2Dialect" \\
                            maven:3.9.7-eclipse-temurin-17 \\
                            mvn --no-transfer-progress test
                    """
                }

                // ── Worker 4: Frontend vitest ─────────────────────────────
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh """
                        docker run --rm \\
                            --name test-frontend-${BUILD_NUMBER} \\
                            --network ${env.PIPELINE_NETWORK} \\
                            -v "${WORKSPACE}/frontend":/workspace/frontend \\
                            -w /workspace/frontend \\
                            node:20-alpine \\
                            sh -c "npm ci --prefer-offline && npm test -- --run"
                    """
                }

                // ── Record overall test outcome ───────────────────────────
                script {
                    if (currentBuild.result == 'UNSTABLE') {
                        env.TEST_PASSED = 'false'
                        echo "=== [MASTER] TEST workers finished with FAILURES — Build stage will still run ==="
                    } else {
                        env.TEST_PASSED = 'true'
                        echo "=== [MASTER] All test workers finished SUCCESSFULLY ==="
                    }
                }
            }

            // Collect JUnit XML reports after the stage (pass or fail)
            post {
                always {
                    junit(
                        testResults: 'backend/target/surefire-reports/*.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

        // ──────────────────────────────────────────────────────────────────
        //  STAGE 3 — BUILD WORKER CONTAINER
        //
        //  One worker container using docker:27-cli (Docker CLI only, no daemon).
        //  It receives the host Docker socket via DooD (-v /var/run/docker.sock)
        //  and builds the final application images:
        //    • sidequest-backend:<BUILD_NUMBER>   (from backend/Dockerfile)
        //    • sidequest-frontend:<BUILD_NUMBER>  (from frontend/Dockerfile)
        //
        //  This stage ALWAYS runs — even when tests failed — because
        //  catchError in the Test stage only sets UNSTABLE, not FAILURE.
        //  A hard build failure here IS a pipeline failure.
        // ──────────────────────────────────────────────────────────────────
        stage('Build') {
            steps {
                echo "=== [MASTER] Launching BUILD worker container (always runs) ==="

                script {
                    def buildStatus = sh(
                        label: '[build-worker] Build Docker images',
                        returnStatus: true,
                        script: """
                            docker run --rm \\
                                --name build-worker-${BUILD_NUMBER} \\
                                --network ${env.PIPELINE_NETWORK} \\
                                -v /var/run/docker.sock:/var/run/docker.sock \\
                                -v "${WORKSPACE}":/workspace \\
                                -w /workspace \\
                                docker:27-cli \\
                                sh -c "
                                    echo '=== Building backend Docker image ==='
                                    docker build -t ${env.BACKEND_IMAGE} ./backend

                                    echo '=== Building frontend Docker image ==='
                                    docker build -t ${env.FRONTEND_IMAGE} ./frontend

                                    echo '=== Built images ==='
                                    docker images | grep sidequest
                                "
                        """
                    )

                    if (buildStatus != 0) {
                        error("[MASTER] Build worker FAILED with exit code ${buildStatus}.")
                    }

                    echo "=== [MASTER] Build worker finished SUCCESSFULLY ==="
                    echo "    → Backend  image : ${env.BACKEND_IMAGE}"
                    echo "    → Frontend image : ${env.FRONTEND_IMAGE}"
                }
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    //  POST — runs after all stages, regardless of outcome
    // ──────────────────────────────────────────────────────────────────────
    post {
        always {
            echo "=== [MASTER] Cleaning up Docker network: ${env.PIPELINE_NETWORK} ==="
            sh "docker network rm ${env.PIPELINE_NETWORK} || true"

            script {
                def lintIcon  = (env.LINT_PASSED == 'true') ? 'PASSED' : 'FAILED'
                def testIcon  = (env.TEST_PASSED  == 'true') ? 'PASSED' : 'FAILED (build still ran)'
                echo """
╔══════════════════════════════════════════════╗
║       SIDE QUEST BOARD — CI SUMMARY          ║
╠══════════════════════════════════════════════╣
║  Build # : ${BUILD_NUMBER}
║  Result  : ${currentBuild.currentResult}
║  Lint    : ${lintIcon}
║  Tests   : ${testIcon}
╚══════════════════════════════════════════════╝"""
            }
        }

        success {
            echo "All stages passed. Images ready: ${env.BACKEND_IMAGE}, ${env.FRONTEND_IMAGE}"
        }

        unstable {
            echo "Pipeline UNSTABLE — tests failed, but images were still built successfully."
        }

        failure {
            echo "Pipeline FAILED. Check the stage logs above for details."
        }
    }
}
