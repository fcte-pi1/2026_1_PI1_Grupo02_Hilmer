#pragma once
#include "driver/i2c_types.h"
#include <stdbool.h>

typedef struct {
  bool accel_enabled;
  bool gyro_enabled;
  bool temp_enabled;
  // Which level of filtering to use (0-8); higher numbers are less noisy
  // but have reduced sample rate and increased delay.
  int accel_filter_level;
  // Which level of filtering to use (0-9); higher numbers are less noisy
  // but have reduced sample rate and increased delay.
  int gyro_temp_filter_level;
} mpu9250_config_t;

struct mpu9250_vector3 {
  int x;
  int y;
  int z;
};

typedef struct {
  mpu9250_config_t config;
  struct mpu9250_vector3 accel;
  struct mpu9250_vector3 gyro;
  struct mpu9250_vector3 mag;
  float temp;
  i2c_master_dev_handle_t _handle;
} mpu9250_t;

int mpu9250_begin(mpu9250_t *mpu, const mpu9250_config_t config, int address,
                  i2c_master_bus_handle_t i2c_bus_handle);
int mpu9250_update(mpu9250_t *mpu);
