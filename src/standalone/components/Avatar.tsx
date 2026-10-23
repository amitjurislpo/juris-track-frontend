const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 2).join("").toUpperCase();

/** The round person marker with the person's initials (the default purple circle). */
export function Avatar({ name, isLarge }: { name: string; isLarge?: boolean }) {
  return (
    <span className={`avatar${isLarge ? " lg" : ""}`} title={name}>
      {initials(name)}
    </span>
  );
}
