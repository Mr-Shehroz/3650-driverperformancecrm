import { ImageResponse } from "next/og";
import { DrsIcon } from "@/lib/pwa/icon";

const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const icon = ICONS[name];
  if (!icon) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    <DrsIcon size={icon.size} maskable={icon.maskable} />,
    {
      width: icon.size,
      height: icon.size,
    },
  );
}
