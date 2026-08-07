# Infrastructure Provisioning Stack (2025/2026 Standards)

## Objective
Migrate the existing EC2 infrastructure provisioning for the Side-Quest Board (React + Spring Boot + MySQL) from Ansible to Terraform, establishing a modern, scalable DevOps foundation.

## Core Stack Recommendations

| Component | Choice | Version | Rationale | Confidence |
| :--- | :--- | :--- | :--- | :--- |
| **IaC Engine** | Terraform | `~> 1.15.0` | The industry standard for declarative infrastructure. HashiCorp's Terraform 1.15.x provides a mature, stable execution environment for AWS deployments. | High |
| **AWS Provider** | HashiCorp AWS Provider | `~> 6.58.0` | Essential for interacting with AWS APIs. The 6.x series offers robust support for the latest AWS features, improved performance, and enhanced security configurations. | High |
| **State Management** | S3 + DynamoDB | N/A | S3 provides secure, versioned remote state storage. DynamoDB provides state locking to prevent concurrent apply conflicts, which is crucial for CI/CD pipelines (Jenkins). | High |
| **Configuration Handoff** | Ansible `aws_ec2` Dynamic Inventory | `latest` | Rather than static IPs, Ansible dynamically queries AWS for the instances Terraform just created based on tags, seamlessly linking provisioning and configuration. | High |
| **Secure Connectivity** | AWS Systems Manager (SSM) | N/A | Allows Ansible to connect to and configure EC2 instances securely without opening inbound SSH ports (Port 22) to the internet. | High |

## The Modern Workflow (Layered Approach)

In modern architectures, Terraform and Ansible are not mutually exclusive; they are complementary.
1. **Terraform (The Architect)** provisions the underlying AWS infrastructure: VPC, Subnets, Security Groups, IAM Roles, and the EC2 instances themselves.
2. **Ansible (The Builder)** handles OS configuration and application deployment: installing Java, MySQL, Nginx, configuring the Spring Boot backend, and deploying the React frontend.
3. **Jenkins CI/CD** orchestrates the workflow by first running `terraform apply`, then immediately triggering `ansible-playbook` using the dynamic inventory to configure the newly provisioned instances via SSM.

## What NOT to use and why

- ❌ **Local State (`terraform.tfstate` in Git)**
  - *Why:* The state file can contain sensitive plain-text secrets and causes major synchronization issues when multiple developers or CI/CD pipelines try to apply changes concurrently. Always use the S3 remote backend.
- ❌ **Terraform for App Configuration (e.g., `remote-exec` or complex `user_data` scripts)**
  - *Why:* While Terraform can bootstrap via `user_data`, using it for application updates makes EC2 instances effectively immutable, requiring a full destroy-and-recreate cycle for minor software updates. Leave app configuration to Ansible.
- ❌ **A Monolithic `main.tf`**
  - *Why:* Keeping all configuration in a single file becomes unmaintainable quickly. Break down the infrastructure into logical modules (e.g., `networking`, `database`, `compute`).
- ❌ **Public SSH access (Port 22)**
  - *Why:* Exposing SSH to the public internet is a major security vulnerability. Use AWS SSM for zero-trust, agentless configuration by Ansible.
- ❌ **Hardcoded Secrets in `.tf` files**
  - *Why:* Committing AWS credentials or database passwords to version control is a critical security risk. Use AWS Secrets Manager or Parameter Store, and fetch them dynamically using Terraform `data` blocks.
