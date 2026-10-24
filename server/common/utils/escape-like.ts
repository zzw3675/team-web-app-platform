const LIKE_SPECIAL_CHARS = /[\\%_]/g;

export function escapeLikePattern(keyword: string): string {
  return keyword.replace(LIKE_SPECIAL_CHARS, (char: string) => `\\${char}`);
}
