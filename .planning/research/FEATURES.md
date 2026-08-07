# Feature Research: Terraform for Infrastructure Provisioning

## Overview
This document outlines the table-stakes (must-haves), differentiators, and anti-features for migrating the Side-Quest Board's EC2 infrastructure provisioning from Ansible to Terraform. This serves as a prescriptive guide for the migration roadmap.

## Categorized Requirements

### Must Haves (Table-Stakes)
These are the essential features required to match or slightly exceed the current baseline of the Ansible provisioning setup.

*   **Remote State Management & Locking**
    *   *Description:* Terraform must store its state file remotely (e.g., AWS S3) with state locking enabled (e.g., DynamoDB) to prevent concurrent modifications and ensure consistency in the Jenkins CI/CD pipeline.
    *   *Confidence Level:* High

*   **Declarative EC2 and Network Provisioning**
    *   *Description:* Complete declarative definition of the VPC, Subnets, Internet Gateways, Security Groups, and the EC2 instance(s) themselves.
    *   *Confidence Level:* High

*   **Outputs for Configuration Management Handoff**
    *   *Description:* Terraform must expose the provisioned EC2 instance IP addresses and DNS names as outputs. These outputs will be dynamically fed into Ansible inventories to handle the OS-level configuration and application deployment.
    *   *Confidence Level:* High

*   **Integration with Existing Jenkins Pipeline**
    *   *Description:* The Jenkins pipeline must be updated to execute `terraform init`, `terraform plan`, and `terraform apply` stages securely.
    *   *Confidence Level:* High

### Differentiators
These are the capabilities where Terraform outshines Ansible for infrastructure provisioning and provide the primary ROI for this migration.

*   **Dry-Run Previews (`terraform plan`)**
    *   *Description:* Jenkins must output the deployment plan for review before execution, providing a visual preview of additions, changes, and destructions. This significantly reduces the risk of accidental infrastructure teardowns.
    *   *Confidence Level:* High

*   **Automated Dependency Graph Execution**
    *   *Description:* Leverage Terraform's native resource dependency graph (e.g., ensuring a Security Group is fully provisioned before attaching it to an EC2 instance) instead of procedural delays or manual task ordering.
    *   *Confidence Level:* High

*   **Drift Detection and Remediation**
    *   *Description:* Ability to run periodic `terraform plan` checks to detect if manual changes (ClickOps) have occurred in the AWS console, allowing the team to quickly reconcile the "desired state" with reality.
    *   *Confidence Level:* Medium (Depends on CI/CD schedule implementation)

*   **Infrastructure Modularity**
    *   *Description:* Use Terraform modules to encapsulate the Side-Quest Board infrastructure pattern, making it trivial to spin up staging or QA environments identical to production.
    *   *Confidence Level:* Medium (Might be overkill for a single node, but highly valuable for future scaling)

## Anti-Features
These are practices that **must be avoided** during and after the migration to Terraform.

*   **Anti-Feature: Complex OS Configuration via Terraform**
    *   *Description:* Do not use Terraform's `remote-exec`, `local-exec`, or extremely complex `user_data` scripts for installing Java, MySQL, React, or application code. 
    *   *Prescription:* Terraform's job ends at the infrastructure layer. Ansible must be retained and used for all post-boot configuration management.
    *   *Confidence Level:* High

*   **Anti-Feature: Storing Local State in Version Control**
    *   *Description:* The `terraform.tfstate` file often contains sensitive data (e.g., DB credentials, API keys) in plain text.
    *   *Prescription:* Never commit `.tfstate` files to the Git repository. Always use a secure remote backend.
    *   *Confidence Level:* High

*   **Anti-Feature: Manual AWS Console Changes (ClickOps)**
    *   *Description:* Modifying EC2 instances, security groups, or networking directly in the AWS web console.
    *   *Prescription:* All infrastructure modifications must go through code changes in Terraform via the Jenkins pipeline to maintain a single source of truth and avoid drift.
    *   *Confidence Level:* High
