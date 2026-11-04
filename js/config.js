// Edit this file to tune where the name is printed on the certificate template.
// All positions are fractions of the template image (0–1), so any template size works.
export const CONFIG = {
  eventName: 'Internal Smart India Hackathon 2026',
  template: 'assets/certificate-template.jpg',
  name: {
    xPct: 0.5,          // horizontal centre
    yPct: 0.488,        // text baseline, measured from the top
    maxWidthPct: 0.66,  // long names shrink to fit this width
    sizePct: 0.072,     // font size as a fraction of template height
    color: '#1b1b1b',
  },
  // Shown on the website if a student cannot find their record.
  helpText: 'Name or SAP ID not matching? Write your name exactly as you registered, or contact the organising team.',
};
