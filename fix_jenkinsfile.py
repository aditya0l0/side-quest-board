import re

filepath = r'c:\Users\adity\.gemini\antigravity-ide\scratch\side-quest-board\Jenkinsfile.infra'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Terraform mounts
content = re.sub(
    r'([ \t]*)-v \$\{WORKSPACE\}/\$\{TF_DIR\}:/workspace \\\\\r?\n([ \t]*)-w /workspace \\\\',
    r'\1--volumes-from jenkins \\\\\n\2-w ${WORKSPACE}/${TF_DIR} \\\\',
    content
)

# Replace Packer mounts
content = re.sub(
    r'([ \t]*)-v \$\{WORKSPACE\}:/workspace \\\\\r?\n([ \t]*)-w /workspace/\$\{PACKER_DIR\} \\\\',
    r'\1--volumes-from jenkins \\\\\n\2-w ${WORKSPACE}/${PACKER_DIR} \\\\',
    content
)

# Replace out= path for terraform plan
content = content.replace('-out=/workspace/tfplan-${BUILD_NUMBER}.bin \\', '-out=tfplan-${BUILD_NUMBER}.bin \\')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
