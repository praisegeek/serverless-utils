import * as yup from 'yup';
import * as hooks from '../hooks';

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

  return user;
};

const testPathValidation = async (event: any) => {
  // validated event
  return event;
};

export const withHooksHandler = hooks.withHooks(testWithHooks);

export const withPathValidation = hooks.withPathValidation({ bodySchema, pathSchema })(testPathValidation);
