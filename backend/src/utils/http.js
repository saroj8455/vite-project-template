export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function getRequestMetadata(req) {
  return {
    ipAddress: req.ip || '',
    userAgent: req.get('user-agent') || '',
  };
}

export function publicUser(user) {
  return {
    id: user.id,
    dummyJsonId: user.dummyJsonId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    image: user.image,
  };
}
