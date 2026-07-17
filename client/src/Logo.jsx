/**
 * Official TAG logo — the original artwork, same files used by
 * BOM Checker and TAG-MPS (copied from TAG-MPS/brand).
 * `tagline` picks the full logo with "POWER TO PEOPLE"; without it,
 * the plain TAG wordmark is used.
 */
export default function Logo({ className = 'h-12', tagline = true }) {
  return (
    <img
      src={tagline ? '/brand/TAG-logo.png' : '/brand/tag-logo-mark.png'}
      alt="TAG — Power to People"
      className={`w-auto object-contain ${className}`}
      draggable={false}
    />
  );
}
