import os

from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials
import botocore.session
import requests

from aws_xray_sdk.core import patch_all

AWS_DEFAULT_REGION = os.environ["AWS_DEFAULT_REGION"]
RECOMMENDATION_URL = os.environ["RECOMMENDATION_URL"]

patch_all()

def get_recommendations(product_code):
    """ Retrieve recommendations based on product code by calling out to the recommendation service """
    session = botocore.session.Session()
    sigv4 = SigV4Auth(session.get_credentials(), "vpc-lattice-svcs", AWS_DEFAULT_REGION)
    request = AWSRequest(method="GET", url=RECOMMENDATION_URL, params={"product_code": product_code})
    request.context["payload_signing_enabled"] = False # This is mandatory since VpcLattice does not support payload signing. Not providing this will result in error.
    sigv4.add_auth(request)

    prepped = request.prepare()

    response = requests.get(prepped.url, headers=prepped.headers)
    if response.status_code == 200:
        return response.json()
    raise ValueError(f"Request failed with {response.status_code} {response.text}")