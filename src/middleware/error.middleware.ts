import type { ErrorRequestHandler, Express, RequestHandler } from 'express';

const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: 'Ruta no encontrada',
    path: request.path,
  });
};

const internalErrorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  console.error(error);
  response.status(500).json({ error: 'Error interno del servidor' });
};

export function registerErrorHandlers(app: Express): void {
  app.use(notFoundHandler);
  app.use(internalErrorHandler);
}
