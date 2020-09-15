# Serverless Utils

![GitHub package.json version](https://img.shields.io/github/package-json/v/praisegeek/serverless-utils) ![GitHub top language](https://img.shields.io/github/languages/top/praisegeek/serverless-utils) ![GitHub last commit](https://img.shields.io/github/last-commit/praisegeek/serverless-utils)

A collection of helper utilities when working on AWS Serverless lambda.

Install

```bash
npm i @praisegeek/serverless-utils
```

## Helpers

- Dynamodb
- API Validation Hooks
- Responses

### Dynamodb

**Dynamodb local listens on port 8000**

Example usage

```js
import { dynamodb as db } from '@praisegeek/serverless-utils';

// Async-Await
async () => {
  const user = await db.get('user-table', 1);

  console.log(user);
  // { id: 1, name: Praise }
};

// Promise
db.get('user-table', 1)
  .then((user) => {
    console.log(user);
    // { id: 1, name: Praise }
  })
  .catch((err) => {
    console.log(err);
  });
```

**All Methods**

- get
- put
- update
- delete
- query
- scan
- batchGet
- batchWrite

**Pagination**

Query and Scan returns a nextToken string which is used to get more or previous items

```js
import { dynamodb as db } from '@praisegeek/serverless-utils';

async () => {
  const admins = await db.query('user-table', {
    IndexName: 'roles',
    KeyConditionExpression: 'roles = :roles',
    ExpressionAttributeValues: {
      ':roles': 'admins',
    },
    NextToken: 'a163c127-7440-4836-85a0-f3b6ef2b51b1',
  });

  console.log(admins);
  // { count: 5, nextToken: 'f7e089d8-bc53-4b01-9e71-92fc9bc60fca', items: [ {id: 1, name: 'Praise' }, ... ] }
};
```

## Milestone

- [x] DynamoDB Helpers
- [x] Request Validations
- [x] Response Headers
- [x] Typescript Support
- [ ] Cognito Authentication ( Email/Password, Social Auth, OpenID )
- [ ] Uploaders
- [ ] Stripe Helpers
