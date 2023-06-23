import * as cdk from 'aws-cdk-lib'
import type * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as r53 from 'aws-cdk-lib/aws-route53'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import { type Construct } from 'constructs'
import * as Case from 'case'

import { ServiceConnectivity } from './constructs/service-connectivity'
import { type Config } from './config'

export interface ServiceStackProps extends cdk.StackProps {
  vpcConfiguration?: {
    gatewayEndpointServices: Record<string, ec2.IGatewayVpcEndpointService>
    interfaceEndpointServices: Record<string, ec2.IInterfaceVpcEndpointService>
  }
  serviceName: string
  config: Config
}

/**
 * Base stack for services, setting up VPC Lattice related resources with the service's account
 */
export abstract class ServiceStack extends cdk.Stack {
  protected readonly serviceConnectivity: ServiceConnectivity

  constructor (scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props)
    const { vpcConfiguration, serviceName, config: { rootDomain } } = props
    // Each service gets a subdomain. Lattice domains are a subdomain of that.
    const apexDomainName = `${serviceName}.${rootDomain}`
    const serviceNetworkId = new cdk.CfnParameter(this, 'ServiceNetworkId', { type: 'String' }).valueAsString
    const serviceZoneId = new cdk.CfnParameter(this, 'ServiceZoneId', { type: 'String' }).valueAsString
    // Look up the Hosted Zone created in the Service Base Networking Stack
    const serviceZone = r53.HostedZone.fromHostedZoneAttributes(this, 'ServiceZone', {
      hostedZoneId: serviceZoneId,
      zoneName: apexDomainName
    })

    // We can't have a CNAME at the APEX, so we will use a subdomain (`service.`) within that
    const serviceDomainName = `service.${apexDomainName}`
    // Create a HTTPS certificate for the service
    const cert = new acm.Certificate(this, `${serviceName}Cert`, {
      domainName: serviceDomainName,
      certificateName: `${serviceName} certificate`,
      validation: acm.CertificateValidation.fromDns(serviceZone)
    })

    // Set up the VPC Lattice service and, optionally, the VPC
    this.serviceConnectivity = new ServiceConnectivity(this, `Conn${Case.capital(serviceName)}`, {
      serviceName,
      serviceDomainName,
      cert,
      serviceZone,
      serviceNetworkId,
      vpcConfiguration,
      orgId: props.config.orgId
    })
  }
}
