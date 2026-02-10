import { Api } from "@mobile/api";

export type LegalGateConfig = {
  termsUrl?: string;
  privacyUrl?: string;
  version?: string;
  required?: boolean;
};

export async function getLegalGate(token: string): Promise<{
  required: boolean;
  accepted: boolean;
  version: string | null;
  config: LegalGateConfig | null;
}> {
  const config = await Api.request<LegalGateConfig>("/legal/config", { token }).catch(() => null);
  const required = Boolean((config as any)?.required);
  const version = typeof (config as any)?.version === "string" ? String((config as any).version) : null;

  if (!required) return { required: false, accepted: true, version, config };

  const status = await Api.request<any>("/legal/status", { token }).catch(() => null);
  const accepted = Boolean(status?.accepted);
  return { required: true, accepted, version, config };
}

