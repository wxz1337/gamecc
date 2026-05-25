const inFlightRequests = new Map<string, Promise<unknown>>();

export async function runWithInFlightDeduplication<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existingRequest = inFlightRequests.get(key);

  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  let trackedRequest: Promise<T>;

  trackedRequest = Promise.resolve()
    .then(factory)
    .finally(() => {
      if (inFlightRequests.get(key) === trackedRequest) {
        inFlightRequests.delete(key);
      }
    }) as Promise<T>;

  inFlightRequests.set(key, trackedRequest);

  return trackedRequest;
}

