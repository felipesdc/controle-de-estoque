export default function extractLocaleDate(dateString: string): string {
  return dateString ? new Date(dateString).toLocaleDateString() : '';
}
