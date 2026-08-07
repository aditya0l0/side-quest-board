# Terraform Infrastructure Provisioning: Pitfalls & Failure Modes

When migrating EC2 infrastructure provisioning from Ansible to Terraform for the Side-Quest Board, it is crucial to recognize that this is a shift from **procedural configuration** (Ansible) to **declarative state management** (Terraform). 

The following systemic pitfalls represent the most costly mistakes teams make during this transition, explaining why they occur and how to prevent them.

---

## 1. State Management Disasters (The "Stateless vs. Stateful" Mindshift)

**The Pitfall:** Losing, corrupting, or conflicting the Terraform state file, leading to orphaned infrastructure or the inability to apply new changes.

**Why it happens:** Ansible is stateless; it queries the live AWS environment during every run. Terraform, however, relies entirely on a local `terraform.tfstate` file as its single source of truth mapping your code to real-world resources. If this file is stored locally on the Jenkins server, concurrent pipeline builds can overwrite each other, or if the server crashes, the mapping is lost entirely.

**Prevention Strategies:**
- **Remote Backend:** Immediately configure a remote state backend (e.g., AWS S3) to store the state file safely.
- **State Locking:** Implement state locking (e.g., using an AWS DynamoDB table) so that if Jenkins triggers two concurrent infrastructure jobs, one will wait rather than corrupting the state.
- **Never commit state to Git:** State files often contain sensitive information and fall out of sync with branches. Keep them in the remote backend.

---

## 2. Accidental Resource Destruction (The "Replace" Surprise)

**The Pitfall:** A seemingly minor configuration tweak triggers Terraform to completely destroy and recreate the EC2 instance, causing critical downtime and potential data loss (e.g., dropping the MySQL database hosted on the instance).

**Why it happens:** Because Terraform is declarative, if you change a property that the cloud provider considers immutable (like an `ami` ID or sometimes `user_data`), Terraform's only path to achieve the desired state is to destroy the existing resource and build a new one.

**Prevention Strategies:**
- **Read the Plan:** Always execute and meticulously review `terraform plan` in the CI/CD pipeline before applying. Train the team to look for the `-/+` (destroy and create) symbol, not just `+` or `~`.
- **Lifecycle Protections:** Use the `lifecycle { prevent_destroy = true }` block on critical resources (like the EC2 instance hosting MySQL) to force Terraform to throw an error rather than destroying it.
- **Decouple Data:** If possible, provision a separate EBS volume for the MySQL data and attach it to the EC2 instance. This way, if the compute instance is recreated, the data volume remains intact.

---

## 3. Treating Terraform like Configuration Management

**The Pitfall:** Creating brittle, unreliable deployments by trying to install software, copy Spring Boot JAR files, or configure MySQL databases using Terraform's `local-exec` or `remote-exec` provisioners.

**Why it happens:** Coming from Ansible, engineers often expect their provisioning tool to handle OS-level setup. However, Terraform provisioners are essentially blind scripts. If a `remote-exec` script fails halfway through, Terraform leaves the resource in a "tainted" state, making subsequent runs unpredictable.

**Prevention Strategies:**
- **Separate Concerns:** Use Terraform strictly for "Day 0" provisioning (VPCs, Security Groups, EC2 creation).
- **Proper Handoff:** Output the necessary connection details (like EC2 IPs) from Terraform. In the Jenkins pipeline, pass those outputs to a dedicated configuration tool. You can either use `user_data` (cloud-init) for simple bootstrapping or run Ansible playbooks in a subsequent pipeline step to handle the "Day 2" OS and app configuration.

---

## 4. The Orchestration Handoff Gap (Race Conditions)

**The Pitfall:** The Jenkins CI/CD pipeline fails sporadically immediately after Terraform finishes, claiming the server is unreachable.

**Why it happens:** Terraform considers its job done (and exits successfully) the moment the AWS API confirms the EC2 instance has been created. However, the OS takes time to boot, initialize, and start the SSH daemon. If Jenkins immediately fires off an Ansible playbook or deployment script, it will fail to connect.

**Prevention Strategies:**
- **Pipeline Wait Conditions:** Implement robust retry logic or wait conditions in the Jenkins pipeline after the `terraform apply` step to poll the SSH port (22) until the instance is genuinely ready to receive commands.

---

## 5. Configuration Drift via Manual Console Changes

**The Pitfall:** An emergency fix is applied directly in the AWS Console (e.g., opening a security group port), and during the next automated deployment, the fix is silently reverted, causing an outage.

**Why it happens:** When infrastructure breaks, the fastest fix is often clicking through the UI. But Terraform acts as an enforcer of its codebase. When it runs, it notices the live environment has "drifted" from the code and will aggressively revert the manual changes to match the `.tf` files.

**Prevention Strategies:**
- **Strict IaC Discipline:** Foster a culture where *all* changes go through the Terraform code and Jenkins pipeline.
- **Immediate Backporting:** If a critical production emergency requires a manual console change, it must be documented immediately and backported into the Terraform code before the next CI pipeline run.
