import type { App } from 'aws-cdk-lib'

// Wrapper for configuration parameters defined using CDK context variables
// These can be passed using `--context` in `cdk deploy` or, more simply, by populating
// `cdk.context.json`. An example is provide in `cdk.context.json.template`
export interface Config {
  orgId: string
  orgArn: string
  rootDomain: string
  hostedZoneId: string
  networkingAccount: string
  recommendationAccount: string
  cartAccount: string
}

let config: Config

export function getConfig (app: App): Config {
  if (!config) {
    config = {
      orgId: app.node.getContext('orgId'),
      orgArn: app.node.getContext('orgArn'),
      rootDomain: app.node.getContext('rootDomain'),
      hostedZoneId: app.node.getContext('hostedZoneId'),
      networkingAccount: app.node.getContext('networkingAccount'),
      recommendationAccount: app.node.getContext('recommendationAccount'),
      cartAccount: app.node.getContext('cartAccount')
    }
  }
  return config
}
