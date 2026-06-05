export function validateEnqueueConfirmation(
  campaignName: string,
  confirmationName: string,
  acknowledgeImmediateSend: boolean
): string | null {
  if (confirmationName !== campaignName) return "Confirmation name does not match the campaign name";
  if (!acknowledgeImmediateSend) return "Immediate-send acknowledgement is required";
  return null;
}
