#!/bin/bash
#
# terraform_import.sh
#
# Imports the existing manually-created EC2 resources into Terraform state.
# Run from the project root (side-quest-board/).
#
# Discovered resource IDs (2026-08-11):
#   Instance  : i-04d1cb27a0d6f7cc7
#   SG        : sg-0fdb7d7072f840ffc
#   EIP       : None (no EIP exists — Terraform will CREATE a new one on first apply)
#
# Usage:
#   wsl bash scripts/terraform_import.sh

set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$WORKSPACE_ROOT/terraform"

INSTANCE_ID="i-04d1cb27a0d6f7cc7"
SG_ID="sg-0fdb7d7072f840ffc"

echo "============================================================"
echo " Side-Quest Board — Terraform Import"
echo " Workspace : $WORKSPACE_ROOT"
echo " TF dir    : $TF_DIR"
echo "============================================================"
echo ""

cd "$TF_DIR"

# ── Step 1: terraform init ────────────────────────────────────────────────────
echo ">>> Step 1: terraform init"
terraform init -input=false
echo ""

# ── Step 2: Import Security Group ────────────────────────────────────────────
echo ">>> Step 2: Importing Security Group ($SG_ID)"
terraform import aws_security_group.sidequest "$SG_ID" || {
  echo "WARN: SG import failed (may already be in state) — continuing"
}
echo ""

# ── Step 3: Import EC2 Instance ──────────────────────────────────────────────
echo ">>> Step 3: Importing EC2 Instance ($INSTANCE_ID)"
terraform import aws_instance.sidequest "$INSTANCE_ID" || {
  echo "WARN: EC2 import failed (may already be in state) — continuing"
}
echo ""

# ── Step 4: No EIP to import — Terraform will create one ─────────────────────
echo ">>> Step 4: No existing EIP found — Terraform will CREATE a new EIP and"
echo "    associate it with $INSTANCE_ID on first 'terraform apply'."
echo "    The new EIP will become the stable public address for all future deploys."
echo ""

# ── Step 5: terraform plan (dry-run to review diff) ──────────────────────────
echo ">>> Step 5: terraform plan (review before applying)"
terraform plan \
  -var "aws_region=eu-north-1" \
  -var "instance_type=t3.small" \
  -var "ami_id=ami-0aba19e56f3eaec05" \
  -var "key_name=ec2-key" \
  -input=false
echo ""

echo "============================================================"
echo " Import complete!"
echo " Review the plan output above."
echo " If the plan shows no DESTRUCTIVE changes (no -/destroy),"
echo " run: cd terraform && terraform apply -auto-approve"
echo "============================================================"
