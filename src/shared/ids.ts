/** A unique id with a readable prefix, for floors, tasks, messages and sprints. */
export function nextId(prefix: string): string {
  return `${prefix}${crypto.randomUUID()}`;
}
