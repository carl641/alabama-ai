// Business facts used across the site.
//
// Leave a value empty ("") until it is verified. Empty values render as
// highlighted placeholders in preview builds, and the production build
// refuses to publish any page that still depends on one.

module.exports = {
  // Trading name shown in the header, titles and structured data.
  brand: "Alabama AI",
  legalName: "",

  // Canonical origin, no trailing slash. Used for canonicals, OG tags and the sitemap.
  siteUrl: "https://www.example.com",

  // Human contact methods (the Contact page must show at least one).
  email: "",
  phone: "",

  // The real business base. Do not enter an address you do not operate from.
  baseCity: "",
  // "remote", "on-site" or "hybrid": how work is actually delivered.
  serviceModel: "",

  // Where the contact form POSTs (Formspree, Jotform, your own endpoint...).
  // It must validate server-side and route to a named person.
  formEndpoint: "",

  // Scheduling page to embed on /book/ (Cal.com, Calendly, HubSpot meetings...).
  bookingUrl: "",

  // Robots decisions (see Sources O1 in the site plan).
  robots: {
    allowOAISearchBot: true, // ChatGPT search visibility for public pages
    allowGPTBot: false, // model-training crawler; decide deliberately
  },
};
