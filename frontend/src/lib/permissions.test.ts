import { describe, expect, it } from "vitest";
import { can, canAssignRole, panelHome } from "./permissions";

describe("can", () => {
  it("returns false when role is undefined", () => {
    expect(can(undefined, "equipment", "view")).toBe(false);
  });

  it("superadmin can do everything listed for every resource", () => {
    expect(can("superadmin", "users", "delete")).toBe(true);
    expect(can("superadmin", "failures", "create")).toBe(true);
  });

  it("tecnico cannot delete equipment (no delete listed for that resource)", () => {
    expect(can("tecnico", "equipment", "delete")).toBe(false);
  });

  it("tecnico can view equipment", () => {
    expect(can("tecnico", "equipment", "view")).toBe(true);
  });

  it("tecnico can create failure reports but not resolve them", () => {
    expect(can("tecnico", "failures", "create")).toBe(true);
    expect(can("tecnico", "failures", "edit")).toBe(false);
    expect(can("tecnico", "failures", "delete")).toBe(false);
  });

  it("tecnico can view and create scheduling requests", () => {
    expect(can("tecnico", "scheduling", "view")).toBe(true);
    expect(can("tecnico", "scheduling", "create")).toBe(true);
    expect(can("tecnico", "scheduling", "edit")).toBe(false);
  });

  it("usuario can create solicitudes but not failures", () => {
    expect(can("usuario", "scheduling", "view")).toBe(true);
    expect(can("usuario", "scheduling", "create")).toBe(true);
    expect(can("usuario", "failures", "view")).toBe(false);
    expect(can("usuario", "users", "view")).toBe(false);
  });

  it("returns false for a resource not present in the role's matrix entry", () => {
    // tecnico no tiene entrada "users" en absoluto en la matriz.
    expect(can("tecnico", "users", "view")).toBe(false);
  });

  it("coordinador can create/edit equipment but not delete it", () => {
    expect(can("coordinador", "equipment", "create")).toBe(true);
    expect(can("coordinador", "equipment", "edit")).toBe(true);
    expect(can("coordinador", "equipment", "delete")).toBe(false);
  });

  it("ingeniero can view and edit work orders but not delete them", () => {
    expect(can("ingeniero", "work_orders", "view")).toBe(true);
    expect(can("ingeniero", "work_orders", "edit")).toBe(true);
    expect(can("ingeniero", "work_orders", "delete")).toBe(false);
  });

  it("ingeniero can view solicitudes but not create them", () => {
    expect(can("ingeniero", "scheduling", "view")).toBe(true);
    expect(can("ingeniero", "scheduling", "create")).toBe(false);
    expect(can("ingeniero", "scheduling", "edit")).toBe(false);
    expect(can("ingeniero", "scheduling", "delete")).toBe(false);
  });
});

describe("canAssignRole", () => {
  it("returns false when actorRole is undefined", () => {
    expect(canAssignRole(undefined, "tecnico")).toBe(false);
  });

  it("superadmin can assign clinic roles but not another superadmin", () => {
    expect(canAssignRole("superadmin", "admin")).toBe(true);
    expect(canAssignRole("superadmin", "superadmin")).toBe(false);
  });

  it("admin can assign coordinador/ingeniero/tecnico", () => {
    expect(canAssignRole("admin", "coordinador")).toBe(true);
    expect(canAssignRole("admin", "tecnico")).toBe(true);
  });

  it("admin cannot assign admin or superadmin", () => {
    expect(canAssignRole("admin", "admin")).toBe(false);
    expect(canAssignRole("admin", "superadmin")).toBe(false);
  });

  it("roles below admin cannot assign anyone", () => {
    expect(canAssignRole("coordinador", "tecnico")).toBe(false);
    expect(canAssignRole("tecnico", "tecnico")).toBe(false);
  });
});

describe("panelHome", () => {
  it("sends every role to the dashboard", () => {
    expect(panelHome("usuario")).toBe("/admin");
    expect(panelHome("tecnico")).toBe("/admin");
  });
});
