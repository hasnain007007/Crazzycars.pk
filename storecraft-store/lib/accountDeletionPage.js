/**
 * Copy for the public /account-deletion storefront page.
 * Operational steps only — not a privacy policy or legal terms.
 */
export function getAccountDeletionPage() {
  return {
    title: "Account deletion",
    path: "/account-deletion",
    description:
      "How to delete your CrazzyCars app account in the app, or request deletion by email.",
    intro:
      "You can delete a CrazzyCars customer account from the mobile app, or email us if you cannot use the app. This page explains the steps only.",
    sections: [
      {
        heading: "Delete in the CrazzyCars app",
        paragraphs: [
          "Open the CrazzyCars app while signed in.",
          "Go to Settings, then Delete account.",
          "Type DELETE in all caps and confirm. The app calls the server to close the account and signs you out.",
        ],
        list: [
          "Path in app: Settings → Delete account",
          "You must be signed in with the account you want closed",
          "Past orders may remain on the server for fulfilment and records (see Privacy Policy)",
        ],
      },
      {
        heading: "Request by email or contact form",
        paragraphs: [
          "If you cannot open the app, email us from the address on the account, or use the contact form and include the phone number used for orders.",
          "Subject line suggestion: Account deletion request.",
          "We handle email requests manually — expect a reply confirming next steps. Do not send passwords.",
        ],
        list: [
          "Email: info@crazzycars.pk",
          "Contact form: /contact",
          "WhatsApp: 03284010007 (identify the account; do not share passwords)",
        ],
      },
      {
        heading: "What happens next",
        paragraphs: [
          "In-app deletion runs immediately through the app’s Delete account flow.",
          "Email or contact requests are reviewed by the store team. We confirm the account, then close it using the same server deletion path used by the app when possible.",
        ],
      },
    ],
  };
}
