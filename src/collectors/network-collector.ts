import { ObservationType, ObservationSource, Confidence, type CreateObservationInput } from "../core";
import { getPageInfo } from "./page-info";

export interface NetworkRequestPayload {
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly duration: number;
}

export function collectNetworkRequest(request: NetworkRequestPayload): CreateObservationInput {
  return {
    type: ObservationType.Network,
    source: ObservationSource.NetworkSpy,
    confidence: Confidence.Observed,
    page: getPageInfo(),
    trigger: request.method,
    payload: request,
  };
}
