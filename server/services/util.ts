export async function asyncOnMap<T, RAsync, R>(records: Record<string, T>, asyncFn: (value: T, id: string) => Promise<RAsync>, process: (id: string, value: T, result: RAsync) => R) {
  const asyncResults = await Promise.all(Object.entries(records)
    .map(([k, v]) => asyncFn(v, k).then(r => ({ asyncResult: r, id: k })))
  );

  return asyncResults.reduce((accum, cur) => (
    { ...accum, [cur.id]: process(cur.id, records[cur.id], cur.asyncResult) }
  ), {} as Record<string, R>);
}