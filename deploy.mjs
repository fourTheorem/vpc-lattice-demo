#!./node_modules/.bin/zx
import { exit } from 'node:process'
import { readFileSync } from 'node:fs'
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import Case from 'case'

const { region, rollback } = argv

if (!region) {
  console.error('Specify the target region with --region')
  exit(1)
}

const context = JSON.parse(readFileSync('cdk.context.json'))
const serviceAccounts = { recommendation: context.recommendationAccount, cart: context.cartAccount }

const serviceAccountRoles = Object.fromEntries(Object.entries(serviceAccounts).map(([service, account]) => {
  return [service, `arn:aws:iam::${account}:role/cdk-hnb659fds-deploy-role-${account}-${region}`]
}))
const sts = new STSClient({ region })

const netStackParams = {}
const serviceZoneIds = {}
for (const [service, deployRoleArn] of Object.entries(serviceAccountRoles)) {
  const stackName = `${Case.capital(service)}BaseNet`
  await cdkDeploy(stackName)
  const { [`${service}-ns-records`]: nsRecords, 'service-zone-id': serviceZoneId } = await getCfOutputs(
    stackName, deployRoleArn, `${service}-ns-records`, 'service-zone-id'
  )
  serviceZoneIds[service] = serviceZoneId
  netStackParams[`${service}NsRecords`] = nsRecords
}

await cdkDeploy('CentralNetwork', netStackParams)
const { 'central-service-network-id': serviceNetworkId } = await getCfOutputs('CentralNetwork')
await cdkDeploy('CartService', { ServiceNetworkId: serviceNetworkId, ServiceZoneId: serviceZoneIds.cart })
await cdkDeploy('RecommendationService', { ServiceNetworkId: serviceNetworkId, ServiceZoneId: serviceZoneIds.recommendation })

async function cdkDeploy (stackName, cfnParameters = {}) {
  const params = Object.entries(cfnParameters).reduce((acc, [name, value]) => [...acc, '--parameters', `${name}=${value}`], [])
  if (rollback === false) {
    params.push('--no-rollback')
  }
  await $`npx cdk deploy --require-approval=never ${stackName} ${params} --output cdk.out/${stackName}`
}

async function getCfOutputs (stackName, roleArn, ...exportNames) {
  let credentials
  if (roleArn) {
    const assumedRole = await sts.send(new AssumeRoleCommand({ RoleArn: roleArn, RoleSessionName: 'Deploy' }))
    const { AccessKeyId: accessKeyId, SecretAccessKey: secretAccessKey, SessionToken: sessionToken } = assumedRole.Credentials
    credentials = { accessKeyId, secretAccessKey, sessionToken }
  }
  const cf = new CloudFormationClient({ region, credentials })
  const response = await cf.send(new DescribeStacksCommand({ StackName: stackName }))
  return Object.fromEntries(response.Stacks[0].Outputs.map(o => [o.ExportName, o.OutputValue]))
}
