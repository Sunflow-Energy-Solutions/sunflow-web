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
    slug: "single-phase-vs-three-phase-power-explained",
    title: "Single-Phase vs Three-Phase Power: What It Means for Solar, Battery and EV Charging",
    excerpt:
      "Your property's power supply quietly determines how big your solar, battery and EV charging system can go. Here's how to check which one you have.",
    category: "Guides",
    date: "2026-06-18",
    readTime: "5 min read",
    author: "Sunflow Energy Team",
    content: [
      "Most Victorian homes are wired for either single-phase or three-phase power, and the difference has a bigger impact on your clean energy options than most homeowners realise.",
      "Single-phase supply is the standard for smaller and older homes. It comfortably supports a solar system, a 7kW EV charger, and a home battery — but there's a ceiling on how much power you can draw or export at once.",
      "Three-phase supply splits the load across three separate circuits, which is common in larger homes, newer builds, and properties with ducted air conditioning or a pool. It raises that ceiling significantly.",
      "For batteries specifically, three-phase properties can support larger systems — stacking multiple modules well beyond what a single-phase connection allows — because the extra capacity is there to charge and discharge without tripping limits.",
      "For EV charging, three-phase unlocks 22kW charging speeds instead of being capped around 7kW on single-phase, cutting a typical overnight charge time significantly.",
      "You can usually tell which supply you have by checking your switchboard for three incoming red service fuses instead of one, or by checking a recent electricity bill. If you're unsure, our electricians confirm it as a standard part of every site assessment.",
      "If you're planning a larger battery or a fast home EV charger, it's worth finding out early — in some cases, upgrading from single to three-phase is straightforward and opens up meaningfully more headroom for your system.",
    ],
  },
  {
    slug: "victorian-feed-in-tariffs-2026",
    title: "Victorian Feed-in Tariffs in 2026: Why Exporting Solar Is Worth Less",
    excerpt:
      "Feed-in tariffs have been falling for years while retail electricity prices keep climbing. Here's what that gap means for how you should be using your solar.",
    category: "Solar",
    date: "2026-05-07",
    readTime: "5 min read",
    author: "Sunflow Energy Team",
    content: [
      "If you installed solar a few years ago, you may remember feed-in tariffs being high enough that exporting excess power back to the grid felt like a genuine income stream. That gap has narrowed sharply.",
      "Minimum feed-in tariffs set by the Essential Services Commission have trended downward as more rooftop solar comes online across Victoria, while retail electricity prices have continued to climb over the same period.",
      "The practical effect is simple: a kilowatt-hour of solar you export to the grid is now worth a fraction of what the same kilowatt-hour would save you if you used it yourself, or a battery stored it for you to use after sunset.",
      "This is the main reason battery economics have improved even as panel and inverter prices have come down — the value isn't just backup power, it's capturing energy that would otherwise be exported for very little.",
      "Some retailers also now offer time-varying feed-in tariffs, paying more for exports during evening peak demand windows. Pairing this with a battery that discharges strategically, rather than exporting everything as it's generated, can meaningfully change your bill.",
      "We review your actual export and usage data during a free consultation and model whether your household would benefit more from a bigger solar system, a battery, or adjusting your tariff plan — with honest numbers either way.",
    ],
  },
  {
    slug: "choosing-a-solar-battery-installer-victoria",
    title: "How to Choose a Solar and Battery Installer in Victoria: 7 Questions to Ask",
    excerpt:
      "Not all installers are equal. Here are the questions worth asking before you sign a quote, and the red flags that should make you pause.",
    category: "Guides",
    date: "2026-03-25",
    readTime: "6 min read",
    author: "Sunflow Energy Team",
    content: [
      "Solar and battery installation is a competitive industry, and unfortunately that means quality varies enormously between providers. A few good questions upfront can save you years of headaches.",
      "Ask whether the installer and the business are Clean Energy Council (CEC) accredited. This isn't optional — CEC accreditation is required for most Victorian and federal rebates, and it's a baseline indicator of proper training.",
      "Ask who will actually be on the roof. Some larger companies subcontract installation crews they've never met. A business that uses its own licensed, in-house electricians has more accountability for the quality of the work.",
      "Ask for the manufacturer warranty terms in writing — not just the headline number of years, but what's covered, whether it includes labour, and whether the installer is an authorised dealer for that brand.",
      "Ask what happens if something goes wrong after switch-on. Who do you call, how quickly do they respond, and is that support local or outsourced overseas?",
      "Be cautious of quotes that arrive within minutes of a cold call, high-pressure 'today only' discounts, and prices that seem far below every other quote you've received — undersized systems and corner-cut installations are common ways installers hit unrealistically low numbers.",
      "Finally, ask for an itemised quote showing panel brand and model, inverter brand and model, battery specifics if included, and all rebates applied — not just a single bottom-line figure. A transparent installer will have no problem providing this.",
      "We're always happy to have our quotes compared line-by-line against a competitor's — it's usually the fastest way to see the difference between a properly specified system and a stripped-down one.",
    ],
  },
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
