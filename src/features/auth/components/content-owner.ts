export interface ContentOwner {
  readonly id: string | null;
  readonly generation: number;
  readonly renderedWithoutUser: boolean;
}

export const initialContentOwner: ContentOwner = {
  id: null,
  generation: 0,
  renderedWithoutUser: false,
};

export function markRenderedWithoutUser(owner: ContentOwner): ContentOwner {
  return owner.id === null && !owner.renderedWithoutUser
    ? { ...owner, renderedWithoutUser: true }
    : owner;
}

export function nextContentOwner(
  owner: ContentOwner,
  userId: string,
): ContentOwner {
  if (owner.id === userId) {
    return owner;
  }
  const keepMounted = owner.id === null && !owner.renderedWithoutUser;
  return {
    id: userId,
    generation: keepMounted ? owner.generation : owner.generation + 1,
    renderedWithoutUser: false,
  };
}
