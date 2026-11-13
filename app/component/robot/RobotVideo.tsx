/** YouTube watch / share / embed link → embed URL, or null for any other link. */
function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "m.youtube.com") id = u.searchParams.get("v") ?? (/^\/(embed|shorts)\//.test(u.pathname) ? u.pathname.split("/")[2] : null);
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0` : null;
  } catch {
    return null;
  }
}

/** Video of a machine working: a YouTube embed, or a playable file link (looping, muted autoplay). */
export function RobotVideo({ url, title }: { url: string; title: string }) {
  const embed = youtubeEmbed(url);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black">
      {embed ? (
        <iframe src={embed} title={title} className="aspect-video w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      ) : (
        <video src={url} title={title} className="aspect-video w-full" controls autoPlay muted loop playsInline />
      )}
    </div>
  );
}
