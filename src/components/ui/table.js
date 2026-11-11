// Row numbers that continue across pages: on page 2 of 10 per page the
// first row is 11. `meta` is the API pagination meta (current_page,
// per_page); without it numbering starts at 1.
export const firstRowNumber = (meta) => {
  const page = Number(meta?.current_page) || 1;
  const perPage = Number(meta?.per_page) || 0;
  return (page - 1) * perPage + 1;
};

export const rowNumber = (index, meta) => firstRowNumber(meta) + index;
