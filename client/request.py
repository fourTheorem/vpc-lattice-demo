#!/usr/bin/env python3
import sys
import argparse

from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials
from botocore.session import Session
from botocore.httpsession import URLLib3Session

parser = argparse.ArgumentParser(description="Send an HTTP request to an endpoint.")
parser.add_argument("endpoint", help="The URL endpoint to send the request to.")
parser.add_argument("--method", default="GET", help="The HTTP method to use (default: GET)")
parser.add_argument("--region", default="eu-west-1", help="The region (default: eu-west-1)")
parser.add_argument("--data", help="The payload")
parser.add_argument("-v", "--verbose", action='store_true', default=False, help="Turns on verbose request and response logging to STDERR")
args = parser.parse_args()

endpoint = args.endpoint
http_method = args.method.upper()
data = args.data.encode() if args.data else None
verbose = args.verbose

def print_debug(*args, **kwargs):
    if verbose:
        print(*args, **kwargs, file=sys.stderr)

if __name__ == "__main__":
    session = Session()
    sigv4 = SigV4Auth(session.get_credentials(), "vpc-lattice-svcs", "eu-west-1")
    request = AWSRequest(method=http_method, url=endpoint, data=data, headers={"Content-Type": "application/json"})
    request.context["payload_signing_enabled"] = False  # This is mandatory since VPC Lattice does not support payload signing. Not providing this will result in error.
    sigv4.add_auth(request)
    http_session = URLLib3Session()
    prepared = request.prepare()
    print_debug(prepared.method, prepared.url)
    for k, v in prepared.headers.items():
        print_debug(f"{k}: {v}")
    print_debug(prepared.body.decode())

    response = http_session.send(prepared)

    print_debug("Status", response.status_code)
    for k, v in response.headers.items():
        print_debug(f"{k}: {v}")

    print(response._content.decode())