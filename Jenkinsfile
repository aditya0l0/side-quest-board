pipeline {
    agent any

    stages {
        stage('Build Backend') {
            steps {
                dir('backend') {
                    // We use the Maven Wrapper (mvnw) generated for the project.
                    // This ensures Jenkins doesn't need Maven pre-installed.
                    sh 'chmod +x mvnw && ./mvnw clean package -DskipTests'
                }
            }
        }
        stage('Deploy Local (Docker Compose)') {
            steps {
                // Stop existing containers and start new ones with updated builds
                sh 'docker compose down'
                sh 'docker compose up -d --build'
            }
        }
    }
}
