export const firstRowNumber = (meta) => {
  const page = Number(meta?.current_page) || 1;
  const perPage = Number(meta?.per_page) || 0;
  return (page - 1) * perPage + 1;
};

export const rowNumber = (index, meta) => firstRowNumber(meta) + index;
