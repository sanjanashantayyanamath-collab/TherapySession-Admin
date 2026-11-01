export function validate(schema) {
  return (request, _response, next) => {
    const result = schema.safeParse({
      body: request.body,
      query: request.query,
      params: request.params,
    });
    if (!result.success) {
      return next(result.error);
    }
    request.body = result.data.body ?? request.body;
    request.query = result.data.query ?? request.query;
    request.params = result.data.params ?? request.params;
    return next();
  };
}
