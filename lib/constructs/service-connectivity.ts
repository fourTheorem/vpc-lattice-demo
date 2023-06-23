import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as r53 from 'aws-cdk-lib/aws-route53'
import * as lattice from 'aws-cdk-lib/aws-vpclattice'
import { type ICertificate } from 'aws-cdk-lib/aws-certificatemanager'
import { type IHostedZone } from 'aws-cdk-lib/aws-route53'
import * as Case from 'case'

interface ServiceConnectivityProps {
  orgId: string
  serviceName: string
  serviceDomainName: string
  cert: ICertificate
  serviceZone: IHostedZone
  serviceNetworkId: string
  /**
   * Optional VPC Configuration. If this property is not defined, no VPC is created and the
   * lattice service is linked to the lattice service network without any VPC association
   */
  vpcConfiguration?: {
    interfaceEndpointServices: Record<string, ec2.IInterfaceVpcEndpointService>
    gatewayEndpointServices: Record<string, ec2.IGatewayVpcEndpointService>
  }
}

/**
 * Construct encapsulating the VPC Lattice resources and related resources required to
 * be a service within a Service Network. VPC configuration is optional, only being required
 * for services that also consume Lattice services.
 */
export class ServiceConnectivity extends Construct {
  vpc: ec2.IVpc
  public readonly latticeService: lattice.CfnService

  constructor (scope: Construct, id: string, props: ServiceConnectivityProps) {
    super(scope, id)

    const { cert, serviceName, serviceZone, serviceNetworkId, serviceDomainName, vpcConfiguration } = props

    // Create the lattice service, linking it to the custom domain being used
    this.latticeService = new lattice.CfnService(this, 'LatticeService', {
      authType: 'AWS_IAM',
      certificateArn: cert.certificateArn,
      customDomainName: serviceDomainName,
      dnsEntry: {
        hostedZoneId: serviceZone.hostedZoneId,
        domainName: serviceDomainName
      }
    })

    // Enforce authorisation with IAM for the service. This ensure that principals are in the
    // AWS Organization but would be more fine-grained in a typical production deployment.
    new lattice.CfnAuthPolicy(this, `Service${Case.capital(serviceName)}Policy`, {
      resourceIdentifier: this.latticeService.attrArn,
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
                'aws:PrincipalOrgID': [props.orgId]
              }
            }
          }
        ]
      }
    })

    if (vpcConfiguration) {
      // Set up a VPC with private subnets, flow logs, and some interface endpoints, if configured
      const privateSubnetConfig = {
        name: serviceName,
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }

      this.vpc = new ec2.Vpc(this, serviceName, {
        subnetConfiguration: [privateSubnetConfig],
        restrictDefaultSecurityGroup: false,
        flowLogs: {
          FlowLogCW: {
            destination: ec2.FlowLogDestination.toCloudWatchLogs()
          }
        }
      })

      for (const [label, gwService] of Object.entries(vpcConfiguration.gatewayEndpointServices)) {
        this.vpc.addGatewayEndpoint(`${label}GwEndpoint`, { service: gwService })
      }

      for (const [label, ifService] of Object.entries(vpcConfiguration.interfaceEndpointServices)) {
        this.vpc.addInterfaceEndpoint(`${label}IfEndpoint`, { service: ifService })
      }

      // Associate the VPC with the shared Service Network so requests can be made from within the subnets
      new lattice.CfnServiceNetworkVpcAssociation(this, 'VpcAssoc', {
        serviceNetworkIdentifier: serviceNetworkId,
        vpcIdentifier: this.vpc.vpcId
      })
    }

    // Associate the service with the shared Service Network
    new lattice.CfnServiceNetworkServiceAssociation(this, 'ServiceAssoc', {
      serviceNetworkIdentifier: serviceNetworkId,
      serviceIdentifier: this.latticeService.attrId
    })

    // Custom domain setup requires a CNAME to resolve the Lattice link-local IP using the generated VPC lattice domain
    new r53.RecordSet(this, 'LatticeCname', {
      recordType: r53.RecordType.CNAME,
      recordName: 'service', // we need a subdomain from the zone apex for a CNAME
      target: r53.RecordTarget.fromValues(this.latticeService.attrDnsEntryDomainName),
      zone: serviceZone
    })
  }
}
