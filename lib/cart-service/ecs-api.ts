import { Construct } from 'constructs'
import type * as ec2 from 'aws-cdk-lib/aws-ec2'
import type * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns'
import * as iam from 'aws-cdk-lib/aws-iam'

interface EcsApiProps {
  vpc: ec2.IVpc
  rootDomain: string
}

export class EcsApi extends Construct {
  loadBalancer: elbv2.IApplicationLoadBalancer

  constructor (scope: Construct, id: string, props: EcsApiProps) {
    super(scope, id)
    const cluster = new ecs.Cluster(this, 'EcsApiCluster', {
      vpc: props.vpc
    })

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'EcsApiService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(__dirname),
        containerPort: 80,
        environment: {
          RECOMMENDATION_URL: `https://service.recommendation.${props.rootDomain}/recommendations`
        }
      },
      enableExecuteCommand: true,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
      },
      circuitBreaker: { rollback: true },
      assignPublicIp: false,
      publicLoadBalancer: false
    })
    service.targetGroup.configureHealthCheck({ path: '/health' })
    service.taskDefinition.taskRole.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['vpc-lattice-svcs:Invoke'],
      resources: ['*']
    }))

    this.loadBalancer = service.loadBalancer
  }
}
