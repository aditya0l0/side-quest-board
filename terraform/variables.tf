# variables.tf
#
# All user-facing knobs for the Side-Quest Board infrastructure.
# Sensitive values (access keys, key-pair paths) are NEVER declared here;
# they are passed via environment variables or a local terraform.tfvars file
# (which is git-ignored).

variable "aws_region" {
  description = "AWS region where all resources will be provisioned."
  type        = string
  default     = "eu-north-1" # Matches the region of the existing EC2 instance
}

variable "instance_type" {
  description = <<-EOT
    EC2 instance type for the deployment instance.
    ⚠️  COST NOTE: t3.small is NOT free-tier eligible (only t2.micro / t3.micro qualify).
    AWS Free Tier covers 750 hrs/month of t2.micro. Running t3.small incurs charges
    (~$0.0208/hr in eu-north-1). Monitor your billing dashboard to avoid surprises.
    The Packer BUILDER instance (temporary) also uses this type — it runs for ~10-15 min
    during each bake and is terminated automatically by Packer.
  EOT
  type    = string
  default = "t3.small"
}

variable "ami_id" {
  description = <<-EOT
    The AMI to launch the EC2 instance from.
    - On the very first `terraform apply`, leave this at the default Ubuntu 22.04 LTS AMI
      (eu-north-1 canonical AMI) so Terraform creates a clean base instance.
    - After Packer bakes a golden image with Docker/Nginx pre-installed, update this to
      the Packer-output AMI ID. Jenkinsfile.infra handles this automatically.
  EOT
  type    = string
  # Current running AMI on the imported instance (discovered via AWS CLI 2026-08-11).
  # Update to your Packer-baked AMI after the first bake run.
  default = "ami-0aba19e56f3eaec05"
}

variable "key_name" {
  description = <<-EOT
    Name of the EC2 Key Pair in AWS.
    The private key must already be uploaded to Jenkins as the 'ec2-ssh-key' credential.
    The matching public key must already exist in AWS (created via Console or CLI).
  EOT
  type = string
  default = "ec2-key"
}

variable "app_name" {
  description = "Short name used as the Name/Project tag on all AWS resources."
  type        = string
  default     = "sidequest"
}

variable "ssh_allowed_cidr" {
  description = <<-EOT
    CIDR block(s) allowed to SSH into the EC2 instance.
    Default is open to the world (0.0.0.0/0) to match the existing setup.
    For production, restrict this to your Jenkins agent's IP or a bastion CIDR.
  EOT
  type    = list(string)
  default = ["0.0.0.0/0"]
}
