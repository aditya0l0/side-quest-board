# main.tf
#
# Core AWS infrastructure for the Side-Quest Board.
#
# Resources managed here:
#   - aws_security_group   — firewall rules (ports 22, 80, 443)
#   - aws_instance         — EC2 compute (launched from var.ami_id)
#   - aws_eip              — Elastic IP (stable public address across instance replacements)
#   - aws_eip_association  — binds the EIP to the EC2 instance
#
# ── IMPORTING THE EXISTING INSTANCE ─────────────────────────────────────────
# The instance at 16.171.34.41 was created manually. To bring it under
# Terraform management without destroying it, run once:
#
#   # 1. Find the Instance ID from the AWS console or:
#   aws ec2 describe-instances \
#     --filters "Name=ip-address,Values=16.171.34.41" \
#     --query 'Reservations[0].Instances[0].InstanceId' \
#     --output text
#
#   # 2. Find the Security Group ID:
#   aws ec2 describe-instances \
#     --instance-ids <INSTANCE_ID> \
#     --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
#     --output text
#
#   # 3. Find the Allocation ID of the Elastic IP (if one exists):
#   aws ec2 describe-addresses \
#     --public-ips 16.171.34.41 \
#     --query 'Addresses[0].AllocationId' \
#     --output text
#
#   # 4. Import each resource:
#   terraform import aws_security_group.sidequest   <SG_ID>
#   terraform import aws_instance.sidequest         <INSTANCE_ID>
#   terraform import aws_eip.sidequest              <ALLOCATION_ID>
#
# See terraform/README.md for the full step-by-step import guide.
# ─────────────────────────────────────────────────────────────────────────────

provider "aws" {
  region = var.aws_region

  # Credentials are read from:
  #   - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
  #   - OR: ~/.aws/credentials (local dev)
  # Jenkins injects them via withCredentials([]) — never hardcode here.

  default_tags {
    tags = {
      Project     = var.app_name
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}

# ── Security Group ────────────────────────────────────────────────────────────
resource "aws_security_group" "sidequest" {
  name        = "${var.app_name}-sg"
  description = "Side-Quest Board - allow SSH, HTTP, and HTTPS inbound; all outbound"

  # SSH — restricted to var.ssh_allowed_cidr (default: open for Jenkins agent access)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidr
  }

  # HTTP — public traffic to Nginx reverse proxy
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS — for future TLS termination
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Port 8080 — Jenkins / Spring Boot direct access (matches existing SG rule)
  ingress {
    description = "Jenkins / Spring Boot API"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Port 8443 — Jenkins HTTPS / Spring Boot HTTPS (matches existing SG rule)
  ingress {
    description = "Jenkins HTTPS / Spring Boot HTTPS"
    from_port   = 8443
    to_port     = 8443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic allowed (Docker pulls, apt updates, etc.)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-sg"
  }

  lifecycle {
    create_before_destroy = true
    # Ignore description changes — the imported SG has a different description
    # ("launch-wizard-1 created ...") and changing it forces recreation.
    # We preserve the existing SG ID to avoid disrupting the running instance.
    ignore_changes = [description, name]
  }
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────
resource "aws_instance" "sidequest" {
  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  vpc_security_group_ids = [aws_security_group.sidequest.id]

  # Root volume: 16 GiB gp3 (matches existing imported instance; free-tier allows up to 30 GiB EBS)
  # ⚠️  NOTE: t3.small is NOT free-tier eligible (~$0.0208/hr in eu-north-1).
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 16
    delete_on_termination = true
    encrypted             = false
  }

  # User-data runs once on first boot.
  # When launching from a GOLDEN AMI (post-Packer), this is effectively a no-op
  # since Docker and Nginx are already installed in the AMI.
  # When launching from a BASE AMI (first bootstrap), this is also empty —
  # Ansible provision.yml handles all installation after Terraform creates the instance.
  user_data = <<-EOF
    #!/bin/bash
    # Intentionally minimal — all provisioning is handled by Ansible (provision.yml)
    # or is pre-baked into the golden AMI by Packer.
    echo "Side-Quest Board instance started — $(date)" >> /var/log/sidequest-boot.log
  EOF

  tags = {
    Name = "${var.app_name}-server"
  }

  # IMPORTANT: Changing the AMI (e.g. after Packer bakes a new golden image)
  # will cause Terraform to REPLACE the instance (terminate old, create new).
  # The Elastic IP (aws_eip) is re-associated automatically, preserving the public IP.
  lifecycle {
    # create_before_destroy ensures the new instance is healthy before the old one is terminated.
    create_before_destroy = true
  }
}

# ── Elastic IP ────────────────────────────────────────────────────────────────
# The EIP stays fixed even when the EC2 instance is replaced (e.g. after
# `terraform apply -var ami_id=<new-golden-ami>`). This means:
#   - The DNS name (16.171.34.41) stays the same
#   - Jenkins parameter EC2_HOST never needs to be updated
#   - Ansible inventory stays correct
resource "aws_eip" "sidequest" {
  domain = "vpc"

  tags = {
    Name = "${var.app_name}-eip"
  }
}

resource "aws_eip_association" "sidequest" {
  instance_id   = aws_instance.sidequest.id
  allocation_id = aws_eip.sidequest.id
}
