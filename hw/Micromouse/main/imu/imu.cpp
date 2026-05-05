#include "imu.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2c_master.h" // API I2C do ESP-IDF v6+[cite: 7]

// O bloco extern "C" impede que o compilador C++ altere o nome das funções
// da biblioteca Truita, garantindo a linkagem correta na hora do build[cite: 7].
extern "C" {
#include "mpu9250.h"           // Header da biblioteca truita/mpu9250 em C[cite: 7]
}
#include <stdio.h>
#include <sys/select.h>
#include <unistd.h>

static const char* TAG = "IMU";

// Handles de controle do hardware
static mpu9250_t mpu_device = {};
static i2c_master_bus_handle_t i2c_bus_handle; // Ponteiro nativo para o barramento I2C[cite: 7]

static DadosIMU dados_atuais = {};
static CalibracaoIMU calibracao_atual = {};
static bool sensor_pronto = false;

// Chaves de acesso para o sistema de arquivos NVS (Non-Volatile Storage)
static const char* NVS_NAMESPACE = "micromouse_imu";
static const char* NVS_BLOB_KEY  = "calib_data";

// =============================================================================
//  Gerenciamento de Memória Não-Volátil (NVS)
// =============================================================================

static void salvar_calibracao_na_nvs() {
    nvs_handle_t nvs_handle;
    if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &nvs_handle) != ESP_OK) return;

    calibracao_atual.calibrado = true;
    
    // Serializa a struct inteira em um "Blob" (Binary Large Object) e grava de 
    // uma só vez. Isso economiza tempo de CPU e ciclos de escrita da Flash[cite: 7].
    if (nvs_set_blob(nvs_handle, NVS_BLOB_KEY, &calibracao_atual, sizeof(CalibracaoIMU)) == ESP_OK) {
        nvs_commit(nvs_handle); // Efetiva a gravação física no chip[cite: 7]
        ESP_LOGI(TAG, "Calibração salva na NVS com sucesso.");
    }
    nvs_close(nvs_handle);
}

static bool carregar_calibracao_da_nvs() {
    nvs_handle_t nvs_handle;
    if (nvs_open(NVS_NAMESPACE, NVS_READONLY, &nvs_handle) != ESP_OK) return false;

    size_t required_size = sizeof(CalibracaoIMU);
    // Tenta ler o bloco contíguo de memória e jogar direto para dentro da struct
    esp_err_t err = nvs_get_blob(nvs_handle, NVS_BLOB_KEY, &calibracao_atual, &required_size);
    nvs_close(nvs_handle);

    if (err == ESP_OK && required_size == sizeof(CalibracaoIMU)) {
        ESP_LOGI(TAG, "Calibração carregada da memória.");
        return true;
    }
    return false;
}

// =============================================================================
//  Rotinas de Inicialização e Leitura
// =============================================================================

bool imu_init() {
    ESP_LOGI(TAG, "Iniciando módulo IMU e barramento I2C...");

    // 1. Configuração de baixo nível do barramento I2C (padrão v6)
    i2c_master_bus_config_t i2c_mst_config = {};
    i2c_mst_config.i2c_port = I2C_NUM_0;                 // Usa a controladora I2C 0[cite: 7]
    i2c_mst_config.sda_io_num = (gpio_num_t)IMU_PIN_SDA; // Casting para o tipo nativo[cite: 7]
    i2c_mst_config.scl_io_num = (gpio_num_t)IMU_PIN_SCL;
    i2c_mst_config.clk_source = I2C_CLK_SRC_DEFAULT;     // Clock derivado da APB[cite: 7]
    i2c_mst_config.glitch_ignore_cnt = 7;                // Filtro digital contra ruído[cite: 7]
    i2c_mst_config.flags.enable_internal_pullup = true;  // Ativa resistores internos[cite: 7]

    // Registra o barramento no kernel do ESP-IDF
    ESP_ERROR_CHECK(i2c_new_master_bus(&i2c_mst_config, &i2c_bus_handle));

    // 2. Configuração lógica do sensor MPU9250
    mpu9250_config_t config = {
        .accel_enabled = true,
        .gyro_enabled = true,
        .temp_enabled = true,
        .accel_filter_level = 0,
        .gyro_temp_filter_level = 0,
    };

    // Vincula a struct do MPU ao barramento I2C recém-criado
    if (mpu9250_begin(&mpu_device, config, IMU_ENDERECO_I2C, i2c_bus_handle) != ESP_OK) {
        ESP_LOGE(TAG, "Falha ao inicializar o MPU9250.");
        return false;
    }

    carregar_calibracao_da_nvs();

    sensor_pronto = true;
    ESP_LOGI(TAG, "Módulo IMU pronto! ✓");
    return true;
}

bool imu_update() {
    if (!sensor_pronto) return false;

    // Dispara a leitura I2C. Retorna erro se o sensor desconectar durante a corrida.
    if (mpu9250_update(&mpu_device) != ESP_OK) {
        return false;
    }

    // Aplica as compensações de bias calculadas durante a calibração
    dados_atuais.accel_x = (float)mpu_device.accel.x - calibracao_atual.accel_bias_x;
    dados_atuais.accel_y = (float)mpu_device.accel.y - calibracao_atual.accel_bias_y;
    dados_atuais.accel_z = (float)mpu_device.accel.z - calibracao_atual.accel_bias_z;

    dados_atuais.gyro_x  = (float)mpu_device.gyro.x - calibracao_atual.gyro_bias_x;
    dados_atuais.gyro_y  = (float)mpu_device.gyro.y - calibracao_atual.gyro_bias_y;
    dados_atuais.gyro_z  = (float)mpu_device.gyro.z - calibracao_atual.gyro_bias_z;

    dados_atuais.mag_x = (float)mpu_device.mag.x - calibracao_atual.mag_bias_x;
    dados_atuais.mag_y = (float)mpu_device.mag.y - calibracao_atual.mag_bias_y;
    dados_atuais.mag_z = (float)mpu_device.mag.z - calibracao_atual.mag_bias_z;

    dados_atuais.temperatura = mpu_device.temp;
    dados_atuais.timestamp_ms = esp_timer_get_time() / 1000; // Tempo absoluto desde o boot[cite: 7]

    return true;
}

DadosIMU imu_get_dados() { return dados_atuais; }

// =============================================================================
//  Rotinas de Calibração
// =============================================================================

bool imu_calibrar_gyro() {
    ESP_LOGI(TAG, "Coletando amostras do giroscópio (mantenha parado)...");
    
    float sum_x = 0, sum_y = 0, sum_z = 0;
    int amostras = 500;

    // Acumula 500 leituras consecutivas para extrair o erro sistemático (bias)
    for (int i = 0; i < amostras; i++) {
        if (mpu9250_update(&mpu_device) != ESP_OK) {
            return false;
        }
        sum_x += mpu_device.gyro.x;
        sum_y += mpu_device.gyro.y;
        sum_z += mpu_device.gyro.z;
        vTaskDelay(pdMS_TO_TICKS(5)); // Cede tempo de CPU para o RTOS não travar[cite: 7]
    }

    // Calcula a média aritmética do erro em repouso
    calibracao_atual.gyro_bias_x = sum_x / amostras;
    calibracao_atual.gyro_bias_y = sum_y / amostras;
    calibracao_atual.gyro_bias_z = sum_z / amostras;

    ESP_LOGI(TAG, "Bias Gyro X: %.2f | Y: %.2f | Z: %.2f", 
             calibracao_atual.gyro_bias_x, calibracao_atual.gyro_bias_y, calibracao_atual.gyro_bias_z);

    salvar_calibracao_na_nvs();
    return true;
}

void imu_processar_serial() {
    // A implementação da interrupção do terminal UART (POSIX select) entra aqui.
}