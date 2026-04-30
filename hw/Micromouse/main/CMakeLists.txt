idf_component_register(
    SRCS "battery.cpp" "main.cpp"
    INCLUDE_DIRS "."
    REQUIRES esp_driver_i2c
)