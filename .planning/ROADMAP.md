# Project Roadmap

## Phase 1: State Management
**Goal:** Establish the remote state backend for Terraform to ensure safe, team-based provisioning.
**Mode:** mvp

- **Requirements Addressed:**
  - PROV-01: Remote State Management & Locking (S3/DynamoDB)
- **Success Criteria:**
  - S3 bucket and DynamoDB table are provisioned and accessible.
  - `terraform init` successfully connects to the remote backend.
  - State locking is verified by attempting concurrent operations.

## Phase 2: Core Provisioning
**Goal:** Provision the declarative network and compute infrastructure using Terraform modules.
**Mode:** mvp

- **Requirements Addressed:**
  - PROV-02: Declarative EC2 and Network Provisioning
  - PROV-03: Outputs for Configuration Management Handoff (IPs for Ansible)
- **Success Criteria:**
  - VPC, subnets, and security groups are successfully created via `terraform apply`.
  - EC2 instance is successfully provisioned and verified as running in AWS Console.
  - Terraform outputs correctly expose the dynamically assigned EC2 instance IP.

## Phase 3: CI/CD Integration
**Goal:** Integrate Terraform into the existing Jenkins pipeline for automated provisioning and dry-run previews.
**Mode:** mvp

- **Requirements Addressed:**
  - CICD-01: Integration with Existing Jenkins Pipeline
  - CICD-02: Dry-Run Previews (`terraform plan`)
- **Success Criteria:**
  - Jenkins pipeline executes `terraform plan` and successfully outputs a dry-run preview.
  - Jenkins pipeline successfully applies Terraform configuration changes.
  - Ansible successfully runs post-boot configuration dynamically using Terraform's output.
