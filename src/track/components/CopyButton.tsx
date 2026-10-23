import { useTrack } from "../TrackContext";
import { Icon } from "./Icon";

/** Copies `value` to the clipboard and says so in a toast. `label` is the button's accessible name (already translated). */
export function CopyButton({ value, label, copiedMessage, isSmall = true, children }: {
  value: string;
  label: string;
  copiedMessage: string;
  isSmall?: boolean;
  children?: React.ReactNode;
}) {
  const { t, toast } = useTrack();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast(copiedMessage);
    } catch {
      toast(t("Could not copy. Select the text and copy it yourself."), "bad");
    }
  };
  return (
    <button type="button" className={children ? `btn${isSmall ? " btn-sm" : ""}` : "icon-btn copy-btn"} aria-label={children ? undefined : label} title={label}
      onClick={(e) => { e.stopPropagation(); void copy(); }} onKeyDown={(e) => e.stopPropagation()}>
      <Icon name="copy" size={children ? 14 : 13} />{children}
    </button>
  );
}
