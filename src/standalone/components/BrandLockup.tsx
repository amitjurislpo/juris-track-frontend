/** The group mark in its tile, with the group name and the product name (a proper name, not translated) under it. */
export function BrandLockup({ product }: { product: string }) {
  return (
    <span className="brand-lockup">
      <span className="brand-tile"><img src="/brand/jcg-mark.png" alt="" width={34} height={34} /></span>
      <span className="brand-text"><b>Juris Consultants Group</b><small>{product}</small></span>
    </span>
  );
}
