pipeline {
    agent any

    stages {
        stage('Lint') {
            steps {
                dir('backend') {
                    sh 'chmod +x mvnw && ./mvnw checkstyle:check'
                }
                dir('frontend') {
                    sh 'npm install && npm run lint'
                }
            }
        }
        stage('Build Backend') {
            steps {
                dir('backend') {
                    // We use the Maven Wrapper (mvnw) generated for the project.
                    // This ensures Jenkins doesn't need Maven pre-installed.
                    sh 'chmod +x mvnw && ./mvnw clean package -DskipTests'
                }
            }
        }
    }
}
