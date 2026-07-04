export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  content: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "solar-rebates-victoria-2026-guide",
    title: "Victoria Solar Rebates in 2026: A Complete Guide",
    excerpt:
      "Everything Victorian homeowners need to know about Solar Homes rebates, interest-free loans and federal STCs before installing solar in 2026.",
    category: "Solar",
    date: "2026-02-12",
    readTime: "6 min read",
    author: "Sunflow Energy Team",
    content: [
      "Victoria continues to offer some of the most generous solar incentives in Australia, combining state rebates with federal Small-scale Technology Certificates (STCs) to significantly reduce upfront costs for homeowners.",
      "The Solar Homes Program offers eligible households a rebate on solar panel systems, plus access to an interest-free loan to cover the remaining cost. Eligibility depends on combined household income, property value and whether the property already has solar installed.",
      "On top of state rebates, every accredited solar installation earns STCs — tradeable certificates that installers typically apply as an upfront discount on your quote, rather than something you need to claim yourself.",
      "Our consultants check your eligibility for every applicable rebate and loan during your free consultation, and handle all the paperwork so you don't have to navigate the process alone.",
      "If you're considering solar in 2026, the earlier you get a quote, the sooner you can start saving — rebate programs are subject to annual caps and can change with government budgets.",
    ],
  },
  {
    slug: "battery-storage-worth-it-melbourne",
    title: "Is Home Battery Storage Worth It for Melbourne Homes?",
    excerpt:
      "We break down the real costs and savings of adding a home battery to your existing or new solar system in Melbourne.",
    category: "Battery",
    date: "2026-01-28",
    readTime: "5 min read",
    author: "Sunflow Energy Team",
    content: [
      "With feed-in tariffs continuing to decline across Victoria, many solar households are asking whether it's time to add a battery to store excess generation instead of exporting it to the grid for a few cents per kWh.",
      "A correctly sized battery lets you use your own solar energy in the evening — when household demand peaks — instead of buying it back from the grid at retail rates, which can be 5-10x higher than what you'd earn exporting it.",
      "Beyond bill savings, batteries provide backup power during outages, which is increasingly valuable given Victoria's storm-related blackout risk in outer suburban and regional areas.",
      "Payback periods vary based on your usage patterns, existing solar size and electricity plan, but most well-sized systems pay for themselves within 6-9 years while providing energy security for 10+ years.",
      "We recommend a free consultation to model your specific numbers — battery economics are very household-specific, and we'll give you an honest answer, even if that means recommending you wait.",
    ],
  },
  {
    slug: "ev-charger-installation-requirements",
    title: "What You Need to Know Before Installing a Home EV Charger",
    excerpt:
      "From switchboard capacity to council approvals — here's what actually determines your EV charger installation cost and timeline.",
    category: "EV Charging",
    date: "2026-01-14",
    readTime: "4 min read",
    author: "Sunflow Energy Team",
    content: [
      "Installing a home EV charger is usually straightforward, but a few site-specific factors determine cost, timeline and the right charger for your property.",
      "First, your switchboard needs enough spare capacity for the charger's load. Older homes with outdated boards sometimes require an upgrade before a charger can be safely installed.",
      "Second, single-phase vs three-phase power availability determines your maximum charging speed — most homes can install a 7kW single-phase charger, while three-phase properties can go up to 22kW.",
      "Third, if you're on solar, a solar-smart charger can automatically prioritise charging your car from excess solar generation instead of the grid, maximising your savings.",
      "Our licensed electricians assess all of this during your free quote, so there are no surprises — just a clear, itemised proposal before any work begins.",
    ],
  },
  {
    slug: "commercial-solar-payback-periods",
    title: "Commercial Solar: What Payback Period Should You Expect?",
    excerpt:
      "A look at typical ROI timelines for Victorian businesses investing in commercial-scale rooftop solar.",
    category: "Commercial",
    date: "2025-12-19",
    readTime: "7 min read",
    author: "Sunflow Energy Team",
    content: [
      "Commercial solar remains one of the highest-ROI investments available to Victorian businesses, with most systems paying for themselves in 3-5 years and continuing to generate savings for 20-25 years after that.",
      "Businesses with high daytime energy use — such as retail, manufacturing, warehousing and logistics — see the fastest payback, since they consume the majority of their solar generation directly rather than exporting it.",
      "Demand charges, which are based on your peak electricity draw, can also be reduced through correctly sized solar and battery systems, often delivering savings beyond simple per-kWh calculations.",
      "Grants and incentive programs for commercial and not-for-profit organisations can further improve payback periods — our team stays across current programs and includes eligibility checks in every commercial proposal.",
      "If your business is considering solar, request a free site assessment — our engineers will model your actual usage data to give you an accurate, realistic payback estimate.",
    ],
  },
];
