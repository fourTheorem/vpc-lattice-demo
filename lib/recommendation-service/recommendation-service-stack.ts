import { type Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as python from '@aws-cdk/aws-lambda-python-alpha'
import * as lattice from 'aws-cdk-lib/aws-vpclattice'

import { ServiceStack } from '../service-stack'
import { type Config } from '../config'

interface ServiceAStackProps extends cdk.StackProps {
  config: Config
}

/**
 * Stack for the recommendation service, providing a Lambda-backed API
 * for retrieving related recommendations based on a product code
 */
export class RecommendationServiceStack extends ServiceStack {
  constructor (scope: Construct, id: string, props: ServiceAStackProps) {
    super(scope, id, {
      serviceName: 'recommendation',
      ...props
    })

    const recFunction = new python.PythonFunction(this, 'CartFunction', {
      entry: __dirname,
      index: 'recommendation_handler.py',
      handler: 'handle_get_recommendations',
      runtime: lambda.Runtime.PYTHON_3_10,
      timeout: cdk.Duration.seconds(90),
      tracing: lambda.Tracing.ACTIVE
    })

    // Create a single Lattice Target Group for HTTP requests
    const recTg = new lattice.CfnTargetGroup(this, 'TGRec', {
      type: 'LAMBDA',
      targets: [{ id: recFunction.functionArn }]
    })

    const recListener = new lattice.CfnListener(this, 'RecListener', {
      protocol: 'HTTPS',
      serviceIdentifier: this.serviceConnectivity.latticeService.attrId,
      defaultAction: {
        fixedResponse: {
          statusCode: 404
        }
      }
    })

    // Set up path-based routing for `GET /recommendations`
    new lattice.CfnRule(this, 'RecommendationsGetRule', {
      listenerIdentifier: recListener.attrId,
      serviceIdentifier: this.serviceConnectivity.latticeService.attrId,
      priority: 1,
      match: {
        httpMatch: {
          method: 'GET',
          pathMatch: {
            caseSensitive: true,
            match: {
              exact: '/recommendations'
            }
          }
        }
      },
      action: {
        forward: {
          targetGroups: [
            {
              targetGroupIdentifier: recTg.attrId,
              weight: 100
            }
          ]
        }
      }
    })
  }
}
