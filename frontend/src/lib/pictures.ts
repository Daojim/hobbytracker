/**
 * How many pictures a note has, said in place of words: *A picture*, *2 pictures*. What a screen
 * reader hears for a card's thumbnail, and what the spreadsheet's *Latest note* says when the
 * newest note has no words. Picked at the #18 workshop, and one copy, because the two are the
 * same note seen from two places.
 */
export function picturesInWords(count: number): string {
  return count === 1 ? 'A picture' : `${count} pictures`;
}
