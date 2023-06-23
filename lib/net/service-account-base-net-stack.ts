import { type Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as r53 from 'aws-cdk-lib/aws-route53'
import * as Case from 'case'

import { type Config } from '../config'

interface ServiceAccountBaseNetStackProps extends cdk.StackProps {
  serviceName: string
  config: Config
}

/**
 * Route53 Hosted Zone for NS delegated in a Service account
 */
export class ServiceAccountBaseNetStack extends cdk.Stack {
  constructor (scope: Construct, id: string, props: ServiceAccountBaseNetStackProps) {
    super(scope, id, props)
    const { serviceName, config: { rootDomain } } = props

    const serviceZone = new r53.HostedZone(this, `${Case.capital(serviceName)}Zone`, {
      zoneName: `${serviceName}.${rootDomain}`
    })

    this.exportValue(serviceZone.hostedZoneId, { name: 'service-zone-id' })
    this.exportValue(cdk.Fn.join(',', serviceZone.hostedZoneNameServers!), {
      name: `${serviceName}-ns-records`
    })
  }
}
