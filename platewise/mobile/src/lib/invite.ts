// "Invite friends and family": shares a link to the Android app the owner put on their Google Drive.
// Set the link in mobile/.env as EXPO_PUBLIC_INVITE_URL (a Drive link shared as "Anyone with the link").

export const INVITE_URL = (process.env.EXPO_PUBLIC_INVITE_URL ?? '').trim();

/** The message sent with the link: says plainly that the download comes from Google Drive, not the Play Store. */
export function inviteMessage(from: string, url = INVITE_URL): string {
  return [
    `${from ? `${from} invited you to try` : 'Try'} PlateWise: snap your food and see your day, with Ghanaian dishes built in.`,
    '',
    `Download the Android app from Google Drive (it isn't on the Play Store yet):`,
    url,
    '',
    'On the Drive page, tap Download, then open the file. If your phone asks, allow installing apps from Drive or your browser.',
  ].join('\n');
}
