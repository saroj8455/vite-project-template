export function validate(schema, property = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      return res.status(400).json({
        message: 'Request validation failed.',
        errors: result.error.flatten(),
      });
    }
    req[property] = result.data;
    return next();
  };
}
