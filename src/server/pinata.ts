import "server-only";
import { env } from "./env";
import { HttpError } from "./http";

const PINATA = "https://api.pinata.cloud/pinning";

async function pinata<T>(path: string, body: BodyInit, json = false): Promise<T> {
  const res = await fetch(`${PINATA}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.pinataJwt()}`, ...(json ? { "Content-Type": "application/json" } : {}) },
    body,
  });
  if (!res.ok) throw new HttpError(502, `IPFS upload failed (${res.status})`);
  return (await res.json()) as T;
}

export function ipfsUrl(cid: string) {
  return `${env.ipfsGateway().replace(/\/$/, "")}/ipfs/${cid}`;
}

export async function pinFile(file: File, name: string): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name || name);
  form.append("pinataMetadata", JSON.stringify({ name }));
  const { IpfsHash } = await pinata<{ IpfsHash: string }>("/pinFileToIPFS", form);
  return IpfsHash;
}

export async function pinJson(content: unknown, name: string): Promise<string> {
  const body = JSON.stringify({ pinataContent: content, pinataMetadata: { name } });
  const { IpfsHash } = await pinata<{ IpfsHash: string }>("/pinJSONToIPFS", body, true);
  return IpfsHash;
}
