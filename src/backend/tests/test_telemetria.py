"""Testes unitários para a lógica dos indicadores de desempenho (telemetria).

Pacotes seguem a especificação telemetria.md:
  tipo 0 = Configuração Inicial
  tipo 1 = Movimentação / Descoberta de Paredes
  tipo 2 = Rota Otimizada
  tipo 3 = Fim de Corrida
"""
import math
import pytest

from app.schemas.telemetria import (
    IndicadoresDesempenho, StatusCorridaTelemetria, TipoAlertaTelemetria, TipoPacote,
)
from app.services.telemetria import (
    BATERIA_CRITICA_THRESHOLD, CELL_SIZE_CM, PARADA_INESPERADA_THRESHOLD_MS,
    atualizar_indicadores, calcular_velocidade_segmento,
    criar_estado_inicial, identificar_tipo_pacote, validar_pacote,
)

# ===================================================================
# Dados mockados — conforme telemetria.md
# ===================================================================

PACOTE_INICIAL_NORMAL = {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 95}

PACOTE_MOVIMENTACAO = [
    {"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 0},
    {"tipo": 1, "timestamp_ms": 2000, "x": 1, "y": 0, "w": 0},
    {"tipo": 1, "timestamp_ms": 3000, "x": 1, "y": 1, "w": 5},
    {"tipo": 1, "timestamp_ms": 4000, "x": 2, "y": 1, "w": 0},
    {"tipo": 1, "timestamp_ms": 5000, "x": 2, "y": 2, "w": 5},
]

PACOTE_FINAL_SUCESSO = {"tipo": 3, "timestamp_ms": 30000, "sucesso": True, "v_med": 12.5, "bateria": 80}

PACOTE_INICIAL_BATERIA_CRITICA = {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 10}

PACOTE_FINAL_BATERIA_CRITICA = {"tipo": 3, "timestamp_ms": 15000, "sucesso": False, "v_med": 5.0, "bateria": 3}

PACOTE_SEM_TIMESTAMP = {"tipo": 0, "dimensao": 4, "bateria": 90}
PACOTE_SEM_TIPO = {"timestamp_ms": 1000, "x": 1, "y": 1, "w": 0}
PACOTE_MOV_SEM_X = {"tipo": 1, "timestamp_ms": 2000, "y": 1, "w": 0}
PACOTE_FINAL_SEM_VMED = {"tipo": 3, "timestamp_ms": 30000, "sucesso": True, "bateria": 80}
PACOTE_TIMESTAMP_REGRESSIVO = {"tipo": 1, "timestamp_ms": 500, "x": 3, "y": 3, "w": 5}

PACOTE_MOVIMENTACAO_PARADA = [
    {"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 0},
    {"tipo": 1, "timestamp_ms": 2500, "x": 0, "y": 0, "w": 0},
    {"tipo": 1, "timestamp_ms": 4501, "x": 0, "y": 0, "w": 0},
]


class TestIdentificarTipoPacote:
    def test_pacote_inicial(self):
        assert identificar_tipo_pacote(PACOTE_INICIAL_NORMAL) == TipoPacote.INICIAL
    def test_pacote_movimentacao(self):
        assert identificar_tipo_pacote(PACOTE_MOVIMENTACAO[0]) == TipoPacote.MOVIMENTACAO
    def test_pacote_final(self):
        assert identificar_tipo_pacote(PACOTE_FINAL_SUCESSO) == TipoPacote.FINAL
    def test_pacote_rota(self):
        assert identificar_tipo_pacote({"tipo": 2, "timestamp_ms": 0, "rota": []}) == TipoPacote.ROTA
    def test_pacote_invalido_dict_vazio(self):
        assert identificar_tipo_pacote({}) == TipoPacote.INVALIDO
    def test_pacote_invalido_none(self):
        assert identificar_tipo_pacote(None) == TipoPacote.INVALIDO
    def test_pacote_invalido_tipo_errado(self):
        assert identificar_tipo_pacote("not a dict") == TipoPacote.INVALIDO
    def test_pacote_invalido_tipo_desconhecido(self):
        assert identificar_tipo_pacote({"tipo": 99}) == TipoPacote.INVALIDO
    def test_pacote_sem_campo_tipo(self):
        assert identificar_tipo_pacote(PACOTE_SEM_TIPO) == TipoPacote.INVALIDO
    def test_pacote_tipo_string_invalido(self):
        assert identificar_tipo_pacote({"tipo": "inicial"}) == TipoPacote.INVALIDO


class TestValidarPacote:
    def test_pacote_inicial_valido(self):
        result = validar_pacote(PACOTE_INICIAL_NORMAL, TipoPacote.INICIAL)
        assert result.valido is True and result.erros == []
    def test_pacote_movimentacao_valido(self):
        assert validar_pacote(PACOTE_MOVIMENTACAO[1], TipoPacote.MOVIMENTACAO, 1000).valido
    def test_pacote_final_valido(self):
        assert validar_pacote(PACOTE_FINAL_SUCESSO, TipoPacote.FINAL).valido
    def test_tipo_invalido_rejeita(self):
        r = validar_pacote({}, TipoPacote.INVALIDO)
        assert not r.valido and "Tipo de pacote não reconhecido." in r.erros
    def test_sem_tipo(self):
        assert not validar_pacote(PACOTE_SEM_TIPO, TipoPacote.INVALIDO).valido
    def test_sem_timestamp(self):
        r = validar_pacote(PACOTE_SEM_TIMESTAMP, TipoPacote.INICIAL)
        assert not r.valido and any("timestamp_ms" in e for e in r.erros)
    def test_timestamp_negativo(self):
        r = validar_pacote({**PACOTE_INICIAL_NORMAL, "timestamp_ms": -1}, TipoPacote.INICIAL)
        assert not r.valido and any("negativo" in e for e in r.erros)
    def test_timestamp_regressivo(self):
        r = validar_pacote(PACOTE_TIMESTAMP_REGRESSIVO, TipoPacote.MOVIMENTACAO, ultimo_timestamp_ms=5000)
        assert not r.valido and any("regressivo" in e.lower() for e in r.erros)
    def test_bateria_fora_de_range_inicial(self):
        r = validar_pacote({**PACOTE_INICIAL_NORMAL, "bateria": 150}, TipoPacote.INICIAL)
        assert not r.valido and any("Bateria" in e for e in r.erros)
    def test_bateria_negativa_final(self):
        assert not validar_pacote({**PACOTE_FINAL_SUCESSO, "bateria": -5}, TipoPacote.FINAL).valido
    def test_movimentacao_sem_x(self):
        r = validar_pacote(PACOTE_MOV_SEM_X, TipoPacote.MOVIMENTACAO)
        assert not r.valido and any("'x'" in e for e in r.erros)
    def test_final_sem_vmed(self):
        r = validar_pacote(PACOTE_FINAL_SEM_VMED, TipoPacote.FINAL)
        assert not r.valido and any("v_med" in e for e in r.erros)
    def test_final_vmed_negativo(self):
        r = validar_pacote({**PACOTE_FINAL_SUCESSO, "v_med": -3.0}, TipoPacote.FINAL)
        assert not r.valido and any("v_med" in e for e in r.erros)
    def test_final_sucesso_nao_booleano(self):
        r = validar_pacote({**PACOTE_FINAL_SUCESSO, "sucesso": "sim"}, TipoPacote.FINAL)
        assert not r.valido and any("sucesso" in e for e in r.erros)
    def test_w_fora_do_range(self):
        r = validar_pacote({"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 16}, TipoPacote.MOVIMENTACAO)
        assert not r.valido and any("w" in e for e in r.erros)
    def test_w_float_rejeitado(self):
        r = validar_pacote({"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 5.5}, TipoPacote.MOVIMENTACAO)
        assert not r.valido and any("'w'" in e for e in r.erros)
    def test_dimensao_invalida(self):
        r = validar_pacote({**PACOTE_INICIAL_NORMAL, "dimensao": 5}, TipoPacote.INICIAL)
        assert not r.valido and any("Dimensão" in e for e in r.erros)


class TestCalcularVelocidadeSegmento:
    def test_velocidade_basica(self):
        assert calcular_velocidade_segmento(0, 0, 0, 1, 0, 1000) == pytest.approx(CELL_SIZE_CM / 100, rel=1e-6)
    def test_velocidade_diagonal(self):
        assert calcular_velocidade_segmento(0, 0, 0, 1, 1, 1000) == pytest.approx(math.sqrt(2) * CELL_SIZE_CM / 100, rel=1e-6)
    def test_delta_t_zero_retorna_none(self):
        assert calcular_velocidade_segmento(0, 0, 1000, 1, 0, 1000) is None
    def test_delta_t_negativo_retorna_none(self):
        assert calcular_velocidade_segmento(0, 0, 2000, 1, 0, 1000) is None
    def test_sem_deslocamento(self):
        assert calcular_velocidade_segmento(1, 1, 0, 1, 1, 1000) == pytest.approx(0.0)
    def test_velocidade_nunca_negativa(self):
        vel = calcular_velocidade_segmento(0, 0, 0, 0, 0, 1000)
        assert vel is not None and vel >= 0


class TestCriarEstadoInicial:
    def test_estado_aguardando(self):
        assert criar_estado_inicial().status_corrida == StatusCorridaTelemetria.AGUARDANDO
    def test_campos_zerados(self):
        e = criar_estado_inicial()
        assert e.id_corrida_banco is None and e.bateria_atual is None
        assert e.velocidade_media is None and e.tempo_decorrido_ms == 0
        assert not e.alerta_bateria_critica and e.log_alertas == []


class TestAtualizarIndicadores:
    def test_pacote_inicial_atualiza_bateria(self):
        novo = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        assert novo.bateria_atual == 95 and novo.status_corrida == StatusCorridaTelemetria.EM_ANDAMENTO

    def test_pacote_movimentacao_atualiza_tempo(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        e = atualizar_indicadores(e, PACOTE_MOVIMENTACAO[0])
        assert e.tempo_decorrido_ms == 1000

    def test_pacote_movimentacao_atualiza_velocidade_media(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        e = atualizar_indicadores(e, PACOTE_MOVIMENTACAO[0])
        e = atualizar_indicadores(e, PACOTE_MOVIMENTACAO[1])
        assert e.velocidade_media is not None and e.velocidade_media == pytest.approx(CELL_SIZE_CM / 100, rel=1e-6)

    def test_pacote_invalido_nao_altera_indicadores(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        bat, t = e.bateria_atual, e.tempo_decorrido_ms
        e2 = atualizar_indicadores(e, {"campo_errado": 42})
        assert e2.bateria_atual == bat and e2.tempo_decorrido_ms == t and e2.alerta_dado_invalido

    def test_pacote_none_nao_altera_indicadores(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        e2 = atualizar_indicadores(e, None)
        assert e2.alerta_dado_invalido and e2.bateria_atual == 95

    def test_timestamp_regressivo_ignorado(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        e = atualizar_indicadores(e, PACOTE_MOVIMENTACAO[0])
        e = atualizar_indicadores(e, PACOTE_MOVIMENTACAO[1])
        t = e.tempo_decorrido_ms
        e2 = atualizar_indicadores(e, PACOTE_TIMESTAMP_REGRESSIVO)
        assert e2.tempo_decorrido_ms == t and e2.alerta_dado_invalido

    def test_pacote_final_fixa_tempo_final(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        for m in PACOTE_MOVIMENTACAO:
            e = atualizar_indicadores(e, m)
        e = atualizar_indicadores(e, PACOTE_FINAL_SUCESSO)
        assert e.tempo_final_ms == 30000 and e.tempo_decorrido_ms == 30000

    def test_pacote_final_usa_vmed_como_velocidade_final(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        for m in PACOTE_MOVIMENTACAO:
            e = atualizar_indicadores(e, m)
        e = atualizar_indicadores(e, PACOTE_FINAL_SUCESSO)
        assert e.velocidade_media == 12.5

    def test_pacote_final_atualiza_status_concluida(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        e = atualizar_indicadores(e, PACOTE_FINAL_SUCESSO)
        assert e.status_corrida == StatusCorridaTelemetria.CONCLUIDA and e.sucesso is True

    def test_pacote_final_falha(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        e = atualizar_indicadores(e, PACOTE_FINAL_BATERIA_CRITICA)
        assert e.status_corrida == StatusCorridaTelemetria.FALHA and e.sucesso is False

    def test_bateria_critica_ativa_alerta(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_BATERIA_CRITICA)
        assert e.alerta_bateria_critica and e.bateria_atual == 10
        assert e.log_alertas[-1].tipo == TipoAlertaTelemetria.BATERIA_CRITICA

    def test_bateria_normal_nao_ativa_alerta(self):
        assert not atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL).alerta_bateria_critica

    def test_bateria_critica_exige_threshold_inclusivo(self):
        assert BATERIA_CRITICA_THRESHOLD == 10.0
        assert atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_BATERIA_CRITICA).alerta_bateria_critica

    def test_alertas_nao_mutam_estado_original(self):
        e = criar_estado_inicial()
        novo = atualizar_indicadores(e, PACOTE_INICIAL_BATERIA_CRITICA)
        assert e.log_alertas == [] and len(novo.log_alertas) == 1

    def test_bateria_critica_nao_duplica_log_enquanto_persistir(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_BATERIA_CRITICA)
        n = len(e.log_alertas)
        e = atualizar_indicadores(e, {"tipo": 1, "timestamp_ms": 1000, "x": 0, "y": 0, "w": 0})
        assert len(e.log_alertas) == n

    def test_bateria_critica_no_pacote_final(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        e = atualizar_indicadores(e, PACOTE_FINAL_BATERIA_CRITICA)
        assert e.alerta_bateria_critica and e.bateria_atual == 3

    def test_parada_inesperada_dispara_apos_mais_de_tres_segundos(self):
        e = atualizar_indicadores(criar_estado_inicial(), {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 85})
        for p in PACOTE_MOVIMENTACAO_PARADA:
            e = atualizar_indicadores(e, p)
        assert e.alerta_possivel_parada_inesperada
        assert e.log_alertas[-1].tipo == TipoAlertaTelemetria.POSSIVEL_PARADA_INESPERADA

    def test_parada_inesperada_nao_dispara_com_tres_segundos_exatos(self):
        e = atualizar_indicadores(criar_estado_inicial(), {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 85})
        e = atualizar_indicadores(e, PACOTE_MOVIMENTACAO_PARADA[0])
        e = atualizar_indicadores(e, {"tipo": 1, "timestamp_ms": 4000, "x": 0, "y": 0, "w": 0})
        assert not e.alerta_possivel_parada_inesperada

    def test_parada_inesperada_nao_dispara_quando_corrida_nao_esta_ativa(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        e.status_corrida = StatusCorridaTelemetria.CONCLUIDA
        for p in (PACOTE_MOVIMENTACAO_PARADA[0], {"tipo": 1, "timestamp_ms": 5000, "x": 0, "y": 0, "w": 0}):
            e = atualizar_indicadores(e, p)
        assert not e.alerta_possivel_parada_inesperada

    def test_parada_inesperada_e_limpa_ao_encerrar_corrida(self):
        e = atualizar_indicadores(criar_estado_inicial(), {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 85})
        for p in PACOTE_MOVIMENTACAO_PARADA:
            e = atualizar_indicadores(e, p)
        assert e.alerta_possivel_parada_inesperada
        e = atualizar_indicadores(e, PACOTE_FINAL_SUCESSO)
        assert not e.alerta_possivel_parada_inesperada


class TestCenariosSimulados:
    def test_corrida_normal_completa(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        for m in PACOTE_MOVIMENTACAO:
            e = atualizar_indicadores(e, m)
        e = atualizar_indicadores(e, PACOTE_FINAL_SUCESSO)
        assert e.status_corrida == StatusCorridaTelemetria.CONCLUIDA
        assert e.sucesso and e.tempo_final_ms == 30000 and e.velocidade_media == 12.5

    def test_corrida_com_bateria_critica(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_BATERIA_CRITICA)
        e = atualizar_indicadores(e, PACOTE_FINAL_BATERIA_CRITICA)
        assert e.alerta_bateria_critica and e.bateria_atual == 3 and e.status_corrida == StatusCorridaTelemetria.FALHA

    def test_corrida_com_parada_inesperada_registra_log(self):
        e = atualizar_indicadores(criar_estado_inicial(), {"tipo": 0, "timestamp_ms": 0, "dimensao": 4, "bateria": 85})
        for p in PACOTE_MOVIMENTACAO_PARADA:
            e = atualizar_indicadores(e, p)
        assert e.alerta_possivel_parada_inesperada
        assert e.log_alertas[-1].tipo == TipoAlertaTelemetria.POSSIVEL_PARADA_INESPERADA

    def test_corrida_com_pacotes_invalidos(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        for bad in (PACOTE_SEM_TIMESTAMP, PACOTE_SEM_TIPO, PACOTE_MOV_SEM_X):
            e2 = atualizar_indicadores(e, bad)
            assert e2.alerta_dado_invalido

    def test_corrida_com_timestamp_inconsistente(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        e = atualizar_indicadores(e, PACOTE_MOVIMENTACAO[0])
        e = atualizar_indicadores(e, PACOTE_MOVIMENTACAO[1])
        e2 = atualizar_indicadores(e, PACOTE_TIMESTAMP_REGRESSIVO)
        assert e2.alerta_dado_invalido and e2.tempo_decorrido_ms == 2000

    def test_estado_nao_mutado_por_pacote_invalido(self):
        e = atualizar_indicadores(criar_estado_inicial(), PACOTE_INICIAL_NORMAL)
        ec = e.model_copy()
        _ = atualizar_indicadores(e, {"invalido": True})
        assert e.bateria_atual == ec.bateria_atual and e.tempo_decorrido_ms == ec.tempo_decorrido_ms
