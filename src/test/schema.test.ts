import { describe, it, expect } from "vitest";
import { z } from "zod";

// Recreate the validation schemas used in the routers for testing
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be 20 characters or less")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const createBetSchema = z.object({
  groupId: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  options: z
    .array(
      z.object({
        name: z.string().min(1, "Option name is required").max(100),
        americanOdds: z.number(),
      })
    )
    .min(2, "At least 2 options required")
    .max(10, "Maximum 10 options allowed"),
});

const placeWagerSchema = z.object({
  optionId: z.string().uuid(),
  amount: z.number().positive("Amount must be positive").max(1000000),
});

describe("Schema Validation", () => {
  describe("Register Schema", () => {
    it("validates correct registration data", () => {
      const validData = {
        email: "test@example.com",
        username: "testuser123",
        password: "password123",
      };
      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it("rejects invalid email", () => {
      const invalidData = {
        email: "not-an-email",
        username: "testuser",
        password: "password123",
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it("rejects short username", () => {
      const invalidData = {
        email: "test@example.com",
        username: "ab",
        password: "password123",
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it("rejects username with special characters", () => {
      const invalidData = {
        email: "test@example.com",
        username: "user@name!",
        password: "password123",
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it("rejects short password", () => {
      const invalidData = {
        email: "test@example.com",
        username: "testuser",
        password: "12345",
      };
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it("allows underscores in username", () => {
      const validData = {
        email: "test@example.com",
        username: "test_user_123",
        password: "password123",
      };
      expect(() => registerSchema.parse(validData)).not.toThrow();
    });
  });

  describe("Create Bet Schema", () => {
    const validBet = {
      groupId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Super Bowl Winner",
      options: [
        { name: "Chiefs", americanOdds: -150 },
        { name: "Eagles", americanOdds: 130 },
      ],
    };

    it("validates correct bet data", () => {
      expect(() => createBetSchema.parse(validBet)).not.toThrow();
    });

    it("rejects bet with less than 2 options", () => {
      const invalidBet = {
        ...validBet,
        options: [{ name: "Only Option", americanOdds: 100 }],
      };
      expect(() => createBetSchema.parse(invalidBet)).toThrow();
    });

    it("rejects bet with more than 10 options", () => {
      const invalidBet = {
        ...validBet,
        options: Array(11)
          .fill(null)
          .map((_, i) => ({ name: `Option ${i}`, americanOdds: 100 })),
      };
      expect(() => createBetSchema.parse(invalidBet)).toThrow();
    });

    it("rejects bet with empty title", () => {
      const invalidBet = {
        ...validBet,
        title: "",
      };
      expect(() => createBetSchema.parse(invalidBet)).toThrow();
    });

    it("rejects bet with invalid groupId", () => {
      const invalidBet = {
        ...validBet,
        groupId: "not-a-uuid",
      };
      expect(() => createBetSchema.parse(invalidBet)).toThrow();
    });

    it("allows optional description", () => {
      const betWithDesc = {
        ...validBet,
        description: "This is a description",
      };
      expect(() => createBetSchema.parse(betWithDesc)).not.toThrow();
    });
  });

  describe("Place Wager Schema", () => {
    it("validates correct wager data", () => {
      const validWager = {
        optionId: "550e8400-e29b-41d4-a716-446655440000",
        amount: 100,
      };
      expect(() => placeWagerSchema.parse(validWager)).not.toThrow();
    });

    it("rejects negative amount", () => {
      const invalidWager = {
        optionId: "550e8400-e29b-41d4-a716-446655440000",
        amount: -50,
      };
      expect(() => placeWagerSchema.parse(invalidWager)).toThrow();
    });

    it("rejects zero amount", () => {
      const invalidWager = {
        optionId: "550e8400-e29b-41d4-a716-446655440000",
        amount: 0,
      };
      expect(() => placeWagerSchema.parse(invalidWager)).toThrow();
    });

    it("rejects amount over limit", () => {
      const invalidWager = {
        optionId: "550e8400-e29b-41d4-a716-446655440000",
        amount: 2000000,
      };
      expect(() => placeWagerSchema.parse(invalidWager)).toThrow();
    });

    it("rejects invalid optionId", () => {
      const invalidWager = {
        optionId: "not-a-uuid",
        amount: 100,
      };
      expect(() => placeWagerSchema.parse(invalidWager)).toThrow();
    });
  });
});
