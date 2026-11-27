import { describe, expect, it } from "vitest";
import { congelar, cuotasPorCobrar, renovar } from "@/gimnasio/cuotas";
import { planes } from "@/gimnasio/config";
import { esDia, fechaLarga, lunesDe, sumarDias } from "@/gimnasio/fechas";
import { HOY, socio } from "./ayudas";

const mensual = planes[0];

describe("fechas", () => {
  it("valida días y calcula semanas", () => {
    expect(esDia("2026-02-29")).toBe(false);
    expect(esDia("2028-02-29")).toBe(true);
    expect(esDia("27/11/2026")).toBe(false);
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(lunesDe("2026-11-29")).toBe("2026-11-23"); // domingo → lunes anterior
    expect(lunesDe("2026-11-23")).toBe("2026-11-23");
    expect(fechaLarga("2026-11-07")).toBe("7 de noviembre");
  });
});

describe("cuotas", () => {
  it("renovar con la cuota vigente encadena tras el vencimiento", () => {
    expect(renovar(socio({ vencimiento: "2026-11-30" }), mensual, HOY).vencimiento).toBe("2026-12-30");
  });
  it("renovar una cuota vencida cuenta desde el día del pago", () => {
    expect(renovar(socio({ vencimiento: "2026-10-01" }), mensual, HOY).vencimiento).toBe(sumarDias(HOY, 29));
  });
  it("renovar no muta el socio original y quita la congelación", () => {
    const original = socio({ congeladoHasta: "2026-11-01" });
    const nuevo = renovar(original, mensual, HOY);
    expect(original.vencimiento).toBe("2026-12-20");
    expect(nuevo.congeladoHasta).toBeUndefined();
  });
  it("congelar desplaza el vencimiento y respeta los límites", () => {
    const r = congelar(socio(), HOY, 10);
    expect(r).toMatchObject({ ok: true, socio: { congeladoHasta: "2026-12-06", vencimiento: "2026-12-30" } });
    expect(congelar(socio(), HOY, 31).ok).toBe(false);
    expect(congelar(socio(), HOY, 0).ok).toBe(false);
    expect(congelar(socio({ vencimiento: "2026-11-01" }), HOY, 5).ok).toBe(false);
    if (r.ok) expect(congelar(r.socio, HOY, 5).ok).toBe(false);
  });
  it("lista las cuotas por cobrar, sin los congelados, por fecha", () => {
    const lista = cuotasPorCobrar(
      [
        socio({ id: "a", vencimiento: "2026-12-01" }),
        socio({ id: "b", vencimiento: "2026-11-20" }),
        socio({ id: "c", vencimiento: "2027-01-01" }),
        socio({ id: "d", vencimiento: "2026-11-28", congeladoHasta: "2026-12-10" }),
      ],
      HOY,
    );
    expect(lista.map((s) => s.id)).toEqual(["b", "a"]);
  });
});
