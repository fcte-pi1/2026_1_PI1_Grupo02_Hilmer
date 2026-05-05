// =============================================================================
//  imu.h — Módulo de IMU para o Micromouse (ESP32 + MPU-9250)
// =============================================================================
//
//  VISÃO GERAL
//  -----------
//  Interface pública do módulo IMU. Atua como o contrato de comunicação entre
//  o hardware (sensor) e a lógica de controle do Micromouse.
//
//  SENSOR UTILIZADO
//  ----------------
//  MPU-9250 (InvenSense): Acelerômetro, Giroscópio e Magnetômetro num único chip.
//  Comunicação operando via I2C nativo do ESP-IDF v6.
//  Biblioteca: https://components.espressif.com/components/truita/mpu9250[cite: 6]
//
//  Adaptado por Vítor Gonçalves de Andrade - 261025182
//  Data: Abril/2026
// =============================================================================

#ifndef IMU_H
#define IMU_H

// -----------------------------------------------------------------------------
//  Mapeamento de Hardware (I2C)
// -----------------------------------------------------------------------------
#define IMU_PIN_SDA  21   // Pino de dados[cite: 6]
#define IMU_PIN_SCL  22   // Pino de clock[cite: 6]

// Endereço I2C do MPU-9250. Padrão 0x68 (AD0 em GND)[cite: 6].
#define IMU_ENDERECO_I2C  0x68

// -----------------------------------------------------------------------------
//  Parâmetros de Operação do Sensor
// -----------------------------------------------------------------------------
#define IMU_FAIXA_ACCEL   MPU9250::ACCEL_RANGE_4G
#define IMU_FAIXA_GYRO    MPU9250::GYRO_RANGE_500DPS
#define IMU_FILTRO_DLPF   MPU9250::DLPF_BANDWIDTH_41HZ
#define IMU_SRD  9   // Taxa de amostragem definida para 100 Hz[cite: 6]

// -----------------------------------------------------------------------------
//  Estruturas de Dados
// -----------------------------------------------------------------------------

// Armazena o estado momentâneo do robô no espaço
struct DadosIMU {
    float accel_x, accel_y, accel_z;   // Aceleração linear (m/s²)[cite: 6]
    float gyro_x, gyro_y, gyro_z;      // Velocidade angular (rad/s)[cite: 6]
    float mag_x, mag_y, mag_z;         // Campo magnético (µT)[cite: 6]
    float temperatura;                 // Temperatura do silício (°C)[cite: 6]
    unsigned long timestamp_ms;        // Referência temporal da leitura[cite: 6]
};

// Armazena as correções de erro (bias) estático dos sensores
struct CalibracaoIMU {
    float gyro_bias_x, gyro_bias_y, gyro_bias_z;
    float accel_bias_x, accel_bias_y, accel_bias_z;
    float accel_escala_x, accel_escala_y, accel_escala_z;
    float mag_bias_x, mag_bias_y, mag_bias_z;
    float mag_escala_x, mag_escala_y, mag_escala_z;
    bool calibrado;
};

// -----------------------------------------------------------------------------
//  Assinaturas Públicas
// -----------------------------------------------------------------------------
bool imu_init();
bool imu_update();
DadosIMU imu_get_dados();
CalibracaoIMU imu_get_calibracao();
bool imu_calibrar_gyro();
bool imu_calibrar_accel();
bool imu_calibrar_mag();
void imu_resetar_calibracao();
void imu_imprimir_dados();
void imu_processar_serial();

#endif // IMU_H