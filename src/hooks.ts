import { ObjectSchema } from 'yup';

import { useHooks, parseEvent, handleUnexpectedError } from 'lambda-hooks';

interface ValidationConfig {
  bodySchema?: ObjectSchema;
  pathSchema?: ObjectSchema;
}

export const withHooks = useHooks({
  before: [parseEvent],
  after: [],
  onError: [handleUnexpectedError],
});

export const withValidation = (config: ValidationConfig) => {
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
    // throw Error('missing the required body schema');
    return state;
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
    return state;
    // throw Error('missing the required body schema');
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
