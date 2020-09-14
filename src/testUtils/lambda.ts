import * as yup from 'yup';
import * as hooks from '../hooks';
// import Dynamodb from '../dynamodb';

const bodySchema = yup.object({
  name: yup.string().required(),
  email: yup.string().email().required(),
});

const pathSchema = yup.object({
  ID: yup.number().required(),
});

const testWithHooks = async (event: any) => {
  // already parsed body using hooks
  const user = event.body;

  user.member = 'admin';

  // const res = await Dynamodb.query('user-table', {
  //   IndexName: 'roles',
  //   KeyConditionExpression: 'roles = :roles',
  //   ExpressionAttributeValues: {
  //     ':roles': 'admins',
  //   },
  //   NextToken: 'a163c127-7440-4836-85a0-f3b6ef2b51b1',
  // });

  return user;
};

const testPathValidation = async (event: any) => {
  // validated event
  return event;
};

export const withHooksHandler = hooks.withHooks(testWithHooks);

export const withPathValidation = hooks.withValidation({ pathSchema })(testPathValidation);

export const withInputValidation = hooks.withValidation({ bodySchema })(testPathValidation);

export const withAllValidation = hooks.withValidation({ bodySchema, pathSchema })(testPathValidation);
