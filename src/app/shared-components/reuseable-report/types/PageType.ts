export enum PageType {
  A4 = 'A4',
  A3 = 'A3',
  Letter = 'Letter',
}

export const pageDimensions: { [key in PageType]: { width: string, height: string } } = {
  [PageType.A4]: { width: '794px', height: '1123px' },
  [PageType.A3]: { width: '1123px', height: '1587px' },
  [PageType.Letter]: { width: '816px', height: '1056px' },
};
