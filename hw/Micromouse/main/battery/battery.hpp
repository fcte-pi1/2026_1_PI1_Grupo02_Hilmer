#pragma once
#include "ina226.hpp"

#define FILTER_SIZE  30     // Tamanho do buffer para o filtro
#define FILTER_ALPHA 0.1f   // Fator de suavização para o filtro de média móvel

/**
 * @brief Gerenciador do subsistema da bateria utilizando um sensor INA226.
 *
 * Esta classe é responsável por monitorar a tensão, corrente e potência da bateria,
 * bem como calcular o estado de carga (SOC).
 */

class Battery {
public:
    /**
     * @brief Construtor da classe Battery.
     */
    Battery();

    /**
    * @brief Inicializa o sensor INA226 e configura os parâmetros iniciais da bateria.
    */
    bool init();

    /**
    * @brief Atualiza as leituras do sensor e recalcula o estado de carga (SOC).
    * Este método deve ser chamado periodicamente para garantir que as leituras do sensor sejam atualizadas corretamente.
     */
    void update();

    /**
     * @brief Obtém a tensão medida pelo sensor.
     * @return A tensão em volts (V).
     */
    float getVoltage();

    /**
     * @brief Obtém a corrente medida pelo sensor.
     * @return A corrente em amperes (A).
     */
    float getCurrent();

    /**
     * @brief Obtém a potência medida pelo sensor.
     * @return A potência em watts (W).
     */
    float getPower();

    /**
     * @brief Obtém o estado de carga (SOC) da bateria.
     * @return O estado de carga como uma porcentagem (%).
     */
    float getSOC();

    /**
     * @brief Obtém a corrente filtrada.
     * @return A corrente filtrada em amperes (A).
     */
    float getCurrentFiltered();
    /**
     * @brief Obtém a tensão filtrada.
     * @return A tensão filtrada em volts (V).
     */
    float getVoltageFiltered();
    /**
     * @brief Obtém a potência filtrada.
     * @return A potência filtrada em watts (W).
     */
    float getPowerFiltered();

private:
    /**
     * @brief Estrutura para Buffer para armazenar o estado dos filtros.
     */
    struct FilterState {
        float   buf[FILTER_SIZE];
        uint8_t idx;
        uint8_t count;
        float   lpf;
    };

    /**
     * @brief Enumeração para os tipos de filtros.
     */
    enum Filter { CURRENT = 0, VOLTAGE, POWER, FILTER_COUNT };

    espp::Ina226* ina_sensor;   // Sensor INA226 para leitura de tensão, corrente e potência
    float   soc_;               // Estado de carga da bateria em porcentagem (%)
    int64_t last_update_us_;    // Timestamp da última atualização em microssegundos (us)
    float   capacity_as_;       // Capacidade da bateria em Ampere-segundos (As)

    
    FilterState filters_[FILTER_COUNT];     // Array que armazena o histórico e o estado dos filtros (Corrente, Tensão e Potência)

    /**
     * @brief Aplica o filtro ao valor bruto.
     * @param f O tipo de filtro a ser aplicado.
     * @param raw O valor bruto a ser filtrado.
     * @return O valor filtrado.
     */
    float applyFilter(Filter f, float raw);

    /**
     * @brief Converte a tensão para o estado de carga (SOC).
     * @param voltage A tensão em volts (V).
     * @return O estado de carga como uma porcentagem (%).
     */
    float voltageToSOC(float voltage);
};