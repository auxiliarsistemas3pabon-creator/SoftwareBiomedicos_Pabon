import { describe, expect, it } from "vitest";
import { fullNameOf } from "./users";
import type { Usuario } from "@/types/authentication/auth";

function user(overrides: Partial<Usuario>): Usuario {
  return {
    id: 1,
    username: "user",
    email: "u@test.com",
    first_name: "Ana",
    last_name: "Pérez",
    role: "coordinador",
    is_active: true,
    ...overrides,
  };
}

describe("fullNameOf", () => {
  it("joins first and last name", () => {
    expect(fullNameOf(user({ first_name: "Ana", last_name: "Pérez" }))).toBe(
      "Ana Pérez",
    );
  });

  it("displays ñ correctly when the name arrives with a misdecoded character", () => {
    expect(
      fullNameOf(user({ first_name: "Juan Carlos", last_name: "MuÃ±oz Pabon" })),
    ).toBe("Juan Carlos Muñoz Pabon");
  });

  it("does not split the role label across first/last name", () => {
    expect(
      fullNameOf(
        user({
          username: "Coordinador",
          first_name: "Coordi",
          last_name: "Nador",
          role: "coordinador",
        }),
      ),
    ).toBe("Coordinador");
    expect(
      fullNameOf(
        user({
          username: "Ingeniero",
          first_name: "Inge",
          last_name: "Niero",
          role: "ingeniero",
        }),
      ),
    ).toBe("Ingeniero biomédico");
  });

  it("falls back to username when names are empty", () => {
    expect(
      fullNameOf(user({ first_name: "", last_name: "", username: "Coordinador" })),
    ).toBe("Coordinador");
  });
});
