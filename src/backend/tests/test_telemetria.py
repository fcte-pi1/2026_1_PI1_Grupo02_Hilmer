"""Testes unitários para a lógica dos indicadores de desempenho (telemetria).

Cobre:
  - Identificação de tipo de pacote
  - Validação de pacotes (campos obrigatórios e regras por tipo)
  - Cálculo de velocidade de segmento
  - Atualização dos indicadores (função agregadora)
  - Cenários simulados completos
"""

import math

import pytest

from app.schemas.telemetria import (
    IndicadoresDesempenho,
    StatusCorridaTelemetria,
    TipoPacote,
)
from app.services.telemetria import (
    BATERIA_CRITICA_THRESHOLD,
    CELL_SIZE_CM,
    atualizar_indicadores,
    calcular_velocidade_segmento,
    criar_estado_inicial,
    identificar_tipo_pacote,
    validar_pacote,
)


# ===================================================================
# Dados mockados
# ===================================================================

# Cenário 1 — Corrida normal
PACOTE_INICIAL_NORMAL = {
    "id_corrida": 1,
    "timestamp_ms": 0,
    "dimensao": "4x4",
    "tentativa": 1,
    "bateria": 95,
}

PACOTES_MOVIMENTACAO_NORMAL = [
    {"id_corrida": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 0},
    {"id_corrida": 1, "timestamp_ms": 2000, "x": 1, "y": 0, "w": 0},
    {"id_corrida": 1, "timestamp_ms": 3000, "x": 1, "y": 1, "w": 90},
    {"id_corrida": 1, "timestamp_ms": 4000, "x": 2, "y": 1, "w": 0},
    {"id_corrida": 1, "timestamp_ms": 5000, "x": 2, "y": 2, "w": 90},
]

PACOTE_FINAL_SUCESSO = {
    "id_corrida": 1,
    "timestamp_ms": 30000,
    "sucesso": True,
    "v_med": 12.5,
    "bateria": 80,
}

# Cenário 2 — Bateria crítica
PACOTE_INICIAL_BATERIA_CRITICA = {
    "id_corrida": 2,
    "timestamp_ms": 0,
    "dimensao": "4x4",
    "tentativa": 1,
    "bateria": 10,
}

PACOTE_FINAL_BATERIA_CRITICA = {
    "id_corrida": 2,
    "timestamp_ms": 15000,
    "sucesso": False,
    "v_med": 5.0,
    "bateria": 3,
}

# Cenário 3 — Pacotes inválidos
PACOTE_SEM_TIMESTAMP = {
    "id_corrida": 1,
    "dimensao": "4x4",
    "tentativa": 1,
    "bateria": 90,
}

PACOTE_SEM_ID_CORRIDA = {
    "timestamp_ms": 1000,
    "x": 1,
    "y": 1,
    "w": 0,
}

PACOTE_MOV_SEM_X = {
    "id_corrida": 1,
    "timestamp_ms": 2000,
    "y": 1,
    "w": 0,
}

PACOTE_FINAL_SEM_VMED = {
    "id_corrida": 1,
    "timestamp_ms": 30000,
    "sucesso": True,
    "bateria": 80,
}

# Cenário 4 — Timestamp inconsistente
PACOTE_TIMESTAMP_REGRESSIVO = {
    "id_corrida": 1,
    "timestamp_ms": 500,
    "x": 3,
    "y": 3,
    "w": 180,
}


# ===================================================================
# Testes — Identificação de tipo de pacote
# ===================================================================


class TestIdentificarTipoPacote:
    """Testes para identificar_tipo_pacote()."""

    def test_pacote_inicial(self):
        assert identificar_tipo_pacote(PACOTE_INICIAL_NORMAL) == TipoPacote.INICIAL

    def test_pacote_movimentacao(self):
        assert (
            identificar_tipo_pacote(PACOTES_MOVIMENTACAO_NORMAL[0])
            == TipoPacote.MOVIMENTACAO
        )

    def test_pacote_final(self):
        assert identificar_tipo_pacote(PACOTE_FINAL_SUCESSO) == TipoPacote.FINAL

    def test_pacote_invalido_dict_vazio(self):
        assert identificar_tipo_pacote({}) == TipoPacote.INVALIDO

    def test_pacote_invalido_none(self):
        assert identificar_tipo_pacote(None) == TipoPacote.INVALIDO

    def test_pacote_invalido_tipo_errado(self):
        assert identificar_tipo_pacote("not a dict") == TipoPacote.INVALIDO

    def test_pacote_invalido_campos_parciais(self):
        assert identificar_tipo_pacote({"x": 1, "y": 2}) == TipoPacote.INVALIDO

    def test_pacote_final_sem_vmed_nao_e_final(self):
        """Pacote com 'sucesso' e 'bateria' mas sem 'v_med' não é final."""
        assert identificar_tipo_pacote(PACOTE_FINAL_SEM_VMED) == TipoPacote.INVALIDO


# ===================================================================
# Testes — Validação de pacotes
# ===================================================================


class TestValidarPacote:
    """Testes para validar_pacote()."""

    def test_pacote_inicial_valido(self):
        result = validar_pacote(PACOTE_INICIAL_NORMAL, TipoPacote.INICIAL)
        assert result.valido is True
        assert result.erros == []

    def test_pacote_movimentacao_valido(self):
        result = validar_pacote(
            PACOTES_MOVIMENTACAO_NORMAL[1], TipoPacote.MOVIMENTACAO, 1000
        )
        assert result.valido is True

    def test_pacote_final_valido(self):
        result = validar_pacote(PACOTE_FINAL_SUCESSO, TipoPacote.FINAL)
        assert result.valido is True

    def test_tipo_invalido_rejeita(self):
        result = validar_pacote({}, TipoPacote.INVALIDO)
        assert result.valido is False
        assert "Tipo de pacote não reconhecido." in result.erros

    def test_sem_id_corrida(self):
        result = validar_pacote(PACOTE_SEM_ID_CORRIDA, TipoPacote.MOVIMENTACAO)
        assert result.valido is False
        assert any("id_corrida" in e for e in result.erros)

    def test_sem_timestamp(self):
        result = validar_pacote(PACOTE_SEM_TIMESTAMP, TipoPacote.INICIAL)
        assert result.valido is False
        assert any("timestamp_ms" in e for e in result.erros)

    def test_timestamp_negativo(self):
        pacote = {**PACOTE_INICIAL_NORMAL, "timestamp_ms": -1}
        result = validar_pacote(pacote, TipoPacote.INICIAL)
        assert result.valido is False
        assert any("negativo" in e for e in result.erros)

    def test_timestamp_regressivo(self):
        result = validar_pacote(
            PACOTE_TIMESTAMP_REGRESSIVO,
            TipoPacote.MOVIMENTACAO,
            ultimo_timestamp_ms=5000,
        )
        assert result.valido is False
        assert any("regressivo" in e.lower() for e in result.erros)

    def test_bateria_fora_de_range_inicial(self):
        pacote = {**PACOTE_INICIAL_NORMAL, "bateria": 150}
        result = validar_pacote(pacote, TipoPacote.INICIAL)
        assert result.valido is False
        assert any("bateria" in e for e in result.erros)

    def test_bateria_negativa_final(self):
        pacote = {**PACOTE_FINAL_SUCESSO, "bateria": -5}
        result = validar_pacote(pacote, TipoPacote.FINAL)
        assert result.valido is False

    def test_movimentacao_sem_x(self):
        result = validar_pacote(PACOTE_MOV_SEM_X, TipoPacote.MOVIMENTACAO)
        assert result.valido is False
        assert any("'x'" in e for e in result.erros)

    def test_final_sem_vmed(self):
        pacote = {
            "id_corrida": 1,
            "timestamp_ms": 30000,
            "sucesso": True,
            "bateria": 80,
        }
        result = validar_pacote(pacote, TipoPacote.FINAL)
        assert result.valido is False
        assert any("v_med" in e for e in result.erros)

    def test_final_vmed_negativo(self):
        pacote = {**PACOTE_FINAL_SUCESSO, "v_med": -3.0}
        result = validar_pacote(pacote, TipoPacote.FINAL)
        assert result.valido is False
        assert any("v_med" in e for e in result.erros)

    def test_final_sucesso_nao_booleano(self):
        pacote = {**PACOTE_FINAL_SUCESSO, "sucesso": "sim"}
        result = validar_pacote(pacote, TipoPacote.FINAL)
        assert result.valido is False
        assert any("sucesso" in e for e in result.erros)


# ===================================================================
# Testes — Cálculo de velocidade de segmento
# ===================================================================


class TestCalcularVelocidadeSegmento:
    """Testes para calcular_velocidade_segmento()."""

    def test_velocidade_basica(self):
        # 1 célula em 1 segundo = CELL_SIZE_CM cm/s
        vel = calcular_velocidade_segmento(0, 0, 0, 1, 0, 1000)
        assert vel == pytest.approx(CELL_SIZE_CM, rel=1e-6)

    def test_velocidade_diagonal(self):
        # diagonal de 1 célula = sqrt(2) * CELL_SIZE_CM em 1 segundo
        vel = calcular_velocidade_segmento(0, 0, 0, 1, 1, 1000)
        expected = math.sqrt(2) * CELL_SIZE_CM
        assert vel == pytest.approx(expected, rel=1e-6)

    def test_delta_t_zero_retorna_none(self):
        assert calcular_velocidade_segmento(0, 0, 1000, 1, 0, 1000) is None

    def test_delta_t_negativo_retorna_none(self):
        assert calcular_velocidade_segmento(0, 0, 2000, 1, 0, 1000) is None

    def test_sem_deslocamento(self):
        vel = calcular_velocidade_segmento(1, 1, 0, 1, 1, 1000)
        assert vel == pytest.approx(0.0)

    def test_velocidade_nunca_negativa(self):
        vel = calcular_velocidade_segmento(0, 0, 0, 0, 0, 1000)
        assert vel is not None
        assert vel >= 0


# ===================================================================
# Testes — Estado inicial
# ===================================================================


class TestCriarEstadoInicial:
    """Testes para criar_estado_inicial()."""

    def test_estado_aguardando(self):
        estado = criar_estado_inicial()
        assert estado.status_corrida == StatusCorridaTelemetria.AGUARDANDO

    def test_campos_zerados(self):
        estado = criar_estado_inicial()
        assert estado.id_corrida_banco is None
        assert estado.sessao_hardware_id is None
        assert estado.bateria_atual is None
        assert estado.velocidade_media is None
        assert estado.tempo_decorrido_ms == 0
        assert estado.tempo_final_ms is None
        assert estado.alerta_bateria_critica is False
        assert estado.alerta_dado_invalido is False


# ===================================================================
# Testes — Função agregadora (atualizar_indicadores)
# ===================================================================


class TestAtualizarIndicadores:
    """Testes para atualizar_indicadores()."""

    def test_pacote_inicial_atualiza_bateria(self):
        estado = criar_estado_inicial()
        novo = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        assert novo.bateria_atual == 95
        assert novo.status_corrida == StatusCorridaTelemetria.EM_ANDAMENTO

    def test_pacote_inicial_seta_sessao_hardware_id(self):
        estado = criar_estado_inicial()
        novo = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        assert novo.sessao_hardware_id == 1

    def test_pacote_movimentacao_atualiza_tempo(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        estado = atualizar_indicadores(estado, PACOTES_MOVIMENTACAO_NORMAL[0])
        assert estado.tempo_decorrido_ms == 1000

    def test_pacote_movimentacao_atualiza_velocidade_media(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        # Primeiro pacote de mov: seta posição inicial, sem cálculo de vel
        estado = atualizar_indicadores(estado, PACOTES_MOVIMENTACAO_NORMAL[0])
        # Segundo pacote de mov: deslocamento de (0,0) para (1,0) em 1s
        estado = atualizar_indicadores(estado, PACOTES_MOVIMENTACAO_NORMAL[1])
        assert estado.velocidade_media is not None
        assert estado.velocidade_media == pytest.approx(CELL_SIZE_CM, rel=1e-6)

    def test_pacote_invalido_nao_altera_indicadores(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        bateria_antes = estado.bateria_atual
        tempo_antes = estado.tempo_decorrido_ms

        # Enviar pacote inválido
        estado_apos = atualizar_indicadores(estado, {"campo_errado": 42})
        assert estado_apos.bateria_atual == bateria_antes
        assert estado_apos.tempo_decorrido_ms == tempo_antes
        assert estado_apos.alerta_dado_invalido is True

    def test_pacote_none_nao_altera_indicadores(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        estado_apos = atualizar_indicadores(estado, None)
        assert estado_apos.alerta_dado_invalido is True
        assert estado_apos.bateria_atual == 95

    def test_timestamp_regressivo_ignorado(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        estado = atualizar_indicadores(estado, PACOTES_MOVIMENTACAO_NORMAL[0])
        estado = atualizar_indicadores(estado, PACOTES_MOVIMENTACAO_NORMAL[1])

        tempo_antes = estado.tempo_decorrido_ms
        # Pacote com timestamp menor que o último válido
        estado_apos = atualizar_indicadores(estado, PACOTE_TIMESTAMP_REGRESSIVO)
        assert estado_apos.tempo_decorrido_ms == tempo_antes
        assert estado_apos.alerta_dado_invalido is True

    def test_pacote_final_fixa_tempo_final(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        for mov in PACOTES_MOVIMENTACAO_NORMAL:
            estado = atualizar_indicadores(estado, mov)

        estado = atualizar_indicadores(estado, PACOTE_FINAL_SUCESSO)
        assert estado.tempo_final_ms == 30000
        assert estado.tempo_decorrido_ms == 30000

    def test_pacote_final_usa_vmed_como_velocidade_final(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        for mov in PACOTES_MOVIMENTACAO_NORMAL:
            estado = atualizar_indicadores(estado, mov)

        estado = atualizar_indicadores(estado, PACOTE_FINAL_SUCESSO)
        assert estado.velocidade_media == 12.5

    def test_pacote_final_atualiza_status_concluida(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        estado = atualizar_indicadores(estado, PACOTE_FINAL_SUCESSO)
        assert estado.status_corrida == StatusCorridaTelemetria.CONCLUIDA
        assert estado.sucesso is True

    def test_pacote_final_falha(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        estado = atualizar_indicadores(estado, PACOTE_FINAL_BATERIA_CRITICA)
        assert estado.status_corrida == StatusCorridaTelemetria.FALHA
        assert estado.sucesso is False

    def test_bateria_critica_ativa_alerta(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_BATERIA_CRITICA)
        assert estado.alerta_bateria_critica is True
        assert estado.bateria_atual == 10

    def test_bateria_normal_nao_ativa_alerta(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        assert estado.alerta_bateria_critica is False

    def test_bateria_critica_no_pacote_final(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        estado = atualizar_indicadores(estado, PACOTE_FINAL_BATERIA_CRITICA)
        assert estado.alerta_bateria_critica is True
        assert estado.bateria_atual == 3

    def test_movimentacao_com_bateria_atualiza(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)

        pacote_mov_com_bateria = {
            **PACOTES_MOVIMENTACAO_NORMAL[0],
            "bateria": 88,
        }
        estado = atualizar_indicadores(estado, pacote_mov_com_bateria)
        assert estado.bateria_atual == 88

    def test_movimentacao_sem_bateria_mantem_ultima(self):
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        # Movimentação sem campo bateria
        estado = atualizar_indicadores(estado, PACOTES_MOVIMENTACAO_NORMAL[0])
        assert estado.bateria_atual == 95  # mantém do pacote inicial


# ===================================================================
# Testes — Cenários simulados completos
# ===================================================================


class TestCenariosSimulados:
    """Testes de integração com sequências completas de pacotes."""

    def test_corrida_normal_completa(self):
        """Cenário 1: pacote inicial → movimentações → pacote final com sucesso."""
        estado = criar_estado_inicial()

        # Início
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        assert estado.status_corrida == StatusCorridaTelemetria.EM_ANDAMENTO
        assert estado.bateria_atual == 95

        # Movimentações
        for mov in PACOTES_MOVIMENTACAO_NORMAL:
            estado = atualizar_indicadores(estado, mov)

        assert estado.tempo_decorrido_ms == 5000
        assert estado.velocidade_media is not None
        assert estado.velocidade_media > 0

        # Final
        estado = atualizar_indicadores(estado, PACOTE_FINAL_SUCESSO)
        assert estado.status_corrida == StatusCorridaTelemetria.CONCLUIDA
        assert estado.sucesso is True
        assert estado.tempo_final_ms == 30000
        assert estado.velocidade_media == 12.5
        assert estado.bateria_atual == 80
        assert estado.alerta_bateria_critica is False

    def test_corrida_com_bateria_critica(self):
        """Cenário 2: bateria crítica desde o início."""
        estado = criar_estado_inicial()

        estado = atualizar_indicadores(estado, PACOTE_INICIAL_BATERIA_CRITICA)
        assert estado.alerta_bateria_critica is True

        estado = atualizar_indicadores(estado, PACOTE_FINAL_BATERIA_CRITICA)
        assert estado.alerta_bateria_critica is True
        assert estado.bateria_atual == 3
        assert estado.status_corrida == StatusCorridaTelemetria.FALHA

    def test_corrida_com_pacotes_invalidos(self):
        """Cenário 3: pacotes inválidos intercalados não afetam o estado."""
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)

        # Pacote inválido sem timestamp
        estado_temp = atualizar_indicadores(estado, PACOTE_SEM_TIMESTAMP)
        assert estado_temp.alerta_dado_invalido is True
        assert estado_temp.tempo_decorrido_ms == estado.tempo_decorrido_ms

        # Pacote inválido sem id_corrida
        estado_temp = atualizar_indicadores(estado, PACOTE_SEM_ID_CORRIDA)
        assert estado_temp.alerta_dado_invalido is True

        # Pacote inválido de mov sem x
        estado_temp = atualizar_indicadores(estado, PACOTE_MOV_SEM_X)
        assert estado_temp.alerta_dado_invalido is True

    def test_corrida_com_timestamp_inconsistente(self):
        """Cenário 4: timestamp regressivo é rejeitado."""
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)
        estado = atualizar_indicadores(estado, PACOTES_MOVIMENTACAO_NORMAL[0])  # ts=1000
        estado = atualizar_indicadores(estado, PACOTES_MOVIMENTACAO_NORMAL[1])  # ts=2000

        # Timestamp regressivo (500 < 2000)
        estado_apos = atualizar_indicadores(estado, PACOTE_TIMESTAMP_REGRESSIVO)
        assert estado_apos.alerta_dado_invalido is True
        assert estado_apos.tempo_decorrido_ms == 2000  # não atualizou

    def test_estado_nao_mutado_por_pacote_invalido(self):
        """Garante que o estado original não é mutado pela função."""
        estado = criar_estado_inicial()
        estado = atualizar_indicadores(estado, PACOTE_INICIAL_NORMAL)

        estado_congelado = estado.model_copy()
        _ = atualizar_indicadores(estado, {"invalido": True})

        # Estado original deve estar intacto
        assert estado.bateria_atual == estado_congelado.bateria_atual
        assert estado.tempo_decorrido_ms == estado_congelado.tempo_decorrido_ms
