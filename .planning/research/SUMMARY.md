# Project Research Summary

**Project:** Side-Quest Board Terraform Migration
**Domain:** Infrastructure Provisioning / DevOps
**Researched:** 2026-08-07
**Confidence:** HIGH

## Executive Summary

The project is a migration of EC2 infrastructure provisioning from Ansible to Terraform for the Side-Quest Board (React + Spring Boot + MySQL). This transition shifts the infrastructure from a procedural approach (Ansible) to a declarative state management model (Terraform), establishing a modern, scalable DevOps foundation.

The recommended approach relies on a layered architecture where Terraform provisions the immutable underlying infrastructure (VPC, Subnets, Security Groups, EC2), and Ansible configures the mutable software applications (Java, MySQL, Nginx) post-boot. This is orchestrated via a Jenkins CI/CD pipeline. Crucial to this architecture is maintaining a remote state backend (S3 with DynamoDB locking) and implementing dynamic configuration handoffs between Terraform's outputs and Ansible's execution.

Key risks revolve around state management and the declarative nature of Terraform causing accidental resource destruction. Managing remote state properly, refraining from using Terraform for OS-level software installation, and strictly preventing manual AWS console changes are essential to mitigating these pitfalls.

## Key Findings

### Recommended Stack

Terraform and Ansible are used complementarily rather than mutually exclusively, relying on industry-standard state and connectivity configurations.

**Core technologies:**
- **Terraform (`~> 1.15.0`)**: IaC Engine — provides a mature, stable declarative execution environment for AWS.
- **HashiCorp AWS Provider (`~> 6.58.0`)**: AWS Provider — essential for robust interaction with AWS APIs and security features.
- **S3 + DynamoDB**: State Management — prevents concurrent apply conflicts and secures state through versioning and locking.
- **Ansible `aws_ec2` Dynamic Inventory**: Configuration Handoff — eliminates static IPs by dynamically querying AWS for newly provisioned instances.
- **AWS Systems Manager (SSM)**: Secure Connectivity — allows Ansible to configure EC2 instances agentlessly without opening public SSH (Port 22).

### Expected Features

**Must have (table stakes):**
- Remote State Management & Locking
- Declarative EC2 and Network Provisioning
- Outputs for Configuration Management Handoff
- Integration with Existing Jenkins Pipeline

**Should have (competitive):**
- Dry-Run Previews (`terraform plan`) in Jenkins
- Automated Dependency Graph Execution
- Drift Detection and Remediation
- Infrastructure Modularity

**Anti-Features (Must avoid):**
- Complex OS Configuration via Terraform (`local-exec` / `remote-exec`)
- Storing Local State in Version Control
- Manual AWS Console Changes (ClickOps)

### Architecture Approach

The architecture separates concerns strictly: Terraform provisions the "hardware," while Ansible handles the "software" dependencies. The Terraform codebase itself will be split into logical modules.

**Major components:**
1. **Network Module (`modules/network`)** — Handles VPC, Public/Private Subnets, Internet Gateways, and Route Tables.
2. **Security Module (`modules/security`)** — Handles Security Groups (Inbound/Outbound rules) and IAM Roles/Instance Profiles.
3. **Compute Module (`modules/compute`)** — Handles EC2 Instances, EBS Volumes, Elastic IPs, and outputs for handoffs.

### Critical Pitfalls

1. **State Management Disasters** — Storing state locally or in Git causes corruption and synchronization issues. Avoid by using an S3 backend with DynamoDB locking.
2. **Accidental Resource Destruction** — Changing immutable properties forces Terraform to replace instances. Avoid by meticulously reviewing `terraform plan` and using `prevent_destroy` on critical resources like DB volumes.
3. **Treating Terraform like Configuration Management** — Using Terraform to install software creates brittle deployments. Avoid by separating concerns and cleanly handing off outputs to Ansible for Day 2 configuration.
4. **The Orchestration Handoff Gap** — CI/CD pipelines failing because instances are booted but not fully ready for SSH/SSM. Avoid by implementing robust wait conditions or polling logic in the Jenkins pipeline post-Terraform apply.
5. **Configuration Drift** — Outages caused by manual AWS UI changes being reverted by Terraform. Avoid by maintaining strict IaC discipline and immediately backporting emergency manual fixes.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: State Management & Scaffolding
**Rationale:** Remote state is an absolute prerequisite to running any team-based Terraform operations.
**Delivers:** Provisioned S3 Bucket, DynamoDB Table, and the basic directory structure (`modules/` and `environments/`).
**Addresses:** Remote State Management & Locking.
**Avoids:** State Management Disasters and Storing Local State in Version Control.

### Phase 2: Core Infrastructure Modules (Network & Security)
**Rationale:** The foundational networking and security layers must exist before compute resources can be attached to them.
**Delivers:** `network` and `security` Terraform modules.
**Uses:** Terraform, HashiCorp AWS Provider.
**Implements:** Network and Security architecture components.

### Phase 3: Compute Provisioning & Handoff Integration
**Rationale:** EC2 instances depend on the prior phase, and the handoff relies on EC2 outputs.
**Delivers:** `compute` module, Terraform outputs (IPs/DNS), and updated Jenkins pipeline with `terraform plan/apply` stages and wait conditions.
**Addresses:** Declarative EC2 Provisioning, Outputs for Handoff, Integration with Existing Jenkins Pipeline.
**Avoids:** Accidental Resource Destruction, The Orchestration Handoff Gap, Treating Terraform like Configuration Management.

### Phase 4: Ansible Integration & Final Testing
**Rationale:** The final deployment relies on seamless communication between Terraform's outputs and Ansible's configuration engine.
**Delivers:** Dynamic Ansible inventory integration via SSM and end-to-end CI/CD deployment testing.
**Uses:** Ansible `aws_ec2` Dynamic Inventory, AWS SSM.
**Addresses:** Dry-Run Previews, Drift Detection.

### Phase Ordering Rationale

- Bootstrapping the remote state backend must be the very first step to establish the declarative source of truth safely.
- The standard dependency graph dictates that networks and security boundaries are established before compute resources are placed inside them.
- Deferring configuration handoffs and dynamic inventory updates to the end ensures that the underlying immutable infrastructure is solid before introducing software configuration complexity.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** State bootstrapping. Decide whether to provision the S3/DynamoDB backend manually or via a separate, standalone Terraform script that isn't part of the main state.
- **Phase 3:** Jenkins integration might require specific research around securely injecting AWS credentials into the Jenkins Terraform executor and parsing Terraform outputs.
- **Phase 4:** Dynamic inventory via SSM requires careful research into correct IAM role permissions for the EC2 instance and Ansible agent.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Writing the VPC and Security Group modules follows extremely standard, well-documented HashiCorp patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | The Terraform + Ansible layered approach is industry-standard for EC2 provisioning. |
| Features | HIGH | Clear separation of table stakes and anti-features prevents scope creep. |
| Architecture | HIGH | Modular setups are heavily documented and reliable. |
| Pitfalls | HIGH | The failure modes are well-understood and have standard mitigations. |

**Overall confidence:** HIGH

### Gaps to Address

- Initial state bootstrapping: Determine if the S3 bucket and DynamoDB table will be created manually (acceptable for one-off bootstraps) or via an isolated Terraform repository.
- Jenkins Agent Dependencies: Verify if the existing Jenkins agents have the required Terraform CLI versions and IAM permissions to execute the AWS Provider tasks.

## Sources

### Primary (HIGH confidence)
- STACK.md — Stack recommendations and modern layered workflows.
- FEATURES.md — Table stakes and required integrations.
- ARCHITECTURE.md — Module boundaries and data flows.
- PITFALLS.md — Systemic failure modes and prevention strategies.

---
*Research completed: 2026-08-07*
*Ready for roadmap: yes*
