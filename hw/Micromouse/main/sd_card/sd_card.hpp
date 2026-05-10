#ifndef SD_CARD_HPP
#define SD_CARD_HPP

#define ARQUIVO_LOG "/sdcard/dados_mouse.csv"

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

struct RobotData {
    uint32_t timestamp_ms;
    int distancia_tof[4];
    float battery_v;
    float battery_i;
    float battery_power;
    float battery_soc;
    float accel_x, accel_y, accel_z;
    float gyro_x, gyro_y, gyro_z;
    int encoder_left;
    int encoder_right;
    float imu_temp;
};

void sdCardInit(QueueHandle_t queue);
bool estaCartaoSDOk(void);

#endif // SD_CARD_HPP
