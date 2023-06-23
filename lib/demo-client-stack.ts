import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import { type Construct } from 'constructs'

/**
 * EC2 instance stack that can be used to make VPC Lattice requests once you associate this stack's
 * VPC with the Service Network in VPC Lattice.
 */
export class DemoClientStack extends cdk.Stack {
  constructor (scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const vpc = new ec2.Vpc(this, 'DemoClientVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/27'),
      maxAzs: 1,
      subnetConfiguration: [{
        name: 'demo-client-private',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }, {
        name: 'demo-client-public',
        subnetType: ec2.SubnetType.PUBLIC
      }],
      restrictDefaultSecurityGroup: false,
      natGateways: 1,
      flowLogs: {
        FlowLogCW: {
          destination: ec2.FlowLogDestination.toCloudWatchLogs()
        }
      }
    })

    const instance = new ec2.Instance(this, 'DemoClientInstance', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
      vpc,
      machineImage: ec2.MachineImage.latestAmazonLinux2({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64
      })
    })
    instance.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))
  }
}
