#include "FreeRTOSConfig.h"
#include "driver/i2c_master.h"
#include "esp_err.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <mpu9250.h>

#define SCL_PIN 21
#define SDA_PIN 22

static const char *TAG = "mpu_example";

void vImuTask(void *pvParameters) {
  i2c_master_bus_config_t bus_config = {.clk_source = I2C_CLK_SRC_DEFAULT,
                                        .i2c_port = I2C_NUM_0,
                                        .scl_io_num = SCL_PIN,
                                        .sda_io_num = SDA_PIN,
                                        .glitch_ignore_cnt = 7,
                                        .flags.enable_internal_pullup = true};
  i2c_master_bus_handle_t bus_handle;
  ESP_ERROR_CHECK(i2c_new_master_bus(&bus_config, &bus_handle));

  mpu9250_t mpu;
  mpu9250_config_t mpu_config = {.gyro_enabled = 1,
                                 .accel_enabled = 1,
                                 .temp_enabled = 1,
                                 .accel_filter_level = 6,
                                 .gyro_temp_filter_level = 6};
  ESP_ERROR_CHECK(mpu9250_begin(&mpu, mpu_config, 0x68, bus_handle));

  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xFrequency = 32 * configTICK_RATE_HZ / 1000; // 32kHz
  for (;;) {
    xTaskDelayUntil(&xLastWakeTime, xFrequency);

    if (mpu9250_update(&mpu) == 1) {
      ESP_LOGI(TAG, "GYRO => X: %d, Y: %d, Z: %d", mpu.gyro.x, mpu.gyro.y,
               mpu.gyro.z);
      ESP_LOGI(TAG, "ACCEL => X: %d, Y: %d, Z: %d", mpu.accel.x, mpu.accel.y,
               mpu.accel.z);
      ESP_LOGI(TAG, "TEMP: %f", mpu.temp);
    }
  }
}

void app_main(void) { xTaskCreate(vImuTask, "IMU", 2500, NULL, 1, NULL); }
