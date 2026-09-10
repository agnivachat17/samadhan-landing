/**
 * Real contact channels for the site, if/when they exist.
 *
 * Deliberately empty by default — the /info/contact-us and /info/support pages
 * render whatever is filled in here and say nothing about a channel that's left
 * blank, rather than shipping a plausible-looking but fake official phone
 * number or email address. Fill these in only once the channel is real and
 * actually staffed/monitored; leave a field blank (not a placeholder string)
 * if it isn't.
 */
export const siteContact: {
  supportEmail: string;
  phone: string;
} = {
  supportEmail: "", // e.g. "support@yourdomain.example"
  phone: "", // e.g. "+91 00000 00000"
};
