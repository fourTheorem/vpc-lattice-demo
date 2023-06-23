#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import * as Case from 'case'
import { CentralNetworkStack } from '../lib/net/central-net-stack'
import { ServiceAccountBaseNetStack } from '../lib/net/service-account-base-net-stack'
import { RecommendationServiceStack } from '../lib/recommendation-service/recommendation-service-stack'
import { DemoClientStack } from '../lib/c9-client-stack'
import { getConfig } from '../lib/config'
import { CartServiceStack } from '../lib/cart-service/cart-service-stack'

const app = new cdk.App()
const config = getConfig(app)

const serviceNames = ['recommendation', 'cart']

// Load the account IDs
const networkingAccount = config.networkingAccount
const serviceAccounts = Object.fromEntries(serviceNames.map(service => [service, (config as any)[`${service}Account`]]))

// Deploy the base networking resources for each service account
for (const serviceName of serviceNames) {
  const serviceAccount: string = serviceAccounts[serviceName]
  if (!serviceAccount) {
    throw new Error(`No context argument specified for ${serviceName}Account`)
  }
  new ServiceAccountBaseNetStack(app, `${Case.capital(serviceName)}BaseNet`, {
    serviceName,
    env: {
      account: serviceAccount,
      region: app.region
    },
    config
  })
}

// Deploy the central VPC Lattice network resources in the networking account
new CentralNetworkStack(app, 'CentralNetwork', {
  env: {
    account: networkingAccount,
    region: app.region
  },
  config,
  serviceNames
})

// Deploy the recommendation service in its own account
new RecommendationServiceStack(app, 'RecommendationService', {
  env: {
    account: serviceAccounts.recommendation,
    region: app.region
  },
  config
})

// Deploy the cart service in its own account
new CartServiceStack(app, 'CartService', {
  env: {
    account: serviceAccounts.cart,
    region: app.region
  },
  config
})

// The demo client stack (EC2 instance) can be deployed separately but the VPC association with the Service Network manually
new DemoClientStack(app, 'DemoClient')
