// =============================================================================
//  imu.h — Módulo de IMU para o Micromouse (ESP32 + MPU-9250)
// =============================================================================
//
//  VISÃO GERAL
//  -----------
//  Este arquivo declara a interface do módulo de IMU. Ele é o "contrato"
//  entre o resto do firmware e a lógica de leitura/calibração do sensor.
//  Se você só quer usar os dados do IMU, basta incluir este header e
//  chamar as funções declaradas aqui — não precisa entrar no .cpp.
//
//  SENSOR UTILIZADO
//  ----------------
//  MPU-9250 (InvenSense): combina acelerômetro 3-eixos, giroscópio 3-eixos
//  e magnetômetro 3-eixos (AK8963) num único pacote. Comunicação via I2C.
//  Biblioteca: https://github.com/yelvlab/ESP32-Arduino-MPU9250
//
//  CALIBRAÇÃO
//  ----------
//  - Giroscópio  : feita com o robô parado no chão. Basta não mover nada.
//  - Acelerômetro: precisa de 6 posições (cada face do cubo apontando p/ baixo).
//  - Magnetômetro: mova o robô em "figura 8" lentamente no ar por ~15 s.
//  Os valores são salvos na memória flash (NVS) e carregados automaticamente
//  na próxima inicialização — você não precisa recalibrar toda vez.
//
//  COMO DISPARAR A CALIBRAÇÃO
//  --------------------------
//  Via Serial: envie os comandos abaixo pelo monitor serial (115200 baud):
//    'G'  → calibrar giroscópio
//    'A'  → calibrar acelerômetro
//    'M'  → calibrar magnetômetro
//    'P'  → imprimir dados crus do sensor
//    'R'  → resetar calibração salva e reiniciar com padrões
//
//  COMO USAR EM OUTROS ARQUIVOS DO PROJETO
//  ----------------------------------------
//    #include "imu.h"
//
//    void setup() {
//        imu_init();
//    }
//
//    void loop() {
//        imu_update();
//        DadosIMU d = imu_get_dados();
//        Serial.println(d.accel_x);
//    }
//
//  Adaptado por Vítor Gonçalves de Andrade - 261025182
//  Data: Abril/2026
//
// =============================================================================

#ifndef IMU_H
#define IMU_H

#include <Arduino.h>

// -----------------------------------------------------------------------------
//  PINOS I2C
//  Ajusta conforme o nosso esquemático. Os valores abaixo são os padrões
//  mais comuns para ESP32 DevKit, mas podemos mudar conforme necessário.
// -----------------------------------------------------------------------------
#define IMU_PIN_SDA  21   // Pino SDA do barramento I2C
#define IMU_PIN_SCL  22   // Pino SCL do barramento I2C

// Endereço I2C do MPU-9250.
// 0x68 quando o pino AD0 está em GND (padrão na maioria dos módulos).
// 0x69 quando AD0 está em VCC. Mude aqui se necessário.
#define IMU_ENDERECO_I2C  0x68

// -----------------------------------------------------------------------------
//  CONFIGURAÇÃO DO SENSOR
//  Ajustar esses valores para mudar sensibilidade vs. resolução.
//
//  Faixas do acelerômetro:
//    ACCEL_RANGE_2G   → mais sensível, mas satura mais fácil
//    ACCEL_RANGE_4G
//    ACCEL_RANGE_8G
//    ACCEL_RANGE_16G  → menos sensível, mas aguenta mais impacto
//
//  Faixas do giroscópio:
//    GYRO_RANGE_250DPS   → melhor para movimentos lentos/precisos
//    GYRO_RANGE_500DPS
//    GYRO_RANGE_1000DPS
//    GYRO_RANGE_2000DPS  → permite giros muito rápidos
//
//  DLPF (filtro passa-baixa digital):
//    Valores menores = menos ruído, mas mais atraso.
//    41 Hz é um bom equilíbrio para o micromouse.
// -----------------------------------------------------------------------------
#define IMU_FAIXA_ACCEL   MPU9250::ACCEL_RANGE_4G
#define IMU_FAIXA_GYRO    MPU9250::GYRO_RANGE_500DPS
#define IMU_FILTRO_DLPF   MPU9250::DLPF_BANDWIDTH_41HZ

// Taxa de amostragem: SRD = 0 → 1000 Hz, SRD = 9 → 100 Hz
// Para um micromouse, 100 Hz é geralmente suficiente e reduz carga no loop.
#define IMU_SRD  9   // 100 Hz

// -----------------------------------------------------------------------------
//  ESTRUTURA DE DADOS
//  Representa uma "leitura completa" do sensor em unidades físicas reais.
//  Distribua esse struct para os outros módulos que precisarem dos dados.
// -----------------------------------------------------------------------------
struct DadosIMU {
    // --- Acelerômetro (m/s²) ---
    // Mede forças lineares. Em repouso no chão, Z ≈ 9.8 m/s² (gravidade).
    float accel_x;   // Eixo X (frente/trás no robô, depende da montagem)
    float accel_y;   // Eixo Y (esquerda/direita)
    float accel_z;   // Eixo Z (cima/baixo)

    // --- Giroscópio (rad/s) ---
    // Mede velocidade angular. Útil para controle de heading do micromouse.
    // Integrado no tempo, dá o ângulo de rotação.
    float gyro_x;    // Rotação em torno do eixo X (pitch)
    float gyro_y;    // Rotação em torno do eixo Y (roll)
    float gyro_z;    // Rotação em torno do eixo Z (yaw — o mais usado no mouse)

    // --- Magnetômetro (µT) ---
    // Mede campo magnético. Com calibração adequada, serve como bússola.
    // Atenção: motores DC podem interferir bastante nessa leitura.
    float mag_x;     // Campo magnético no eixo X
    float mag_y;     // Campo magnético no eixo Y
    float mag_z;     // Campo magnético no eixo Z

    // --- Temperatura interna do chip (°C) ---
    // Útil para monitorar aquecimento durante corridas longas.
    float temperatura;

    // Marca de tempo da leitura em milissegundos (millis()).
    // Útil para integração de giroscópio e diagnóstico de timing.
    unsigned long timestamp_ms;
};

// -----------------------------------------------------------------------------
//  ESTRUTURA DE CALIBRAÇÃO
//  Armazena os offsets e fatores de escala estimados durante a calibração.
//  Esses valores são salvos na NVS e aplicados automaticamente a cada leitura.
//  Você raramente precisará acessar isso diretamente — é uso interno.
// -----------------------------------------------------------------------------
struct CalibracaoIMU {
    // Offsets do giroscópio (rad/s). Idealmente próximos de zero após calibrar.
    float gyro_bias_x;
    float gyro_bias_y;
    float gyro_bias_z;

    // Offsets do acelerômetro (m/s²)
    float accel_bias_x;
    float accel_bias_y;
    float accel_bias_z;

    // Fatores de escala do acelerômetro. Idealmente próximos de 1.0.
    float accel_escala_x;
    float accel_escala_y;
    float accel_escala_z;

    // Offsets do magnetômetro (µT)
    float mag_bias_x;
    float mag_bias_y;
    float mag_bias_z;

    // Fatores de escala do magnetômetro. Idealmente próximos de 1.0.
    float mag_escala_x;
    float mag_escala_y;
    float mag_escala_z;

    // Flag: indica se uma calibração válida foi salva na memória.
    bool calibrado;
};

// =============================================================================
//  DECLARAÇÕES DAS FUNÇÕES PÚBLICAS
//  Estas são as funções que o resto do firmware deve chamar.
// =============================================================================

/**
 * @brief  Inicializa o sensor MPU-9250 e carrega calibração salva.
 *
 * Deve ser chamada UMA VEZ dentro de setup(). Configura I2C, inicializa
 * o sensor, define faixas e taxas, e carrega calibração da NVS (se existir).
 *
 * @return true  se o sensor respondeu e foi configurado corretamente.
 * @return false se houve falha na comunicação. Verifique fiação e endereço I2C.
 */
bool imu_init();

/**
 * @brief  Lê os dados mais recentes do sensor.
 *
 * Deve ser chamada repetidamente no loop principal (ou numa task FreeRTOS).
 * Internamente chama IMU.readSensor() e armazena os valores no buffer interno.
 * Após chamar, use imu_get_dados() para acessar os valores.
 *
 * @return true  se a leitura foi bem-sucedida.
 * @return false em caso de erro de comunicação I2C.
 */
bool imu_update();

/**
 * @brief  Retorna a última leitura válida do sensor.
 *
 * Não faz nova leitura — apenas retorna o que foi capturado na última
 * chamada de imu_update(). Seguro para chamar a qualquer momento.
 *
 * @return DadosIMU struct com acelerômetro, giroscópio, magnetômetro e temperatura.
 */
DadosIMU imu_get_dados();

/**
 * @brief  Retorna os valores de calibração atualmente em uso.
 *
 * Útil para diagnóstico ou para salvar manualmente os valores.
 *
 * @return CalibracaoIMU struct com biases e escalas.
 */
CalibracaoIMU imu_get_calibracao();

/**
 * @brief  Calibra o giroscópio.
 *
 * IMPORTANTE: O robô deve estar completamente parado e no chão antes de chamar.
 * O processo leva alguns segundos. A função bloqueia até terminar.
 * O resultado é salvo automaticamente na NVS.
 *
 * @return true  se a calibração foi concluída com sucesso.
 * @return false em caso de erro.
 */
bool imu_calibrar_gyro();

/**
 * @brief  Calibra o acelerômetro (processo de 6 posições).
 *
 * Guia o usuário pelo Serial para posicionar o robô nas 6 orientações
 * (cada face do cubo apontando para baixo). Pressione Enter entre cada posição.
 * O processo completo leva cerca de 1-2 minutos.
 * O resultado é salvo automaticamente na NVS.
 *
 * @return true  se a calibração foi concluída com sucesso.
 * @return false em caso de erro.
 */
bool imu_calibrar_accel();

/**
 * @brief  Calibra o magnetômetro.
 *
 * IMPORTANTE: Mova o robô lentamente em "figura 8" durante o processo.
 * O processo leva ~15 segundos. A função bloqueia até terminar.
 * Evite proximidade com motores ligados durante esta calibração.
 * O resultado é salvo automaticamente na NVS.
 *
 * @return true  se a calibração foi concluída com sucesso.
 * @return false em caso de erro.
 */
bool imu_calibrar_mag();

/**
 * @brief  Apaga a calibração salva na NVS e reinicia com valores padrão.
 *
 * Use isso se suspeitar que os dados de calibração estão corrompidos
 * ou se mudar a posição de montagem do sensor no robô.
 */
void imu_resetar_calibracao();

/**
 * @brief  Imprime os dados mais recentes formatados no monitor Serial.
 *
 * Útil para debug durante desenvolvimento. Inclui todos os sensores
 * e marca de tempo. Não chama imu_update() — faça isso antes.
 */
void imu_imprimir_dados();

/**
 * @brief  Verifica e processa comandos de calibração via Serial.
 *
 * Deve ser chamada no loop principal. Monitora a Serial por caracteres
 * de comando ('G', 'A', 'M', 'P', 'R') e executa a ação correspondente.
 * Não bloqueia se não houver dados disponíveis.
 */
void imu_processar_serial();

#endif // IMU_H
