---
theme: seriph
# background: https://images.unsplash.com/photo-1600256660029-1bc93d56503e?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&dl=clay-leconey-aTU7-rYuRc4-unsplash.jpg&w=1920
background: https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80
class: text-center
highlighter: shiki
lineNumbers: false
info: |
  Stuff
drawings:
  persist: false
transition: slide-left
title: VPC Lattice
---

# VPC Lattice

---

# Links
Slides and code

🎪 Slides: https://fourtheorem.github.io/vpc-lattice-demo/

👩‍💻 Code: https://github.com/fourTheorem/vpc-lattice-demo

---

# VPC Lattice
What is it?

↔️ Inbound/outbound East-West connectivity between services/applications with zero-trust auth

🏢 Single or multiple accounts

😌 Minimal network configuration

🛜 No issues with overlapping IP CIDRs

🔓 High level and fine-grained access control 

🔍 Service discovery without sidecars or routing tables

🔀 Traffic control, load balancing and path-based routing

---

# Use Cases

- 📡 Communication between microservices
- 🚪 Private APIs (with custom domains - easier than API Gateway!)
- ✨ Migration/modernisation (swapping out instances/containers/functions) 

---

# Works with
Supported application tech

🕸️ Existing VPCs

🖥️ EC2 instances

📦 ECS and EKS 

🐑 Lambda functions not running in a VPC

---

# Comparison
Prior alternatives

1. Transit Gateway
2. VPC Peering
3. PrivateLink
4. Over the internet (Internet Gateway)
5. Routing tables
6. Service discovery / Service Mesh

**ℹ️ VPC Lattice primarily tries to address the friction between admins and devs in configuring service networking**

---

# Concepts

|_Concept_ |_Summary_ | _Details_ |
|-- |-- | -- |
|**Service** | - IP address or application unit on EC2, ECS, K8S or Lambda <br/> - Usually owned by dev team | - Custom domain supported <br/> - Share with RAM - Optional IAM policy |
|**Service Network** | - Logical control plane <br/> - Usually owned by network admin | - Associate VPCs <br/> - Associate Services <br/> - Optional IAM Policy <br/> - Share with RAM <br/> - Access logs |

--- 

# Services

|_Feature_ | _Details_ |
|-- |-- |
|**Listener** | HTTPS and gRPC listener, like load balancer listener |
|**Target Group** | Collection of targets (IP, EC2, Lambda, EKS, ALB) |
|**Rule** | Prioritised path-based routing |


In order to create a Lambda-service, you do not need to associate it with a VPC. You only need a VPC to consume a service through VPC Lattice.

---

# How it works

1. 👮 Admin: Create a Service Network (with auth policy and SGs)
2. 💃 Dev: Create a Service and associate with the Service Network (with auth policy and SGs)
3. 🤸‍♀️ Service Consumer: Associate your VPC with the Service Network
4. 🤸‍♀️ ️Service Consumer: Use generated or custom DNS to discover and invoke the Service

✅ To consume a service, you need to be in a VPC associated with the Service Network

👍️ To provide a service, you don't necessarily need to be in a VPC

---

# Access Control 1/2
Boundaries and authorisation

🔵 VPC Lattice is for private, internal APIs within a set of AWS accounts. Usually within an AWS Organization but it doesn't have to be bound by that.

🟣 Services can only be accessed if your VPC is registered with the Service Network.

🟡 You can choose no authorisation or `AWS_IAM` authorisation.

🟠 Auth Policies are optional can be applied at the Service Network (coarse-grained) and Service (fine-grained)

--- 

# Access Control 2/2
Policies and signing

## Example
- Service Network Policy: Only allow principals from the AWS Organization
- Service Policy: Only allow principals with the `Project: ACME` principal tag and restrict them to `HTTP GET` requests.

If you use IAM authorisation, you must use AWSv4 signatures on the requests.

```
service: vpc-latice-svcs
```
<br/>

> ⚠️ Note:
> Lattice does not support payload request signing so you need to turn that off 
> 
> Header: `x-amz-content-hash: UNSIGNED-PAYLOAD`

---

# Cross Account
Multi-account services

Service Networks and Services can be shared with Resource Access Manager (RAM)

## Typical Setup

- Admin creates and shares Service Network with specific accounts, users, roles or the whole organization
- Dev teams create and associate the Service with the Service Network
- Dev teams associate consumer VPCs with the Service Network

---

# How does routing work?

- VPCs associated with the Service Network will resolve the generated and custom domain names to a **Link-Local IP address** 
- `169.254.171.0/24` (IPv4) `fd00:ec2:80::/64` (IPv6)
- Generated DNS names are globally available but useless outside associated VPCs
- Lattice does not consume any of your IP range!
- Link local addresses connect to a Lattice data plane within the VPC
- Lattice works within and across accounts but for a **single** region

---

# 🤗 Lattice and Lambda

* Lattice provides a **new** event trigger for Lambda
* Payload is different from (but similar to) API Gateway / ALB
* Lambda services do not have to be configured with VPC subnets - Lambda consumers _do_.

---

# 📈 Monitoring

- Log Group per Service Network or Service
- CloudWatch Metrics (per Service or Target Group)

---

# 🙈 Pricing

`us-east-1`
1. **Per Service**: 2.5¢ per hour
2. **Data processed**: 2.5¢ per GB
3. **Requests**: 10¢ per 1 million requests

Compare to Transit Gateway (10¢ per attachment per hour, 2¢ per GB)

- Expensive for many services with lots of traffic
- Despite the pitch, more palatable for service-service / application-application than microservice communication
- Worth it for the time/effort saving from reduced admin-dev strife? 🤔

---

# Demo Architecture

<img
src="/images/lattice-demo-arch.png"
style="width: 70%;"
/>

--- 

# Demo 🥁

---

# Other Resources

- [Serverless networking with VPC Lattice | Serverless Office Hours](https://www.youtube.com/watch?v=C4dw8tz_dgc)
- [Containers from the Couch - EKS Application Networking with Amazon VPC Lattice](https://www.youtube.com/watch?v=AdO0bx3N3fs)
- [Amazon VPC Lattice Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/9e543f60-e409-43d4-b37f-78ff3e1a07f5/en-US)