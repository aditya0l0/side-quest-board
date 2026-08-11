# variables.pkr.hcl
#
# Input variables for the Side-Quest Board Packer template.
# Override at build time:
#   packer build -var "base_ami_id=ami-xxx" sidequest-ami.pkr.hcl

variable "aws_region" {
  description = "AWS region where Packer will launch the builder instance."
  type        = string
  default     = "eu-north-1"
}

variable "base_ami_id" {
  description = <<-EOT
    The source AMI that Packer will launch and then configure.
    On the first bake, this should be the Ubuntu 22.04 LTS AMI for eu-north-1.
    Set to the latest Canonical Ubuntu AMI for your region.
  EOT
  type    = string
  default = "ami-0989fb15ce71ba39e" # Ubuntu 22.04 LTS — eu-north-1 — 2026-08
}

variable "instance_type" {
  description = <<-EOT
    EC2 instance type for the temporary Packer builder instance.
    ⚠️  COST NOTE: t3.small is NOT free-tier eligible. The builder runs for ~10-15 min
    per bake and is terminated automatically by Packer, so the cost is minimal (~$0.005).
  EOT
  type    = string
  default = "t3.small"
}

variable "ssh_username" {
  description = "SSH username for the AMI. Ubuntu AMIs use 'ubuntu'."
  type        = string
  default     = "ubuntu"
}

variable "ami_name_prefix" {
  description = "Prefix for the generated AMI name. A timestamp is appended automatically."
  type        = string
  default     = "sidequest-golden"
}
