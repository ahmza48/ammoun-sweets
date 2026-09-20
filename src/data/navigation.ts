export type NavItem = { label: string; href: string };

export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Our Story", href: "/our-story" },
  { label: "Menu", href: "/menu" },
  { label: "Gallery", href: "/gallery" },
  { label: "Catering & Events", href: "/catering" },
  { label: "Visit Us", href: "/visit" },
];

export const footerNav = {
  explore: [
    { label: "Home", href: "/" },
    { label: "Our Story", href: "/our-story" },
    { label: "Menu", href: "/menu" },
    { label: "Gallery", href: "/gallery" },
  ] satisfies NavItem[],
  more: [
    { label: "Catering & Events", href: "/catering" },
    { label: "Visit Us", href: "/visit" },
  ] satisfies NavItem[],
};
