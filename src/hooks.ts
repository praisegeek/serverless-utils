import { ObjectSchemaConstructor, ObjectSchema } from 'yup';

import { useHooks, logEvent, parseEvent, handleUnexpectedError } from 'lambda-hooks';

export const withHooks = useHooks({
  before: [parseEvent],
  after: [],
  onError: [handleUnexpectedError],
});

export const withPathValidation = (config: { bodySchema: ObjectSchema; pathSchema: ObjectSchema }) => {
  return useHooks(
    {
      before: [parseEvent, validatePaths, validateEventBody],
      after: [],
      onError: [handleUnexpectedError],
    },
    config,
  );
};

const validatePaths = async (state: any) => {
  const { pathSchema } = state.config;

  if (!pathSchema) {
    throw Error('missing the required path schema');
  }

  try {
    const { event } = state;

    await pathSchema.validate(event.pathParameters, { strict: true });
  } catch (error) {
    state.exit = true;
    state.response = {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }

  return state;
};

const validateEventBody = async (state: any) => {
  const { bodySchema } = state.config;

  if (!bodySchema) {
    throw Error('missing the required body schema');
  }

  try {
    const { event } = state;

    await bodySchema.validate(event.body, { strict: true });
  } catch (error) {
    state.exit = true;
    state.response = {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }

  return state;
};
