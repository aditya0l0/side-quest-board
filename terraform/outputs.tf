# outputs.tf
#
# Values exported after `terraform apply`.
# Jenkins stages read these via:
#   terraform output -raw ec2_public_ip

output "ec2_public_ip" {
  description = "Public IP address of the Side-Quest Board EC2 instance (Elastic IP)."
  value       = aws_eip.sidequest.public_ip
}

output "ec2_instance_id" {
  description = "AWS Instance ID — needed to import an existing instance and for AMI baking."
  value       = aws_instance.sidequest.id
}

output "ec2_private_ip" {
  description = "Private IP of the EC2 instance (for VPC-internal communication)."
  value       = aws_instance.sidequest.private_ip
}

output "security_group_id" {
  description = "ID of the EC2 security group."
  value       = aws_security_group.sidequest.id
}
