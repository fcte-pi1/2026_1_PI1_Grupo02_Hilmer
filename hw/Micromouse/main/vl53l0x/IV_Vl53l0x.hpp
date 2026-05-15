#pragma once

#include <cstdint>
#include <functional>
#include <memory>
#include <system_error>

#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "i2c.hpp"
#include "logger.hpp"
#include "vl53l.hpp"
#include "i2c_manager.hpp"

class IV_Vl53l0x {
public:
    IV_Vl53l0x();

    bool init();
    bool startRanging();
    bool stopRanging();

    bool isDataReady();
    bool clearInterrupt();

    float readDistanceMm();

private:
    // Parametros fixos do barramento (compartilhado com a bateria)
    static constexpr i2c_port_t kI2cPort = I2C_NUM_0;
    static constexpr gpio_num_t kSdaPin = I2C_MANAGER_SDA_PIN;
    static constexpr gpio_num_t kSclPin = I2C_MANAGER_SCL_PIN;
    static constexpr uint32_t kI2cClockHz = I2C_MANAGER_DEFAULT_SPEED_HZ;

    static constexpr uint8_t kAddress = I2C_ADDR_VL53L0X_DEFAULT;

    espp::Logger logger_;
    std::unique_ptr<espp::Vl53l> sensor_;
    i2c_master_dev_handle_t dev_handle_ = nullptr;
    bool initialized_ = false;

    bool setupSensor();
};