# Requirements

## v1 Requirements

### Core Provisioning
- [ ] **PROV-01**: Remote State Management & Locking (S3/DynamoDB)
- [ ] **PROV-02**: Declarative EC2 and Network Provisioning
- [ ] **PROV-03**: Outputs for Configuration Management Handoff (IPs for Ansible)

### CI/CD
- [ ] **CICD-01**: Integration with Existing Jenkins Pipeline
- [ ] **CICD-02**: Dry-Run Previews (`terraform plan`)

## v2 Requirements

- [ ] **MOD-01**: Infrastructure Modularity (Reusable Terraform Modules)
- [ ] **CICD-03**: Automated Dependency Graph Execution
- [ ] **CICD-04**: Drift Detection and Remediation

## Out of Scope

- **Complex OS Configuration via Terraform** — Terraform's job ends at the infrastructure layer. Ansible must be retained and used for all post-boot configuration management.
- **Storing Local State in Version Control** — The `terraform.tfstate` file contains sensitive data. Always use a secure remote backend.
- **Manual AWS Console Changes (ClickOps)** — All infrastructure modifications must go through code changes in Terraform.

## Traceability

- **PROV-01**: Phase 1: State Management
- **PROV-02**: Phase 2: Core Provisioning
- **PROV-03**: Phase 2: Core Provisioning
- **CICD-01**: Phase 3: CI/CD Integration
- **CICD-02**: Phase 3: CI/CD Integration
