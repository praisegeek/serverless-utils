import AWS from 'aws-sdk';
import camelCaseKeys from 'camelcase-keys';
import {
  GetItemOutput,
  QueryOutput,
  DeleteItemOutput,
  ScanOutput,
  PutItemOutput,
  UpdateItemOutput,
  BatchWriteItemOutput,
  BatchWriteItemInput,
  BatchGetItemInput,
  BatchGetItemOutput,
} from 'aws-sdk/clients/dynamodb';

let options = {};
if (process.env.IS_OFFLINE) {
  options = {
    region: 'localhost',
    endpoint: 'http://localhost:8000',
  };
}

const dynamoDB = new AWS.DynamoDB.DocumentClient(options);

type ExpressionType = {
  UpdateExpression: string;
  ExpressionAttributeNames?: {
    [key: string]: string;
  };
  ExpressionAttributeValues: {
    [key: string]: string | number | undefined | null;
  };
};

/**
 * Transforms Sort Direction for dynamoDB
 * @param sort
 */
export function getSort(sort: string) {
  if (sort === 'ASC') {
    return true;
  }
  return false;
}

function buildUpdateExpression(input: object): ExpressionType {
  const keys = Object.keys(input);
  const expressions = keys
    .reduce((a, b, index) => {
      a = ` ${a} #${b} = :${b}`;
      if (index !== keys.length - 1) {
        a = `${a},`;
      }
      return a;
    }, 'SET')
    .trim();

  const expressionNames = keys.reduce((a, b) => {
    // @ts-ignore
    a[`#${b}`] = b;
    return a;
  }, {});

  const expressionValues = keys.reduce((a, b) => {
    // @ts-ignore
    a[`:${b}`] = input[b];
    return a;
  }, {});

  return {
    UpdateExpression: expressions,
    ExpressionAttributeNames: expressionNames,
    ExpressionAttributeValues: expressionValues,
  };
}

function toJSON(value: any) {
  if (typeof value === 'object' && value != null && 'toJSON' in value) {
    return value.toJSON();
  }
  return value;
}

type DDBFilterExpression = {
  expressions: string[];
  expressionNames: { [key: string]: string };
  expressionValues: { [key: string]: string };
};

const OPERATOR_MAP = {
  ne: '<>',
  eq: '=',
  lt: '<',
  le: '<=',
  gt: '>',
  ge: '>=',
};

const FUNCTION_MAP = {
  contains: 'contains',
  notContains: 'NOT contains',
  beginsWith: 'begins_with',
};

function generateFilterExpression(filter: any, prefix = null, parent = null): DDBFilterExpression {
  const expr = Object.entries(filter).reduce(
    // @ts-ignore
    (sum, [name, value]) => {
      let subExpr = {
        expressions: [],
        expressionNames: {},
        expressionValues: {},
      };
      const fieldName = createExpressionFieldName(parent);
      const filedValueName = createExpressionValueName(parent, name, prefix);

      switch (name) {
        case 'or':
        case 'and':
          const JOINER = name === 'or' ? 'OR' : 'AND';
          if (Array.isArray(value)) {
            subExpr = scopeExpression(
              value.reduce((expr, subFilter, idx) => {
                const newExpr = generateFilterExpression(
                  subFilter,
                  // @ts-ignore
                  [prefix, name, idx].filter((i) => i !== null).join('_'),
                );
                return merge(expr, newExpr, JOINER);
              }, subExpr),
            );
          } else {
            // @ts-ignore
            subExpr = generateFilterExpression(value, [prefix, name].filter((val) => val !== null).join('_'));
          }
          break;
        case 'not':
          subExpr = scopeExpression(
            // @ts-ignore
            generateFilterExpression(value, [prefix, name].filter((val) => val !== null).join('_')),
          );
          // @ts-ignore
          subExpr.expressions.unshift('NOT');
          break;
        case 'between':
          const expr1 = createExpressionValueName(parent, 'between_1', prefix);
          const expr2 = createExpressionValueName(parent, 'between_2', prefix);
          const exprName = createExpressionName(parent);
          const subExprExpr = `${createExpressionFieldName(parent)} BETWEEN ${expr1} AND ${expr2}`;
          const exprValues = {
            // @ts-ignore
            ...createExpressionValue(parent, 'between_1', value[0], prefix),
            // @ts-ignore
            ...createExpressionValue(parent, 'between_2', value[1], prefix),
          };
          subExpr = {
            // @ts-ignore
            expressions: [subExprExpr],
            expressionNames: exprName,
            expressionValues: exprValues,
          };
          break;
        case 'ne':
        case 'eq':
        case 'gt':
        case 'ge':
        case 'lt':
        case 'le':
          const operator = OPERATOR_MAP[name];
          subExpr = {
            // @ts-ignore
            expressions: [`${fieldName} ${operator} ${filedValueName}`],
            expressionNames: createExpressionName(parent),
            expressionValues: createExpressionValue(parent, name, value, prefix),
          };
          break;
        case 'contains':
        case 'notContains':
        case 'beginsWith':
          const functionName = FUNCTION_MAP[name];
          subExpr = {
            // @ts-ignore
            expressions: [`${functionName}(${fieldName}, ${filedValueName})`],
            expressionNames: createExpressionName(parent),
            expressionValues: createExpressionValue(parent, name, value, prefix),
          };
          break;
        default:
          // @ts-ignore
          subExpr = scopeExpression(generateFilterExpression(value, prefix, name));
      }
      return merge(sum, subExpr);
    },
    {
      expressions: [],
      expressionNames: {},
      expressionValues: {},
    },
  );

  // @ts-ignore
  return expr;
}

function merge(expr1: DDBFilterExpression, expr2: DDBFilterExpression, joinCondition = 'AND'): DDBFilterExpression {
  if (!expr2.expressions.length) {
    return expr1;
  }

  return {
    expressions: [...expr1.expressions, expr1.expressions.length ? joinCondition : '', ...expr2.expressions],
    expressionNames: { ...expr1.expressionNames, ...expr2.expressionNames },
    expressionValues: { ...expr1.expressionValues, ...expr2.expressionValues },
  };
}
// @ts-ignore
function createExpressionValueName(fieldName, op, prefix?) {
  return `:${[prefix, fieldName, op].filter((name) => name).join('_')}`;
}
// @ts-ignore
function createExpressionName(fieldName) {
  return {
    [createExpressionFieldName(fieldName)]: fieldName,
  };
}

// @ts-ignore
function createExpressionFieldName(fieldName) {
  return `#${fieldName}`;
}

// @ts-ignore
function createExpressionValue(fieldName, op, value: any, prefix?) {
  const exprName = createExpressionValueName(fieldName, op, prefix);
  const exprValue = toJSON(value); //  Converter.input(toJSON(value)); use this instead when using dynamoDB native client.
  return {
    [`${exprName}`]: exprValue,
  };
}

// @ts-ignore
function scopeExpression(expr) {
  const result = { ...expr };
  result.expressions = result.expressions.filter((e: any) => !!e);
  if (result.expressions.length > 1) {
    result.expressions = ['(' + result.expressions.join(' ') + ')'];
  }
  return result;
}

export interface PutItemOptions {
  ConditionExpression?: string;
  ReturnValues?: string;
}

interface UpdateItemParams {
  Key: {
    [key: string]: string;
  };
  UpdateExpression: string;
  ConditionExpression?: string;
  ExpressionAttributeNames?: {
    [key: string]: string;
  };
  ExpressionAttributeValues: {
    [key: string]: string | number | undefined | null;
  };
  ReturnValues?: UpdateReturnValueTypes;
}

type UpdateReturnValueTypes = 'ALL_OLD' | 'ALL_NEW' | 'UPDATED_OLD' | 'UPDATED_NEW' | 'NONE';
type DeleteReturnValueTypes = 'ALL_OLD' | 'NONE';

interface QueryItemsParams {
  Limit?: number;
  Filter?: any;
  IndexName: string;
  ScanIndexForward?: boolean;
  KeyConditionExpression: string;
  ExclusiveStartKey?: any;
  NextToken?: string | undefined | null;
  ConsistentRead?: boolean;
  ProjectionExpression?: string;
  FilterExpression?: string;
  ExpressionAttributeNames?: {
    [key: string]: string;
  };
  ExpressionAttributeValues?: {
    [key: string]: string | number | undefined | null;
  };
}

interface ScanItemsParams {
  Limit?: number;
  Filter?: any;
  ExclusiveStartKey?: any;
  ScanIndexForward?: boolean;
  NextToken?: string | undefined | null;
  ConsistentRead?: boolean;
  FilterExpression?: string | undefined;
  ExpressionAttributeNames?: {
    [key: string]: string;
  };
  ExpressionAttributeValues?: {
    [key: string]: string | number | undefined | null;
  };
}

const buildResult = (result: { [key: string]: any }) => {
  const items = {
    ...result,
    items: result.Items,
    nextToken: result.LastEvaluatedKey?.id,
  };

  return camelCaseKeys(items);
};

const buildAdvanceQuery = (params: any) => {
  let query = { ...params };

  if (params.Filter) {
    const { expressions, expressionNames, expressionValues } = generateFilterExpression(params.Filter);

    if (params.KeyConditionExpression) {
      const expAttrNames = {
        ...expressionNames,
        ...params.ExpressionAttributeNames,
      };
      const expAttrValues = {
        ...expressionValues,
        ...params.ExpressionAttributeValues,
      };

      // console.log({
      //   expAttrNames,
      //   expAttrValues,
      // });

      query = {
        ...query,
        FilterExpression: expressions.join(' ').trim(),
        ExpressionAttributeNames: expAttrNames,
        ExpressionAttributeValues: expAttrValues,
      };
    } else {
      query = {
        ...query,
        FilterExpression: expressions.join(' ').trim(),
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
      };
    }
  }

  if (params.NextToken) {
    query = {
      ...query,
      ExclusiveStartKey: {
        id: params.NextToken,
      },
    };
  }

  return query;
};

export default {
  /**
   * Get item from dynamodb table
   */
  get: async (TableName: string, ID: number | string): Promise<GetItemOutput | any> => {
    const params = {
      TableName,
      Key: {
        ID,
      },
    };
    const res = await dynamoDB.get(params).promise();

    return res.Item;
  },

  /**
   * Query items from dynamodb table
   * @deprecated
   */
  query: async (TableName: string, params: QueryItemsParams): Promise<QueryOutput | any> => {
    const _params = {
      TableName,
      ...buildAdvanceQuery(params),
    };
    const res = await dynamoDB.query(_params).promise();

    return buildResult(res);
  },

  /**
   * Delete an item from dynamodb table
   */
  delete: async (
    TableName: string,
    ID: number | string,
    Expected?: {
      [key: string]: {
        Value?: string | boolean | number;
        Exits?: boolean;
      };
    },
    ReturnValues?: DeleteReturnValueTypes,
  ): Promise<DeleteItemOutput | any> => {
    const res = await dynamoDB
      .delete({
        TableName,
        Key: {
          ID,
        },
        Expected,
        ReturnValues,
      })
      .promise();

    return res.Attributes;
  },

  /**
   * Search for records in dynamodb table
   */
  scan: async (params: ScanItemsParams): Promise<ScanOutput | any> => {
    const _params = buildAdvanceQuery(params);
    const res = await dynamoDB.scan(_params).promise();

    return buildResult(res);
  },

  /**
   * Create a new item to dynamodb table
   */
  put: async (
    TableName: string,
    Item: { [key: string]: any },
    options?: PutItemOptions,
  ): Promise<PutItemOutput | any> => {
    const _params = {
      TableName,
      Item,
      ...options,
    };
    const res = await dynamoDB.put(_params).promise();

    return res.Attributes;
  },

  /**
   * Update an existing item in dynamodb table
   */
  update: async (TableName: string, params: UpdateItemParams): Promise<UpdateItemOutput | any> => {
    const _params = {
      TableName,
      ...params,
    };
    const res = await dynamoDB.update(_params).promise();

    return res.Attributes;
  },

  /**
   * Perform batch write operations in dynamodb table
   */
  batchWrite: async (params: BatchWriteItemInput): Promise<BatchWriteItemOutput | any> => {
    const res = await dynamoDB.batchWrite(params).promise();
    return res;
  },

  /**
   * Perform batch get operations in dynamodb table
   */
  batchGet: async (params: BatchGetItemInput): Promise<BatchGetItemOutput | any> => {
    const res = await dynamoDB.batchGet(params).promise();
    return res;
  },
};
