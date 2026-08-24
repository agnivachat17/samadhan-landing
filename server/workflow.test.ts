import { describe, expect, it } from "vitest";
import { workflowRouter } from "./routers/workflow";

describe("workflow API contracts", () => {
  it("rejects a challenge submission without a meaningful description", async () => {
    const caller = workflowRouter.createCaller({} as never);
    await expect(caller.submitChallenge({
      citizenName: "Asha Kumari",
      title: "Water concern in village",
      description: "too short",
      domain: "Water",
      district: "Ranchi",
    })).rejects.toThrow();
  });

  it("rejects industry support without a valid contact email", async () => {
    const caller = workflowRouter.createCaller({} as never);
    await expect(caller.expressInterest({
      projectId: 1,
      contactName: "Partner Lead",
      contactEmail: "invalid-email",
      supportType: "Funding",
    })).rejects.toThrow();
  });
});
