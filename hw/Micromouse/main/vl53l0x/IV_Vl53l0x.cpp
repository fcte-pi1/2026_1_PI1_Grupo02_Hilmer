#include "vl53l0x/IV_Vl53l0x.hpp"

#include <chrono>
#include <thread>

using namespace std::chrono_literals;

IV_Vl53l0x::IV_Vl53l0x()
    : logger_({.tag = "IV_Vl53l0x", .level = espp::Logger::Verbosity::INFO}) {}

bool IV_Vl53l0x::init() {
    if (initialized_) {
        return true;
    }

    i2c_ = std::make_unique<espp::I2c>(espp::I2c::Config{
        .port = kI2cPort,
        .sda_io_num = kSdaPin,
        .scl_io_num = kSclPin,
        .sda_pullup_en = GPIO_PULLUP_ENABLE,
        .scl_pullup_en = GPIO_PULLUP_ENABLE,
        .clk_speed = kI2cClockHz,
    });

    sensor_ = std::make_unique<espp::Vl53l>(espp::Vl53l::Config{
        .device_address = kAddress,
        .write = std::bind(&espp::I2c::write, i2c_.get(), std::placeholders::_1,
                           std::placeholders::_2, std::placeholders::_3),
        .read = std::bind(&espp::I2c::read, i2c_.get(), std::placeholders::_1,
                          std::placeholders::_2, std::placeholders::_3),
        .log_level = espp::Logger::Verbosity::WARN,
    });

    initialized_ = setupSensor();
    return initialized_;
}

bool IV_Vl53l0x::setupSensor() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    if (!sensor_->set_timing_budget_ms(10, ec)) {
        logger_.error("Failed to set timing budget: {}", ec.message());
        return false;
    }

    if (!sensor_->set_inter_measurement_period_ms(0, ec)) {
        logger_.error("Failed to set inter-measurement period: {}", ec.message());
        return false;
    }

    if (!sensor_->start_ranging(ec)) {
        logger_.error("Failed to start ranging: {}", ec.message());
        return false;
    }

    return true;
}

bool IV_Vl53l0x::startRanging() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    if (!sensor_->start_ranging(ec)) {
        logger_.error("Failed to start ranging: {}", ec.message());
        return false;
    }

    return true;
}

bool IV_Vl53l0x::stopRanging() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    if (!sensor_->stop_ranging(ec)) {
        logger_.error("Failed to stop ranging: {}", ec.message());
        return false;
    }

    return true;
}

bool IV_Vl53l0x::isDataReady() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    bool ready = sensor_->is_data_ready(ec);
    if (ec) {
        logger_.error("Failed to check data ready: {}", ec.message());
    }
    return ready;
}

bool IV_Vl53l0x::clearInterrupt() {
    if (!sensor_) {
        return false;
    }

    std::error_code ec;
    if (!sensor_->clear_interrupt(ec)) {
        logger_.error("Failed to clear interrupt: {}", ec.message());
        return false;
    }

    return true;
}

float IV_Vl53l0x::readDistanceMm() {
    if (!sensor_) {
        return -1.0f;
    }

    std::error_code ec;
    while (!sensor_->is_data_ready(ec)) {
        if (ec) {
            logger_.error("Failed while waiting for data: {}", ec.message());
            return -1.0f;
        }
        std::this_thread::sleep_for(1ms);
    }

    if (!sensor_->clear_interrupt(ec)) {
        logger_.error("Failed to clear interrupt: {}", ec.message());
        return -1.0f;
    }

    float meters = sensor_->get_distance_meters(ec);
    if (ec) {
        logger_.error("Failed to read distance: {}", ec.message());
        return -1.0f;
    }

    return meters * 1000.0f;
}
