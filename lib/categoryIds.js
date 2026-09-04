/* A category's first page is its base id ("cat-beauty"); every page the admin
   adds after it is "<base id>-<n>" ("cat-beauty-2"). One page holds four clips,
   so a category with more work than that spills onto continuation pages. */

export function baseCategoryId(id) {
  const m = /^(.*)-(\d+)$/.exec(id);
  return m ? m[1] : id;
}

export function pageNumber(id) {
  const m = /^(.*)-(\d+)$/.exec(id);
  return m ? Number(m[2]) : 1;
}

/* "Beauty" for a first page, "Beauty 02" for the ones after it. */
export function pageLabel(cat) {
  const n = pageNumber(cat.id);
  return n > 1 ? `${cat.navLabel} ${String(n).padStart(2, '0')}` : cat.navLabel;
}
