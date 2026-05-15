idf_component_register(
    SRCS
        "app/main.cpp"
        "i2c_manager.cpp"
        "battery/battery.cpp"
        "motor/motor.cpp"
        "vl53l0x/IV_Vl53l0x.cpp"
        "imu/imu.cpp"
    INCLUDE_DIRS "." "app" "battery" "motor" "vl53l0x" "imu"
    REQUIRES esp_driver_i2c esp_driver_gpio esp_driver_ledc esp_driver_pcnt esp_driver_uart nvs_flash esp_timer truita__mpu9250
)