import { IdempotencyMiddleware, hashRequest } from './idempotency.middleware';
import { IdempotencyRepository } from '../../modules/idempotency/idempotency.repository';

function mockRepository(): jest.Mocked<IdempotencyRepository> {
  return {
    findByKey: jest.fn(),
    create: jest.fn(),
    storeResponse: jest.fn(),
  } as unknown as jest.Mocked<IdempotencyRepository>;
}

function mockResponse() {
  const res: any = {};
  res.statusCode = 200;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('IdempotencyMiddleware', () => {
  it('passes through non-mutating requests without checking the repository', async () => {
    const repository = mockRepository();
    const middleware = new IdempotencyMiddleware(repository);
    const req: any = { method: 'GET', header: () => undefined };
    const next = jest.fn();

    await middleware.use(req, mockResponse(), next);

    expect(repository.findByKey).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('passes through mutating requests with no Idempotency-Key header', async () => {
    const repository = mockRepository();
    const middleware = new IdempotencyMiddleware(repository);
    const req: any = { method: 'POST', header: () => undefined };
    const next = jest.fn();

    await middleware.use(req, mockResponse(), next);

    expect(repository.findByKey).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('replays the stored response for a repeated key with the same body', async () => {
    const repository = mockRepository();
    const body = { foo: 'bar' };
    const requestHash = hashRequest('POST', '/api/v1/things', body);
    repository.findByKey.mockResolvedValue({
      key: 'k1',
      requestHash,
      responseStatus: 201,
      responseBody: { id: '1' },
      createdAt: new Date(),
    } as any);
    const middleware = new IdempotencyMiddleware(repository);
    const req: any = { method: 'POST', originalUrl: '/api/v1/things', body, header: () => 'k1' };
    const res = mockResponse();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: '1' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a reused key whose body does not match the original request', async () => {
    const repository = mockRepository();
    repository.findByKey.mockResolvedValue({
      key: 'k1',
      requestHash: 'some-other-hash',
      responseStatus: 201,
      responseBody: { id: '1' },
      createdAt: new Date(),
    } as any);
    const middleware = new IdempotencyMiddleware(repository);
    const req: any = { method: 'POST', originalUrl: '/api/v1/things', body: { foo: 'different' }, header: () => 'k1' };
    const res = mockResponse();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(next).not.toHaveBeenCalled();
  });

  it('creates a new key record and forwards to the handler on first use', async () => {
    const repository = mockRepository();
    repository.findByKey.mockResolvedValue(null);
    const middleware = new IdempotencyMiddleware(repository);
    const req: any = { method: 'POST', originalUrl: '/api/v1/things', body: { foo: 'bar' }, header: () => 'k1' };
    const res = mockResponse();
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(repository.create).toHaveBeenCalledWith('k1', expect.any(String));
    expect(next).toHaveBeenCalled();
  });
});
