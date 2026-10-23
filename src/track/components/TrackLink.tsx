import { useTrack, type TrackLinkProps } from "@/track/TrackContext";

/** A link to a path of the JurisTrack routes, drawn by the host's router (so the pages never import a router). */
export function TrackLink(props: TrackLinkProps) {
  const { Link } = useTrack();
  return <Link {...props} />;
}
