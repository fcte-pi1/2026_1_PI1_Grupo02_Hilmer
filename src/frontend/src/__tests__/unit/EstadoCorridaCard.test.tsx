import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EstadoCorridaCard } from "../../components/estados/EstadoCorridaCard";
import {
  mockAguardando,
  mockConcluida,
  mockEmAndamento,
  mockFalha,
} from "../utils/telemetria-mocks";

describe("EstadoCorridaCard", () => {
  it.each([
    {
      indicadores: mockAguardando,
      titulo: "Aguardando início",
      classes: ["bg-zinc-900", "text-zinc-300"],
    },
    {
      indicadores: mockEmAndamento,
      titulo: "Corrida em andamento",
      classes: ["bg-amber-500/10", "text-amber-400"],
    },
    {
      indicadores: mockConcluida,
      titulo: "Desafio cumprido",
      classes: ["bg-emerald-500/10", "text-emerald-400"],
    },
    {
      indicadores: mockFalha,
      titulo: "Desafio não cumprido",
      classes: ["bg-rose-500/10", "text-rose-400"],
    },
  ])("renderiza $titulo com texto e classes corretos", ({
    indicadores,
    titulo,
    classes,
  }) => {
    render(<EstadoCorridaCard indicadores={indicadores} />);

    const heading = screen.getByRole("heading", { name: titulo });
    const card = heading.closest("section");

    expect(card).not.toBeNull();
    expect(card).toHaveClass(classes[0]);
    expect(heading).toHaveClass(classes[1]);
  });
});
