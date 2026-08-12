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

  # ── Step 1: Install Ansible on the builder instance ───────────────────────
  # Ubuntu 22.04 enforces PEP 668 (externally-managed-environment), which
  # blocks `pip3 install` on the system Python. Use the official Ansible PPA
  # instead — this is the distro-supported installation method.
  # NOTE: The ansible-local provisioner (Step 2) uploads playbook_file and
  #       inventory_file from the Packer host automatically — no separate file
  #       provisioner or manual inventory write is needed.
  provisioner "shell" {
    inline = [
      "echo '>>> [Packer] Updating apt cache...'",
      "sudo apt-get update -qq",
      "echo '>>> [Packer] Adding Ansible PPA...'",
      "sudo apt-get install -y software-properties-common",
      "sudo apt-add-repository --yes --update ppa:ansible/ansible",
      "echo '>>> [Packer] Installing Ansible via apt...'",
      "sudo apt-get install -y ansible",
      "echo '>>> [Packer] Ansible version:' && ansible --version",
      "echo '>>> [Packer] Ansible ready.'"
    ]
  }

  # ── Step 2: Run provision.yml via ansible-local ───────────────────────────
  # ansible-local uploads playbook_file + inventory_file from the Packer HOST
  # (the Jenkins workspace / packer container) to a staging dir on the builder
  # instance, then executes ansible-playbook locally on the builder.
  #
  # IMPORTANT — path semantics:
  #   playbook_file  = path on the PACKER HOST (validated by `packer validate`)
  #   inventory_file = path on the PACKER HOST (validated by `packer validate`)
  # Both files are uploaded to the builder instance staging directory by Packer.
  provisioner "ansible-local" {
    # Path on the Packer host (Jenkins workspace). Packer uploads this file.
    playbook_file  = "../ansible/provision.yml"

    # Static localhost inventory committed to packer/ dir on the host.
    inventory_file = "localhost.ini"

    # Extra vars mirroring group_vars/webservers.yml defaults.
    # Each variable gets its own -e flag so ansible-playbook receives them as
    # separate, valid --extra-vars arguments. Merging multiple key=value pairs
    # into a single "--extra-vars" token causes Packer's shell splitting to
    # leave trailing tokens as unrecognised positional arguments (exit 2).
    extra_arguments = [
      "-e", "app_name=sidequest",
      "-e", "app_dir=/opt/sidequest",
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
      "sudo apt-get remove -y ansible software-properties-common || true",
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
