export function getDateFormatted(offsetDays: number = 0): string {
  const today = new Date();

  today.setDate(today.getDate() + offsetDays);

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}