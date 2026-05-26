import { POST } from "./route";
import { authenticateRequest, parseJSON } from "@/lib/error-handler";
import { getUserProfile } from "@/lib/firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

jest.mock("@/lib/error-handler", () => ({
  authenticateRequest: jest.fn(),
  withErrorHandler: (handler) => handler,
  parseJSON: jest.fn(),
}));

jest.mock("@/lib/firebase-admin", () => ({
  initFirebaseAdmin: jest.fn(),
  getUserProfile: jest.fn(),
}));

jest.mock("@/lib/gamification-service", () => ({
  awardXp: jest.fn(),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(),
  FieldValue: {
    serverTimestamp: jest.fn(() => "server-timestamp"),
  },
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body, init = {}) => ({
      status: init.status ?? 200,
      json: async () => body,
    }),
  },
}));

describe("attendance record route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("writes attendance to Firestore with canonical doc id + instituteId using transaction", async () => {
    authenticateRequest.mockResolvedValue({ uid: "user-123" });
    parseJSON.mockResolvedValue({
      userId: "user-123",
      studentName: "Client Name",
      email: "client@example.com",
      confidenceScore: 75,
      date: "2026-05-25",
    });

    getUserProfile.mockResolvedValue({
      fullName: "Server Name",
      email: "server@example.com",
      instituteId: "inst-999",
    });

    const docRef = {};
    const collectionRef = { doc: jest.fn(() => docRef) };
    const transactionSet = jest.fn();
    const transactionGet = jest.fn().mockResolvedValue({ exists: false });

    getFirestore.mockReturnValue({
      runTransaction: jest.fn(async (callback) => {
        return callback({ get: transactionGet, set: transactionSet });
      }),
      collection: jest.fn(() => collectionRef),
    });

    const response = await POST({
      headers: new Headers([["authorization", "Bearer test"]]),
      cookies: { get: jest.fn() },
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { alreadyRecorded: false },
    });

    expect(collectionRef.doc).toHaveBeenCalledWith("user-123_2026-05-25");
    expect(transactionGet).toHaveBeenCalledWith(docRef);
    expect(transactionSet).toHaveBeenCalledWith(
      docRef,
      expect.objectContaining({
        userId: "user-123",
        studentName: "Server Name",
        email: "server@example.com",
        instituteId: "inst-999",
        date: "2026-05-25",
        status: "present",
        confidenceScore: 0.75,
        offlineSynced: false,
        timestamp: FieldValue.serverTimestamp.mock.results[0].value,
      }),
      { merge: true },
    );
  });

  test("prevents duplicate check-in if document already exists", async () => {
    authenticateRequest.mockResolvedValue({ uid: "user-123" });
    parseJSON.mockResolvedValue({
      userId: "user-123",
      studentName: "Client Name",
      email: "client@example.com",
      confidenceScore: 80,
      date: "2026-05-25",
    });

    getUserProfile.mockResolvedValue({
      fullName: "Server Name",
      email: "server@example.com",
      instituteId: "inst-999",
    });

    const docRef = {};
    const collectionRef = { doc: jest.fn(() => docRef) };
    const transactionSet = jest.fn();
    const transactionGet = jest.fn().mockResolvedValue({ exists: true });

    getFirestore.mockReturnValue({
      runTransaction: jest.fn(async (callback) => {
        return callback({ get: transactionGet, set: transactionSet });
      }),
      collection: jest.fn(() => collectionRef),
    });

    const response = await POST({
      headers: new Headers([["authorization", "Bearer test"]]),
      cookies: { get: jest.fn() },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { alreadyRecorded: true },
    });

    expect(collectionRef.doc).toHaveBeenCalledWith("user-123_2026-05-25");
    expect(transactionGet).toHaveBeenCalledWith(docRef);
    expect(transactionSet).not.toHaveBeenCalled();
  });
});
