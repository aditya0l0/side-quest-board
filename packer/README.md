# Packer — Side-Quest Board Golden AMI

This directory contains the Packer HCL2 template for building a **golden AMI** —
an EC2 machine image pre-configured with Docker, Docker Compose, Nginx, and ufw.

When the deployment pipeline launches an EC2 from this AMI, the environment is
already fully set up. Only the application stack (via `ansible/deploy.yml`) needs
to be deployed.

---

## What the bake does

```
1. Launch temporary EC2 (t3.micro) from base Ubuntu 22.04 LTS AMI
       ↓
2. Upload ansible/ directory to the builder
       ↓
3. Install Ansible (pip3) on the builder
       ↓
4. Run ansible/provision.yml (Docker, Nginx, ufw, app directory)
       ↓
5. Validate: docker --version, nginx -v, ufw --version
       ↓
6. Clean up (remove pip, apt cache, /tmp/ansible)
       ↓
7. Snapshot → new AMI in eu-north-1
       ↓
8. Terminate builder instance (Packer handles this automatically)
       ↓
Output: AMI ID written to packer/manifest.json
```

---

## Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| Packer | 1.10+ | https://developer.hashicorp.com/packer/install |
| AWS credentials | — | via env vars or `~/.aws/credentials` |

---

## Usage

```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID=<your-key>
export AWS_SECRET_ACCESS_KEY=<your-secret>

# From the packer/ directory:
cd packer/

# Install required Packer plugins (only needed once)
packer init .

# Validate the template
packer validate .

# Build the golden AMI
packer build .

# Or override variables at build time:
packer build \
  -var "base_ami_id=ami-0989fb15ce71ba39e" \
  -var "aws_region=eu-north-1" \
  .
```

After a successful build, `packer/manifest.json` will contain the new AMI ID.

---

## Output: manifest.json

```json
{
  "builds": [
    {
      "artifact_id": "eu-north-1:ami-0abc1234def56789",
      ...
    }
  ]
}
```

Extract the AMI ID:
```bash
cat manifest.json | python3 -c "
import json, sys
m = json.load(sys.stdin)
print(m['builds'][-1]['artifact_id'].split(':')[1])
"
```

This is exactly what `Jenkinsfile.infra` does to pass the AMI ID to
`terraform apply -var ami_id=<id>`.

---

## Git-ignored files

- `packer_cache/` — Packer's local plugin cache
- `manifest.json` — contains the baked AMI ID (changes every run)
