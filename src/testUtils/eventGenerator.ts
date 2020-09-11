interface APIGatewayRequest {
  body: object;
  method?: any;
  path?: string;
  queryStringObject?: object | null;
  pathParametersObject?: object | null;
  stageVariables?: any;
}

const APIGatewayRequest = ({
  body,
  method,
  path = '',
  queryStringObject,
  pathParametersObject,
  stageVariables = null,
}: APIGatewayRequest) => {
  const request = {
    body: body ? JSON.stringify(body) : null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: method,
    isBase64Encoded: false,
    path,
    pathParameters: pathParametersObject || null,
    queryStringParameters: queryStringObject || null,
    multiValueQueryStringParameters: null,
    stageVariables,
    requestContext: {
      accountId: '',
      apiId: '',
      httpMethod: method,
      identity: {
        accessKey: '',
        accountId: '',
        apiKey: '',
        apiKeyId: '',
        caller: '',
        cognitoAuthenticationProvider: '',
        cognitoAuthenticationType: '',
        cognitoIdentityId: '',
        cognitoIdentityPoolId: '',
        principalOrgId: '',
        sourceIp: '',
        user: '',
        userAgent: '',
        userArn: '',
      },
      path,
      stage: '',
      requestId: '',
      requestTimeEpoch: 3,
      resourceId: '',
      resourcePath: '',
    },
    resource: '',
  };
  return request;
};

export default APIGatewayRequest;