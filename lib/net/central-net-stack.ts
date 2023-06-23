import { type Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as lattice from 'aws-cdk-lib/aws-vpclattice'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as ram from 'aws-cdk-lib/aws-ram'
import * as r53 from 'aws-cdk-lib/aws-route53'
import { type Config } from '../config'

interface CentralNetworkStackProps extends cdk.StackProps {
  config: Config
  serviceNames: string[]
}

/**
 * Resources for VPC Lattice central admin networking resources
 */
export class CentralNetworkStack extends cdk.Stack {
  hostedZone: r53.IHostedZone
  sn: cdk.aws_vpclattice.CfnServiceNetwork

  constructor (scope: Construct, id: string, props: CentralNetworkStackProps) {
    super(scope, id, props)

    const { serviceNames } = props
    const { hostedZoneId, orgArn, orgId, rootDomain } = props.config

    // The HostedZone must be created in advance outside of this application
    this.hostedZone = r53.HostedZone.fromHostedZoneAttributes(
      this, 'HostedZone', {
        hostedZoneId,
        zoneName: rootDomain
      }
    )

    // Add NS delegation for service subdomains
    for (const serviceName of serviceNames) {
      const nsRecordParam = new cdk.CfnParameter(this, `${serviceName}NsRecords`, {
        type: 'CommaDelimitedList',
        description: `NS servers for ${serviceName} (${serviceName}.${rootDomain})`
      })

      new r53.RecordSet(this, `${serviceName}NSRecordSet`, {
        recordType: r53.RecordType.NS,
        zone: this.hostedZone,
        recordName: `${serviceName}.${rootDomain}`,
        target: r53.RecordTarget.fromValues(...nsRecordParam.valueAsList)
      })
    }

    // Create the VPC Lattice Service Network
    const sn = new lattice.CfnServiceNetwork(this, 'ServiceNetwork', {
      authType: 'AWS_IAM',
      name: 'service-network'
    })

    // Only allow principals from the AWS Organization
    new lattice.CfnAuthPolicy(this, 'ServiceNetworkPolicy', {
      resourceIdentifier: sn.attrArn,
      policy: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: 'vpc-lattice-svcs:Invoke',
            Resource: '*',
            Condition: {
              StringEquals: {
                'aws:PrincipalOrgID': [orgId]
              }
            }
          }
        ]
      }
    })

    // Configure centralised logging for all VPC Lattice requests
    const logGroup = new logs.LogGroup(this, 'ServiceNetworkLogGroup', {
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    new lattice.CfnAccessLogSubscription(this, 'Loggage', {
      resourceIdentifier: sn.attrArn, // This can be a reference to a service or a service network
      destinationArn: logGroup.logGroupArn
    })

    // Share the Service Network with Resource Access Manager (RAM)
    new ram.CfnResourceShare(this, 'ServiceNetworkShare', {
      allowExternalPrincipals: false,
      name: 'ServiceNetworkShare',
      principals: [orgArn],
      resourceArns: [sn.attrArn]
    })

    // Make the Service Network ID available for automated deployment of associated services and VPCs
    this.exportValue(sn.attrArn, { name: 'central-service-network-id' })
  }
}
