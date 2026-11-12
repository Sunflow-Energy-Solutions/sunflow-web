export type Stage =
  | "new" | "contacted" | "assessment" | "quoted" | "negotiating" | "won" | "installed" | "lost";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "new", label: "New lead", hint: "Enquiry received" },
  { id: "contacted", label: "Contacted", hint: "We have spoken" },
  { id: "assessment", label: "Site visit", hint: "Assessment booked / done" },
  { id: "quoted", label: "Quote sent", hint: "Waiting on customer" },
  { id: "negotiating", label: "Negotiating", hint: "Close to a decision" },
  { id: "won", label: "Won", hint: "Deal accepted - install to book" },
  { id: "installed", label: "Installed", hint: "System is live" },
  { id: "lost", label: "Lost", hint: "No deal (for now)" },
];

export const stageLabel = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  suburb: string;
  postcode: string;
  /** Australian state or territory (VIC, NSW...). Older customers have none, which is treated as VIC. */
  state?: string;
  kind: "Residential" | "Commercial";
  source: string;
  notes: string;
  /** Staff member (Staff.id) looking after this customer */
  assignedTo?: string;
  /** Customer has agreed to receive marketing (Spam Act). Specials only go to these. */
  marketingConsent: boolean;
  unsubscribed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SystemChoice = {
  solarKw: number | null;
  panelBrand: string;
  batteryKwh: number | null;
  batteryBrand: string;
  inverterBrand: string;
  evCharger: string;
};

export type SiteDetails = {
  distributor: string; // network the home connects to (AusNet, CitiPower...)
  nmi: string;
  meterNumber: string;
  retailer: string;
  phase: "" | "Single" | "Three";
  roofType: string;
  existingSystem: string;
  switchboardNotes: string;
};

export const emptySite = (): SiteDetails => ({
  distributor: "", nmi: "", meterNumber: "", retailer: "", phase: "", roofType: "", existingSystem: "", switchboardNotes: "",
});

/** What was actually installed: kept for warranty claims and compliance. */
export type InstallRecord = {
  panelModel: string;
  panelCount: number | null;
  panelSerials: string;
  inverterModel: string;
  inverterSerial: string;
  batteryModel: string;
  batterySerial: string;
  evChargerSerial: string;
  installer: string; // licensed electrician
  cesNumber: string;
  gridApprovalRef: string;
  warrantyYears: number | null;
};

export const emptyInstall = (): InstallRecord => ({
  panelModel: "", panelCount: null, panelSerials: "", inverterModel: "", inverterSerial: "", batteryModel: "",
  batterySerial: "", evChargerSerial: "", installer: "", cesNumber: "", gridApprovalRef: "", warrantyYears: null,
});

export type CheckItem = {
  id: string;
  /** Template key, so system changes can add new items without duplicating ticked ones. Empty for custom items. */
  key: string;
  group: string;
  label: string;
  required: boolean;
  done: boolean;
  doneAt: string | null;
  doneBy: string;
};

export type XeroInvoice = { invoiceId: string; amount: number; createdAt: string; url: string };

export type Quote = {
  id: string;
  number: string;
  date: string;
  amount: number | null;
  summary: string;
  status: "sent" | "accepted" | "declined" | "expired";
};

export type Deal = {
  id: string;
  customerId: string;
  title: string;
  stage: Stage;
  system: SystemChoice;
  quotes: Quote[];
  /** Agreed contract price once won, otherwise latest quote */
  value: number | null;
  installDate: string | null;
  /** How many days the install takes (default 1). Shown as a block on the calendar. */
  installDays?: number | null;
  installedOn: string | null;
  lostReason: string;
  /** Link to this job's project in Pylon, pasted in once the design has been started */
  pylonUrl?: string;
  site?: SiteDetails;
  install?: InstallRecord;
  checklist?: CheckItem[];
  /** Template keys the team removed from this job, so a system change doesn't add them back */
  checklistSkipped?: string[];
  /** Set when the customer e-signed a Pylon proposal: which design was signed, and when */
  pylon?: { projectId: string; designId: string; signedAt: string };
  xero?: XeroInvoice[];
  /** When a thank-you / review request went to the customer, and how */
  thanks?: { sentAt: string; by: string; channels: ("email" | "sms")[] } | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskKind = "call" | "email" | "visit" | "quote" | "install" | "checkup" | "upgrade" | "other";

export const TASK_KINDS: { id: TaskKind; label: string }[] = [
  { id: "call", label: "Call" },
  { id: "email", label: "Email" },
  { id: "visit", label: "Site visit" },
  { id: "quote", label: "Send quote" },
  { id: "install", label: "Installation" },
  { id: "checkup", label: "Check-up" },
  { id: "upgrade", label: "Upgrade check" },
  { id: "other", label: "Other" },
];

export type Task = {
  id: string;
  customerId: string;
  dealId: string | null;
  kind: TaskKind;
  due: string; // yyyy-mm-dd
  /** Optional time of day, HH:MM (24h), for appointments such as site visits */
  time?: string;
  note: string;
  done: boolean;
  doneAt: string | null;
  /** Created by an automation rather than typed in */
  auto: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  customerId: string;
  dealId: string | null;
  kind: "note" | "call" | "email" | "visit" | "system";
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  subject: string;
  body: string;
  audience: string;
  recipients: number;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  createdAt: string;
  updatedAt: string;
};

export const FILE_CATEGORIES = [
  "Site photo", "Install photo", "Electricity bill", "Quote / contract", "Approval", "Certificate", "Warranty", "Other",
];

export type FileRec = {
  id: string;
  customerId: string;
  dealId: string | null;
  /** Checklist item (CheckItem.id) this file is proof for, e.g. the certificate for "CES lodged" */
  checkId?: string | null;
  name: string;
  /** Path inside the private Supabase storage bucket */
  path: string;
  mime: string;
  size: number;
  category: string;
  by: string;
  createdAt: string;
  updatedAt: string;
};

/** Business-wide settings: review links and the thank-you message wording. One record, edited by admins. */
export type AppSettings = {
  id: string;
  googleReviewUrl: string;
  facebookReviewUrl: string;
  otherReviewLabel: string;
  otherReviewUrl: string;
  thankYouSubject: string;
  thankYouBody: string;
  thankYouSms: string;
  createdAt: string;
  updatedAt: string;
};

export const SETTINGS_ID = "app-settings";

export const defaultSettings = (): AppSettings => ({
  id: SETTINGS_ID,
  googleReviewUrl: "",
  facebookReviewUrl: "",
  otherReviewLabel: "",
  otherReviewUrl: "",
  thankYouSubject: "Thank you from Sunflow, {{firstName}}!",
  thankYouBody:
    "Hi {{firstName}},\n\nThank you for choosing Sunflow Energy Solutions for your {{system}}. We hope you are loving it!\n\nIf you are happy with our work, a short review would mean a lot to our small team and helps other households find us. It takes about a minute.\n\nIf anything is not right, just reply to this email or call us on (03) 9088 0322 and we will sort it out.\n\nThanks again,\nThe Sunflow team",
  thankYouSms:
    "Hi {{firstName}}, thanks for choosing Sunflow Energy Solutions! If you are happy with your {{system}}, a quick review would mean a lot: {{reviewLink}} Any issues, call us on (03) 9088 0322.",
  createdAt: "",
  updatedAt: "",
});

export type Kind = "customer" | "deal" | "task" | "note" | "campaign" | "staff" | "file" | "setting";

export type Db = {
  customers: Customer[];
  deals: Deal[];
  tasks: Task[];
  notes: Note[];
  campaigns: Campaign[];
  staff: Staff[];
  files: FileRec[];
  settings: AppSettings[];
};

export const emptyDb = (): Db => ({ customers: [], deals: [], tasks: [], notes: [], campaigns: [], staff: [], files: [], settings: [] });

export const emptySystem = (): SystemChoice => ({
  solarKw: null, panelBrand: "", batteryKwh: null, batteryBrand: "", inverterBrand: "", evCharger: "",
});

export const AU_STATES = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

export const SOURCES = [
  "Website quote form", "Phone call", "Referral", "Facebook / Instagram", "Google",
  "Door knock / event", "Repeat customer", "Other",
];

