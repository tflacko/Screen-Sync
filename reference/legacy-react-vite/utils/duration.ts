// Duration calculation utilities

export interface CampaignDuration {
  days: number;
  hours: number;
  totalSeconds: number;
}

export const calculateCampaignDuration = (
  slotDurationSeconds: number,
  numberOfSlots: number
): CampaignDuration => {
  const totalSeconds = slotDurationSeconds * numberOfSlots;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  return { days, hours, totalSeconds };
};
