# backend.tf
#
# Terraform state backend configuration.
#
# Currently: LOCAL FILE backend.
#   State is stored in terraform/terraform.tfstate (git-ignored).
#   This is sufficient for a single-developer project.
#
# ── Migrating to S3 (when ready) ────────────────────────────────────────────
# 1. Create an S3 bucket:
#      aws s3 mb s3://sidequest-terraform-state --region eu-north-1
# 2. Create a DynamoDB table for state locking:
#      aws dynamodb create-table \
#        --table-name sidequest-tf-locks \
#        --attribute-definitions AttributeName=LockID,AttributeType=S \
#        --key-schema AttributeName=LockID,KeyType=HASH \
#        --billing-mode PAY_PER_REQUEST \
#        --region eu-north-1
# 3. Replace the block below with:
#
#   terraform {
#     backend "s3" {
#       bucket         = "sidequest-terraform-state"
#       key            = "prod/terraform.tfstate"
#       region         = "eu-north-1"
#       dynamodb_table = "sidequest-tf-locks"
#       encrypt        = true
#     }
#   }
#
# 4. Run: terraform init -migrate-state
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state — file is git-ignored via .gitignore
  backend "local" {
    path = "terraform.tfstate"
  }
}
