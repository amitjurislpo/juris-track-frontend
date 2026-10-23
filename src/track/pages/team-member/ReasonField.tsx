import { FormField } from "@/track/components/FormField";
import { MAXIMUM_REASON_LENGTH, MINIMUM_REASON_LENGTH } from "@/track/lib/time-correction";
import { useTrack } from "@/track/TrackContext";

/** The mandatory reason of a correction (5 to 500 characters), with a character counter; it goes into the audit log. */
export function ReasonField({ value, error, placeholder, onChange }: { value: string; error?: string; placeholder: string; onChange: (reason: string) => void }) {
  const { t } = useTrack();
  return (
    <FormField label={t("Reason")} error={error}
      hint={t("{count} of {maximum} characters, at least {minimum}", { count: value.trim().length, maximum: MAXIMUM_REASON_LENGTH, minimum: MINIMUM_REASON_LENGTH })}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={MAXIMUM_REASON_LENGTH} rows={3} required placeholder={placeholder} />
    </FormField>
  );
}
