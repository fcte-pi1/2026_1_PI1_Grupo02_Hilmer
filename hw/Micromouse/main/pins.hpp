#pragma once

#include "driver/gpio.h"

// I2C (IMU, INA226, VL53L0X)
#define I2C_SDA_PIN GPIO_NUM_21
#define I2C_SCL_PIN GPIO_NUM_22

// SD (SPI)
#define SD_SCK_PIN  GPIO_NUM_14
#define SD_MISO_PIN GPIO_NUM_12
#define SD_MOSI_PIN GPIO_NUM_13
#define SD_CS_PIN   GPIO_NUM_15

// Motor
#define MOTOR_STBY_PIN GPIO_NUM_4
