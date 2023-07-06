import { type Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as python from '@aws-cdk/aws-lambda-python-alpha'
import * as lattice from 'aws-cdk-lib/aws-vpclattice'

import { EcsApi } from './ecs-api'
import { ServiceStack } from '../service-stack'
import { type Config } from '../config'

interface ServiceBStackProps extends cdk.StackProps {
  config: Config
}

/**
 * Stack for the cart services. This provides a Lattice HTTP endpoint but also consumes the
 * recommendation service using Lattice. It needs a VPC and VPC Endpoints (since the subnets are private).
 *
 * Traffic to the `/items` endpoint is divided between a Lambda-backed target and an ECS (Fargate) target with a 50:50 ratio.
 * The underlying logic for each of these targets is the same, illustrating how you might shift traffic from one compute
 * service to another as part of a migration or modernisation
 */
export class CartServiceStack extends ServiceStack {
  constructor (scope: Construct, id: string, props: ServiceBStackProps) {
    super(scope, id, {
      serviceName: 'cart',
      vpcConfiguration: {
        gatewayEndpointServices: {
          s3: ec2.GatewayVpcEndpointAwsService.S3
        },
        interfaceEndpointServices: {
          ecr: ec2.InterfaceVpcEndpointAwsService.ECR,
          ecrDocker: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
          ssmMessages: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
          logs: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS
        }
      },
      ...props
    })

    const { config: { rootDomain } } = props

    const cartFunction = new python.PythonFunction(this, 'CartFunction', {
      entry: __dirname,
      index: 'cart_item_handler.py',
      handler: 'handle_add_item',
      runtime: lambda.Runtime.PYTHON_3_10,
      environment: {
        RECOMMENDATION_URL: `https://service.recommendation.${rootDomain}/recommendations`
      },
      vpc: this.serviceConnectivity.vpc,
      timeout: cdk.Duration.seconds(90),
      tracing: lambda.Tracing.ACTIVE
    })

    // Lattice consumers need IAM permissions to invoke Lattice services if IAM authorisation is defined
    cartFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['vpc-lattice-svcs:Invoke'],
      resources: ['*']
    }))

    // Create a target group for the Lambda implementation
    const cartTargetGroupLambda = new lattice.CfnTargetGroup(this, 'TGB', {
      type: 'LAMBDA',
      targets: [{ id: cartFunction.functionArn }]
    })

    // Create the ECS Fargate service
    const ecsApi = new EcsApi(this, 'EcsApi', { vpc: this.serviceConnectivity.vpc, rootDomain })

    // Create a target group for the ECS implementation
    const cartTargetGroupEcs = new lattice.CfnTargetGroup(this, 'TGBLambda', {
      type: 'ALB',
      config: {
        vpcIdentifier: this.serviceConnectivity.vpc.vpcId,
        port: 80,
        protocol: 'HTTP'
      },
      targets: [{ id: ecsApi.loadBalancer.loadBalancerArn }]
    })

    const cartListener = new lattice.CfnListener(this, 'CartListener', {
      protocol: 'HTTPS',
      serviceIdentifier: this.serviceConnectivity.latticeService.attrId,
      defaultAction: {
        fixedResponse: {
          statusCode: 404
        }
      }
    })

    // Create a listener rule that sends traffic to the Lambda and ECS services using a 50/50 distribution
    new lattice.CfnRule(this, 'CartItemPostRule', {
      listenerIdentifier: cartListener.attrId,
      serviceIdentifier: this.serviceConnectivity.latticeService.attrId,
      priority: 1,
      match: {
        httpMatch: {
          method: 'POST',
          pathMatch: {
            caseSensitive: true,
            match: {
              exact: '/items'
            }
          }
        }
      },
      action: {
        forward: {
          targetGroups: [
            {
              targetGroupIdentifier: cartTargetGroupLambda.attrId,
              weight: 50
            },
            {
              targetGroupIdentifier: cartTargetGroupEcs.attrId,
              weight: 50

            }
          ]
        }
      }
    })
  }
}
