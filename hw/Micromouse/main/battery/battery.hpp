#pragma once
#include "ina226.hpp"

#define FILTER_SIZE  30     // Tamanho do buffer do filtro
#define FILTER_ALPHA 0.1f   // Fator de suavizacao do filtro

// Gerencia leituras do INA226 e calcula o estado de carga (SOC).

class Battery {
public:
    // Construtor padrao.
    Battery();

    // Inicializa o INA226 e os filtros internos.
    bool init();

    // Atualiza leituras e recalcula o SOC (chamar periodicamente).
    void update();

    // Retorna a tensao medida (V).
    float getVoltage();

    // Retorna a corrente medida (A).
    float getCurrent();

    // Retorna a potencia medida (W).
    float getPower();

    // Retorna o estado de carga da bateria (SOC em %).
    float getSOC();

    // Retorna a corrente filtrada (A).
    float getCurrentFiltered();
    // Retorna a tensao filtrada (V).
    float getVoltageFiltered();
    // Retorna a potencia filtrada (W).
    float getPowerFiltered();

private:
    // Estado interno do filtro de media movel.
    struct FilterState {
        float   buf[FILTER_SIZE];
        uint8_t idx;
        uint8_t count;
        float   lpf;
    };

    // Tipos de filtro disponiveis.
    enum Filter { CURRENT = 0, VOLTAGE, POWER, FILTER_COUNT };

    espp::Ina226* ina_sensor;   // Sensor INA226
    float   soc_;               // Estado de carga em porcentagem
    int64_t last_update_us_;    // Timestamp da ultima atualizacao (us)
    float   capacity_as_;       // Capacidade em ampere-segundos

    
    FilterState filters_[FILTER_COUNT];     // Historico dos filtros (corrente, tensao e potencia)

    // Aplica o filtro ao valor bruto.
    float applyFilter(Filter f, float raw);

    // Converte tensao em SOC aproximado.
    float voltageToSOC(float voltage);
};