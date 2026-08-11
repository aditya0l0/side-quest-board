# sidequest-ami.pkr.hcl
#
# Packer HCL2 template — builds a "golden AMI" for the Side-Quest Board.
#
# What this does:
#   1. Launches a temporary t3.micro from the base Ubuntu 22.04 LTS AMI.
#   2. Uploads the Ansible playbooks (provision.yml + supporting files).
#   3. Installs Ansible on the builder instance.
#   4. Runs ansible/provision.yml to install Docker, Docker Compose, Nginx, and ufw.
#   5. Snapshots the configured instance into a new AMI ("golden image").
#   6. Terminates the temporary builder instance (Packer handles cleanup).
#
# Output:
#   - A new AMI in eu-north-1 named "sidequest-golden-<timestamp>"
#   - manifest.json in the packer/ directory (AMI ID logged here)
#
# Usage:
#   # AWS credentials must be in env:
#   export AWS_ACCESS_KEY_ID=...
#   export AWS_SECRET_ACCESS_KEY=...
#
#   packer init .
#   packer validate .
#   packer build .
#
# The Jenkinsfile.infra pipeline runs this automatically.

packer {
  required_version = ">= 1.10.0"

  required_plugins {
    amazon = {
      version = ">= 1.3.0"
      source  = "github.com/hashicorp/amazon"
    }
    ansible = {
      version = ">= 1.1.0"
      source  = "github.com/hashicorp/ansible"
    }
  }
}

# ── Source: Amazon EBS ────────────────────────────────────────────────────────
# Packer launches a TEMPORARY builder EC2 instance, configures it,
# then snapshots it into an AMI. The temporary instance is terminated afterwards.
source "amazon-ebs" "sidequest" {
  region        = var.aws_region
  source_ami    = var.base_ami_id
  instance_type = var.instance_type
  ssh_username  = var.ssh_username

  # AMI name — unique per run via timestamp
  ami_name        = "${var.ami_name_prefix}-{{timestamp}}"
  ami_description = "Side-Quest Board golden AMI — pre-baked with Docker, Docker Compose, Nginx, and ufw. Built by Packer."

  # Root volume: 20 GiB gp3 (matches the Terraform EC2 root volume)
  launch_block_device_mappings {
    device_name           = "/dev/sda1"
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # Tag the resulting AMI for identification
  tags = {
    Name       = "${var.ami_name_prefix}"
    Project    = "sidequest"
    ManagedBy  = "packer"
    BuiltAt    = "{{timestamp}}"
  }

  # Tag the temporary builder instance (visible in EC2 console during build)
  run_tags = {
    Name      = "packer-builder-sidequest"
    ManagedBy = "packer"
    Temporary = "true"
  }
}

# ── Build ─────────────────────────────────────────────────────────────────────
build {
  name    = "sidequest-golden-ami"
  sources = ["source.amazon-ebs.sidequest"]

  # ── Step 1: Upload Ansible playbooks ──────────────────────────────────────
  # The ansible/ directory is uploaded from the Jenkins workspace (or local machine)
  # to /tmp/ansible/ on the builder instance.
  provisioner "file" {
    source      = "../ansible/"
    destination = "/tmp/ansible/"
  }

  # ── Step 2: Install Ansible on the builder instance ───────────────────────
  # Ubuntu 22.04 doesn't ship with Ansible. Install it via pip3 to match
  # exactly what the Jenkins deploy worker (cytopia/ansible) does.
  provisioner "shell" {
    inline = [
      "echo '>>> [Packer] Updating apt cache...'",
      "sudo apt-get update -qq",
      "echo '>>> [Packer] Installing Python3 and pip3...'",
      "sudo apt-get install -y python3 python3-pip",
      "echo '>>> [Packer] Installing Ansible via pip3...'",
      "sudo pip3 install ansible==9.*",
      "echo '>>> [Packer] Ansible version:' && ansible --version",
      "echo '>>> [Packer] Installing community.docker Ansible collection...'",
      "ansible-galaxy collection install community.docker",
      "echo '>>> [Packer] Ansible ready.'"
    ]
  }

  # ── Step 3: Run provision.yml on the builder instance ─────────────────────
  # This is equivalent to running:
  #   ansible-playbook -i localhost, -c local provision.yml
  # The playbook is idempotent — safe to re-run.
  provisioner "ansible-local" {
    # Run from the uploaded ansible/ directory
    playbook_file   = "/tmp/ansible/provision.yml"
    playbook_dir    = "/tmp/ansible/"

    # Use a simple localhost inventory (we're running directly on the builder)
    inventory_content = <<-INI
      [webservers]
      localhost ansible_connection=local ansible_python_interpreter=/usr/bin/python3
    INI

    # Extra vars mirroring group_vars/webservers.yml defaults
    extra_arguments = [
      "--extra-vars", "app_name=sidequest app_dir=/opt/sidequest",
      "-v"
    ]
  }

  # ── Step 4: Validate the installed tools ──────────────────────────────────
  provisioner "shell" {
    inline = [
      "echo '>>> [Packer] Validating baked environment...'",
      "docker --version",
      "docker compose version",
      "nginx -v",
      "ufw --version",
      "echo '>>> [Packer] All required tools are present. AMI is ready to snapshot.'"
    ]
  }

  # ── Step 5: Clean up before snapshot ──────────────────────────────────────
  # Remove Ansible, pip cache, and apt lists to keep the AMI lean.
  # Docker images are NOT cached in the AMI — they are pulled at deploy time.
  provisioner "shell" {
    inline = [
      "echo '>>> [Packer] Cleaning up builder instance before snapshot...'",
      "sudo apt-get clean",
      "sudo rm -rf /var/lib/apt/lists/*",
      "sudo pip3 uninstall ansible -y || true",
      "sudo apt-get remove -y python3-pip || true",
      "sudo apt-get autoremove -y",
      "sudo rm -rf /tmp/ansible/",
      "sudo rm -rf ~/.ansible/",
      "echo '>>> [Packer] Cleanup complete. Ready for AMI snapshot.'"
    ]
  }

  # ── Post-processor: Write manifest ────────────────────────────────────────
  # Writes the new AMI ID to packer/manifest.json.
  # Jenkinsfile.infra reads this file to extract the AMI ID for the
  # subsequent `terraform apply -var ami_id=<id>` step.
  post-processor "manifest" {
    output     = "manifest.json"
    strip_path = true
    custom_data = {
      built_by = "packer"
      project  = "sidequest"
    }
  }
}
