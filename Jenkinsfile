pipeline {
    agent any
    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        PIPELINE_NETWORK = "sidequest-ci-${BUILD_NUMBER}"
        BACKEND_IMAGE    = "sidequest-backend:${BUILD_NUMBER}"
        FRONTEND_IMAGE   = "sidequest-frontend:${BUILD_NUMBER}"
        LINT_PASSED      = 'false'
        TEST_PASSED      = 'false'
    }

    stages {
        stage('Prepare') {
            steps {
                echo "=== [MASTER] Creating isolated Docker network: ${env.PIPELINE_NETWORK} ==="
                sh "docker network create ${env.PIPELINE_NETWORK} || true"
            }
        }

        stage('Lint') {
            steps {
                echo "=== [MASTER] Launching LINT worker containers ==="

                script {
                    def backendLintStatus = sh(
                        label: '[lint-backend] Checkstyle worker container',
                        returnStatus: true,
                        script: """
                            docker run --rm \\
                                --name lint-backend-${BUILD_NUMBER} \\
                                --network ${env.PIPELINE_NETWORK} \\
                                --volumes-from jenkins \\
                                -w ${WORKSPACE}/backend \\
                                maven:3.9.7-eclipse-temurin-17 \\
                                mvn --no-transfer-progress checkstyle:check
                        """
                    )

                    def frontendLintStatus = sh(
                        label: '[lint-frontend] oxlint worker container',
                        returnStatus: true,
                        script: """
                            docker run --rm \\
                                --name lint-frontend-${BUILD_NUMBER} \\
                                --network ${env.PIPELINE_NETWORK} \\
                                --volumes-from jenkins \\
                                -w ${WORKSPACE}/frontend \\
                                node:20-alpine \\
                                sh -c "npm ci --prefer-offline && npm run lint"
                        """
                    )

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

        stage('Test') {
            steps {
                echo "=== [MASTER] Launching TEST worker containers ==="
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh """
                        docker run --rm \\
                            --name test-backend-${BUILD_NUMBER} \\
                            --network ${env.PIPELINE_NETWORK} \\
                            --volumes-from jenkins \\
                            -w ${WORKSPACE}/backend \\
                            -e SPRING_DATASOURCE_URL="jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1" \\
                            -e SPRING_DATASOURCE_DRIVER_CLASS_NAME="org.h2.Driver" \\
                            -e SPRING_JPA_DATABASE_PLATFORM="org.hibernate.dialect.H2Dialect" \\
                            maven:3.9.7-eclipse-temurin-17 \\
                            mvn --no-transfer-progress test
                    """
                }

                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh """
                        docker run --rm \\
                            --name test-frontend-${BUILD_NUMBER} \\
                            --network ${env.PIPELINE_NETWORK} \\
                            --volumes-from jenkins \\
                            -w ${WORKSPACE}/frontend \\
                            node:20-alpine \\
                            sh -c "npm ci --prefer-offline && npm test -- --run"
                    """
                }

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

            post {
                always {
                    junit(
                        testResults: 'backend/target/surefire-reports/*.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

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
                                --volumes-from jenkins \\
                                -w ${WORKSPACE} \\
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

    post {
        always {
            echo "=== [MASTER] Cleaning up Docker network: ${env.PIPELINE_NETWORK} ==="
            sh "docker network rm ${env.PIPELINE_NETWORK} || true"

            script {
                def lintIcon  = (env.LINT_PASSED == 'true') ? 'PASSED' : 'FAILED'
                def testIcon  = (env.TEST_PASSED  == 'true') ? 'PASSED' : 'FAILED (build still ran)'
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
