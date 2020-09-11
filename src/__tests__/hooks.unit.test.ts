import * as hooks from '../hooks';
import eventGenerator from '../testUtils/eventGenerator';
import * as lamdba from '../testUtils/lambda';

test('Check if hooks are present', () => {
  expect(typeof hooks).toBe('object');
});

describe('withHooks validation tests', () => {
  test('withHooks is defined', () => {
    expect(hooks.withHooks).toBeDefined();
  });

  test('it should take a body, log event and return a JSON object as response', async () => {
    const event = eventGenerator({
      body: {
        ID: 1,
        name: 'Praise',
        email: 'praisegeek@gmail.com',
        active: true,
      },
    });

    const res = await lamdba.withHooksHandler(event, null);

    expect(res).toBeDefined();
    expect(typeof res).toBe('object');
  });
});

describe('withPathValidation validation tests', () => {
  test('withPathValidation is defined', () => {
    expect(hooks.withPathValidation).toBeDefined();
  });

  test('it should validate input fields and slugs in path parameters', async () => {
    const event = eventGenerator({
      body: {
        name: 'Praise',
        email: 'praise',
      },
      method: 'PUT',
      pathParametersObject: {
        ID: 1,
      },
    });

    const res = await lamdba.withPathValidation(event, null);

    expect(res).toBeDefined();
    expect(typeof res).toBe('object');

    expect(res.statusCode).toEqual(400);
    expect(JSON.parse(res.body).error).toBe('email must be a valid email');
  });
});
