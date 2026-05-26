describe("CT02 — formatarTempo: formatação de tempo (MM:SS.mmm)", () => {

  const formatarTempo = (ms?: number | null): string => {
    if (ms === null || ms === undefined || Number.isNaN(ms) || ms < 0) {
      return "00:00.000";
    }
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const milissegundos = Math.floor(ms % 1000);
    return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}.${String(milissegundos).padStart(3, "0")}`;
  };

  it("retorna '00:00.000' para undefined", () => {
    expect(formatarTempo(undefined)).toBe("00:00.000");
  });

  it("retorna '00:00.000' para null", () => {
    expect(formatarTempo(null)).toBe("00:00.000");
  });

  it("retorna '00:00.000' para NaN", () => {
    expect(formatarTempo(NaN)).toBe("00:00.000");
  });

  it("retorna '00:00.000' para valor negativo", () => {
    expect(formatarTempo(-1)).toBe("00:00.000");
  });

  it("formata zero corretamente", () => {
    expect(formatarTempo(0)).toBe("00:00.000");
  });

  it("formata 1 segundo (1000ms)", () => {
    expect(formatarTempo(1000)).toBe("00:01.000");
  });

  it("formata 59 segundos e 999ms", () => {
    expect(formatarTempo(59999)).toBe("00:59.999");
  });

  it("formata 1 minuto exato", () => {
    expect(formatarTempo(60000)).toBe("01:00.000");
  });

  it("formata 1 minuto e 5 segundos e 430ms", () => {
    expect(formatarTempo(65430)).toBe("01:05.430");
  });

  it("formata 93 segundos e 210ms", () => {
    expect(formatarTempo(93210)).toBe("01:33.210");
  });

  it("aplica padding de 2 dígitos nos minutos", () => {
    expect(formatarTempo(60000)).toMatch(/^\d{2}:/);
  });

  it("aplica padding de 2 dígitos nos segundos", () => {
    expect(formatarTempo(5000)).toMatch(/:\d{2}\./);
  });

  it("aplica padding de 3 dígitos nos milissegundos", () => {
    expect(formatarTempo(5)).toMatch(/\.\d{3}$/);
  });

  it("formata valores acima de 60 minutos sem truncar", () => {
    expect(formatarTempo(5_400_000)).toBe("90:00.000");
  });
});