# Terraform — Side-Quest Board Infrastructure

This directory contains all Terraform code for managing the AWS infrastructure
that runs the Side-Quest Board application.

## Architecture

```
aws_security_group.sidequest   ← firewall (22, 80, 443)
aws_instance.sidequest         ← EC2 (launched from var.ami_id)
aws_eip.sidequest              ← Elastic IP (stable public address)
aws_eip_association.sidequest  ← binds EIP to the instance
```

---

## Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| Terraform | 1.6+ | https://developer.hashicorp.com/terraform/install |
| AWS CLI | 2.x | https://aws.amazon.com/cli/ |

AWS credentials must be available via environment variables:
```bash
export AWS_ACCESS_KEY_ID=<your-key>
export AWS_SECRET_ACCESS_KEY=<your-secret>
export AWS_DEFAULT_REGION=eu-north-1
```

---

## First-Time Setup

```bash
# 1. Copy and fill in your tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your real values

# 2. Initialise Terraform (downloads AWS provider)
terraform init

# 3. Preview what Terraform will create/change
terraform plan

# 4. Apply (creates or modifies resources)
terraform apply
```

---

## Importing the Existing EC2 Instance

The current instance at `16.171.34.41` was created manually. Use these steps
to bring it under Terraform management **without destroying it**.

### Step 1 — Find resource IDs

```bash
# Instance ID
aws ec2 describe-instances \
  --filters "Name=ip-address,Values=16.171.34.41" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text
# → e.g. i-0abc1234def56789

# Security Group ID
aws ec2 describe-instances \
  --instance-ids i-0abc1234def56789 \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text
# → e.g. sg-0abc1234def56789

# Elastic IP Allocation ID (if an EIP is already associated)
aws ec2 describe-addresses \
  --public-ips 16.171.34.41 \
  --query 'Addresses[0].AllocationId' \
  --output text
# → e.g. eipalloc-0abc1234def56789
# If this returns "None", the IP is not an EIP — skip the EIP import step.
```

### Step 2 — Import each resource

```bash
terraform import aws_security_group.sidequest   sg-0abc1234def56789
terraform import aws_instance.sidequest         i-0abc1234def56789
terraform import aws_eip.sidequest              eipalloc-0abc1234def56789
```

### Step 3 — Reconcile state with config

After importing, run `terraform plan`. Terraform will show a diff between the
imported resource attributes and what `main.tf` declares. Common reconciliations:

- **Security group rules** — adjust `ingress`/`egress` blocks to match existing rules.
- **AMI ID** — set `var.ami_id` in `terraform.tfvars` to the imported instance's current AMI.
- **Key name** — set `var.key_name` to the existing key pair name.

Run `terraform apply` once the plan shows **no destructive changes**.

---

## Baking a New Golden AMI (via Jenkinsfile.infra)

The `Jenkinsfile.infra` pipeline automates the full bake cycle:

1. `terraform apply` — creates a fresh instance from the base Ubuntu AMI.
2. `ansible/provision.yml` — installs Docker, Nginx, ufw on the fresh instance.
3. `packer build` — creates an AMI snapshot of the configured instance.
4. `terraform apply -var ami_id=<new-ami>` — replaces the running instance with
   one booted from the golden AMI (Docker/Nginx pre-installed).
5. Pipeline commits the new AMI ID to `terraform.tfvars` for the next run.

### Manual bake (without Jenkins)

```bash
# From the project root:
cd packer
packer init .
packer build -var "base_ami_id=$(cd ../terraform && terraform output -raw ami_id 2>/dev/null || echo ami-0989fb15ce71ba39e)" sidequest-ami.pkr.hcl

# Then update terraform/terraform.tfvars with the new AMI ID and apply:
cd ../terraform
terraform apply -var "ami_id=ami-<new-id-from-packer>"
```

---

## State

State is stored locally in `terraform.tfstate` (git-ignored).

To migrate to S3 (recommended for teams), see the commented instructions in
`backend.tf`.

---

## Outputs

After `terraform apply`:

```bash
terraform output ec2_public_ip    # → e.g. 16.171.34.41 (EIP)
terraform output ec2_instance_id  # → e.g. i-0abc1234def56789
```

The `ec2_public_ip` output is consumed by `Jenkinsfile.infra` and passed as
`EC2_HOST` to downstream `Jenkinsfile.deploy` runs.
