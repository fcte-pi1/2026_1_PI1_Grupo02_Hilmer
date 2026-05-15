#include <cstdio>
#include <cstring>

#include "battery/battery.hpp"
#include "driver/ledc.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "imu.h"
#include "motor/motor.hpp"
#include "pins.hpp"
#include "vl53l0x/IV_Vl53l0x.hpp"

namespace {

Battery g_battery;
IV_Vl53l0x g_tof;
Motor *g_motor_left = nullptr;
Motor *g_motor_right = nullptr;
volatile float g_tof_distance_mm = -1.0f;

struct BatterySnapshot {
    float voltage;
    float current;
    float power;
    float soc;
};

struct ImuSnapshot {
    DadosIMU data;
    bool valid;
};

portMUX_TYPE g_battery_snapshot_mux = portMUX_INITIALIZER_UNLOCKED;
portMUX_TYPE g_imu_snapshot_mux = portMUX_INITIALIZER_UNLOCKED;
BatterySnapshot g_battery_snapshot = {};
DadosIMU g_imu_snapshot = {};
bool g_imu_snapshot_valid = false;


void cacheBatterySnapshot() {
    portENTER_CRITICAL(&g_battery_snapshot_mux);
    g_battery_snapshot = {
        g_battery.getVoltageFiltered(),
        g_battery.getCurrentFiltered(),
        g_battery.getPowerFiltered(),
        g_battery.getSOC(),
    };
    portEXIT_CRITICAL(&g_battery_snapshot_mux);
}


void cacheImuSnapshot(const DadosIMU &dados) {
    portENTER_CRITICAL(&g_imu_snapshot_mux);
    g_imu_snapshot = dados;
    g_imu_snapshot_valid = true;
    portEXIT_CRITICAL(&g_imu_snapshot_mux);
}


void battery_task(void *) {
    const TickType_t delay = pdMS_TO_TICKS(500);

    while (true) {
        g_battery.update();
        cacheBatterySnapshot();

        BatterySnapshot snapshot = {};
        portENTER_CRITICAL(&g_battery_snapshot_mux);
        snapshot = g_battery_snapshot;
        portEXIT_CRITICAL(&g_battery_snapshot_mux);

        std::printf("Battery -> V: %.2f I: %.2f P: %.2f SOC: %.1f%%\n",
                    snapshot.voltage,
                    snapshot.current,
                    snapshot.power,
                    snapshot.soc);
        vTaskDelay(delay);
    }
}

void imu_task(void *) {
    const TickType_t delay = pdMS_TO_TICKS(100);

    while (true) {
        if (imu_update()) {
            const DadosIMU dados = imu_get_dados();
            cacheImuSnapshot(dados);
            std::printf("IMU -> Accel[%.2f %.2f %.2f] Gyro[%.2f %.2f %.2f] Temp: %.2f\n",
                        dados.accel_x, dados.accel_y, dados.accel_z,
                        dados.gyro_x, dados.gyro_y, dados.gyro_z,
                        dados.temperatura);
        } else {
            std::printf("Falha ao atualizar IMU\n");
        }

        vTaskDelay(delay);
    }
}

void tof_task(void *) {
    const TickType_t delay = pdMS_TO_TICKS(200);

    while (true) {
        const float distance_mm = g_tof.readDistanceMm();
        g_tof_distance_mm = distance_mm;
        std::printf("VL53L0X -> Distancia: %.2f mm\n", distance_mm);
        vTaskDelay(delay);
    }
}


void motor_task(void *) {
    const TickType_t delay = pdMS_TO_TICKS(250);

    // Log simples dos encoders ate a logica de movimento ficar pronta.
    while (true) {
        if (g_motor_left && g_motor_right) {
            const int enc_left = g_motor_left->getEncoderCount();
            const int enc_right = g_motor_right->getEncoderCount();
            std::printf("Motors -> Left encoder: %d | Right encoder: %d\n", enc_left, enc_right);
        }
        vTaskDelay(delay);
    }
}


extern "C" void app_main(void) {
    std::printf("=== Micromouse Startup ===\n");
    std::printf("Inicializando módulos...\n");

    // Inicializacao dos sensores I2C compartilhados.
    if (!g_battery.init()) {
        std::printf("[ERRO] Falha ao inicializar bateria\n");
        return;
    }
    std::printf("[OK] Bateria inicializada\n");

    if (!imu_init()) {
        std::printf("[ERRO] Falha ao inicializar IMU\n");
        return;
    }
    std::printf("[OK] IMU inicializada\n");

    if (!g_tof.init()) {
        std::printf("[ERRO] Falha ao inicializar VL53L0X\n");
        return;
    }
    std::printf("[OK] VL53L0X inicializado\n");

    if (!g_tof.startRanging()) {
        std::printf("[ERRO] Falha ao iniciar ranging do VL53L0X\n");
        return;
    }
    std::printf("[OK] VL53L0X ranging iniciado\n");

    // Inicializacao do PWM e dos motores.
    ledc_timer_config_t ledc_timer = {};
    ledc_timer.speed_mode = LEDC_LOW_SPEED_MODE;
    ledc_timer.timer_num = LEDC_TIMER_0;
    ledc_timer.duty_resolution = LEDC_TIMER_10_BIT;
    ledc_timer.freq_hz = 20000;
    ledc_timer.clk_cfg = LEDC_AUTO_CLK;
    if (ledc_timer_config(&ledc_timer) != ESP_OK) {
        std::printf("[ERRO] Falha ao configurar PWM timer\n");
        return;
    }
    std::printf("[OK] PWM timer configurado\n");

    // Motor esquerdo (PWM, direcao, standby e encoders).
    g_motor_left = new Motor(MOTOR_LEFT_PWM_PIN,
                             MOTOR_LEFT_IN1_PIN,
                             MOTOR_LEFT_IN2_PIN,
                             (int)MOTOR_STBY_PIN,
                             MOTOR_LEFT_ENC_A_PIN,
                             MOTOR_LEFT_ENC_B_PIN,
                             LEDC_CHANNEL_0);
    g_motor_left->begin();
    std::printf("[OK] Motor esquerdo inicializado\n");

    // Motor direito (PWM, direcao, standby e encoders).
    g_motor_right = new Motor(MOTOR_RIGHT_PWM_PIN,
                              MOTOR_RIGHT_IN1_PIN,
                              MOTOR_RIGHT_IN2_PIN,
                              (int)MOTOR_STBY_PIN,
                              MOTOR_RIGHT_ENC_A_PIN,
                              MOTOR_RIGHT_ENC_B_PIN,
                              LEDC_CHANNEL_1);
    g_motor_right->begin();
    std::printf("[OK] Motor direito inicializado\n");

    // Criacao das tasks de cada subsistema.
    std::printf("\nLançando tasks...\n");

    xTaskCreatePinnedToCore(battery_task, "battery_task", 4096, nullptr, 3, nullptr, 1);
    std::printf("[OK] Task de bateria criada\n");

    xTaskCreatePinnedToCore(imu_task, "imu_task", 4096, nullptr, 3, nullptr, 1);
    std::printf("[OK] Task de IMU criada\n");

    xTaskCreatePinnedToCore(tof_task, "tof_task", 4096, nullptr, 3, nullptr, 1);
    std::printf("[OK] Task de ToF criada\n");

    xTaskCreatePinnedToCore(motor_task, "motor_task", 4096, nullptr, 3, nullptr, 0);
    std::printf("[OK] Task de motores criada\n");

    std::printf("\n=== Sistema Pronto ===\n");
    std::printf("Micromouse executando em multithread.\n\n");

    // Task raiz fica bloqueada.
    while (true) {
        vTaskDelay(portMAX_DELAY);
    }
}
} // namespace