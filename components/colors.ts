export const KIND_COLOR: Record<string, string> = { photo: "#4fb3a9", scan: "#d9573b", journal: "#8c8cf0", upload: "#ffffff" };
export type Pin = { key: string; lat: number; lng: number; kind: string; label: string; item?: import("@/lib/types").Item };
