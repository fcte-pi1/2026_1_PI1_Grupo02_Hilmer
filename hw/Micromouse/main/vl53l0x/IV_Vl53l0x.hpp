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
#include "../pins.hpp"

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
    // Configuracao fixa do barramento (compartilhado com a bateria)
    static constexpr i2c_port_t kI2cPort = I2C_NUM_0;
    static constexpr gpio_num_t kSdaPin = (gpio_num_t)I2C_SDA_PIN;
    static constexpr gpio_num_t kSclPin = (gpio_num_t)I2C_SCL_PIN;
    static constexpr uint32_t kI2cClockHz = 100000;

    static constexpr uint8_t kAddress = espp::Vl53l::DEFAULT_ADDRESS;

    espp::Logger logger_;
    std::unique_ptr<espp::Vl53l> sensor_;
    i2c_master_dev_handle_t dev_handle_ = nullptr;
    bool initialized_ = false;

    bool setupSensor();
};