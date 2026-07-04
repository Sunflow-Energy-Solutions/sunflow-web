export const siteConfig = {
  name: "Sunflow Energy Solutions",
  shortName: "Sunflow",
  tagline: "Power Your World, The Smart Way",
  // TODO: client to supply phone number — placeholder disabled until provided
  phone: "Phone number coming soon",
  phoneHref: "",
  email: "info@sunflowenergysolutions.com.au",
  abn: "ABN 27 460 874 669",
  address: "Greater Melbourne & Victoria-wide",
  serviceAreas: [
    "Melbourne CBD",
    "Eastern Suburbs",
    "Bayside & South East",
    "Western Suburbs",
    "Northern Suburbs",
    "Mornington Peninsula",
    "Geelong & Surf Coast",
    "Regional Victoria",
  ],
  social: {
    facebook: "https://facebook.com/sunflowenergy",
    instagram: "https://instagram.com/sunflowenergy",
    tiktok: "https://tiktok.com/@sunflowenergy",
    linkedin: "https://linkedin.com/company/sunflowenergy",
    youtube: "https://youtube.com/@sunflowenergy",
  },
} as const;

type NavLink = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Solar Solutions", href: "/solar" },
  { label: "Battery Storage", href: "/battery" },
  {
    label: "EV Charging",
    href: "/ev-charging",
    children: [
      { label: "Overview", href: "/ev-charging" },
      { label: "Shop Chargers", href: "/ev-charging/shop" },
      { label: "Compare Chargers", href: "/ev-charging/compare" },
    ],
  },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];
