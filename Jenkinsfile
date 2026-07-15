pipeline {
    agent any

    stages {
        stage('Build Backend') {
            steps {
                dir('backend') {
                    // We use 'bat' assuming a Windows Jenkins agent.
                    // If your Jenkins agent runs on Linux, change 'bat' to 'sh'.
                    sh 'mvn clean package -DskipTests'
                }
            }
        }
    }
}
