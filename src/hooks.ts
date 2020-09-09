import { ObjectSchemaConstructor } from "yup";

const {
  useHooks,
  logEvent,
  parseEvent,
  handleUnexpectedError,
} = require("lambda-hooks");

export const withHooks = useHooks({
  before: [logEvent, parseEvent],
  after: [],
  onError: [handleUnexpectedError],
});

export const withPathValidation = (config: {
  bodySchema: ObjectSchemaConstructor;
  pathSchema: ObjectSchemaConstructor;
}) => {
  return useHooks(
    {
      before: [logEvent, parseEvent, validatePaths, validateEventBody],
      after: [],
      onError: [handleUnexpectedError],
    },
    config
  );
};

const validatePaths = async (state: any) => {
  const { pathSchema } = state.config;

  if (!pathSchema) {
    throw Error("missing the required path schema");
  }

  try {
    const { event } = state;

    await pathSchema.validate(event.pathParameters, { strict: true });
  } catch (error) {
    console.log("yup validation error of path parameters", error);
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
    throw Error("missing the required body schema");
  }

  try {
    const { event } = state;

    await bodySchema.validate(event.body, { strict: true });
  } catch (error) {
    console.log("yup validation error of event.body", error);
    state.exit = true;
    state.response = {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }

  return state;
};
