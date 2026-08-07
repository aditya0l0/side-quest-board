# Infrastructure Architecture: Terraform Migration

## Component Boundaries

When migrating infrastructure provisioning from Ansible to Terraform, the architecture should be divided into logical modules to promote reusability and maintainability.

1. **Network Module (`modules/network`)**: 
   - Virtual Private Cloud (VPC)
   - Public and Private Subnets
   - Internet Gateway (IGW) and Route Tables
2. **Security Module (`modules/security`)**: 
   - Security Groups (Inbound/Outbound rules for HTTP/S, SSH, Application ports)
   - IAM Roles and Instance Profiles
3. **Compute Module (`modules/compute`)**: 
   - EC2 Instance(s) (The primary host for the Side-Quest Board)
   - Elastic Block Store (EBS) Volumes
   - Elastic IP (if applicable) and SSH Key Pairs

## Data Flow (Provisioning Lifecycle)

1. **Developer / Jenkins CI** initiates infrastructure changes via `terraform plan` and `terraform apply`.
2. **Terraform CLI** communicates with the **AWS Provider** using configured credentials.
3. **Terraform** reads the current infrastructure state from the **Remote State Backend** (e.g., AWS S3 with DynamoDB for state locking) to determine the execution plan.
4. **AWS API** creates, updates, or deletes resources (Network, Security, Compute) as directed by Terraform.
5. **Configuration Handoff**: Once the EC2 instance is running, Terraform outputs the public IP. Software configuration (Spring Boot, React, MySQL, Jenkins) is handled either by an injected `user_data` script (cloud-init) or a subsequent Ansible playbook run against the new IP.

## Standard Architecture Patterns

1. **Remote State Management**: State (`terraform.tfstate`) must be stored remotely (typically S3) and locked (typically DynamoDB) to prevent concurrent state corruption when multiple developers or CI/CD pipelines run Terraform.
2. **Modular Directory Structure**: Separating modules from environments.
   ```text
   terraform/
   ├── modules/
   │   ├── network/
   │   ├── compute/
   │   └── security/
   ├── environments/
   │   ├── dev/
   │   └── prod/
   ```
3. **Separation of Concerns (Provisioning vs. Configuration)**: Terraform is strictly used for *provisioning* immutable infrastructure (the "hardware"). A dedicated configuration management tool (like the existing Ansible setup) or `user_data` shell scripts are used for *configuring* mutable state (the "software" dependencies).
4. **Data Sources for Dynamic Lookups**: Using Terraform `data` blocks to dynamically fetch the latest Amazon Machine Image (AMI) IDs rather than hardcoding them.

## Confidence Levels

- **High Confidence**: The architectural pattern of splitting Network, Security, and Compute into Terraform modules and using Remote State is an industry standard and highly proven.
- **Medium Confidence**: The exact integration strategy between Terraform provisioning the EC2 host and the existing Jenkins CI / Ansible deployment pipeline. The hand-off mechanism (e.g., dynamically updating Ansible's inventory file with Terraform's output IP) requires precise coordination.

## Open Considerations for the Roadmap

- **State Backend**: Do we provision the S3 bucket and DynamoDB table manually (or via a separate bootstrap Terraform script) to hold the state?
- **Configuration Handoff**: Will the existing Ansible playbooks be executed by Terraform (via `local-exec` provisioner) or run independently in a subsequent Jenkins pipeline stage?
