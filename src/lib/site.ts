/**
 * The one address the majless is reached at. It is also where the Interac
 * e-transfer goes, so it is named twice: the two uses are the same inbox today
 * but they are not the same thing, and only one of them should move if we ever
 * take payment somewhere else.
 */
export const CONTACT_EMAIL = "ottawamajless@gmail.com";
export const ETRANSFER_EMAIL = CONTACT_EMAIL;
