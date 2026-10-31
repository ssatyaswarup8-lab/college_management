export function preserveCurrentDecision(request) {
  if (!request.decision) return;
  request.decisionHistory.push(request.decision.toObject ? request.decision.toObject() : { ...request.decision });
}
