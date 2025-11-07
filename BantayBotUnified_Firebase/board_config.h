/**
 * BantayBot Main Board ESP32 Configuration
 * ESP32 DevKit v1 Board Pin Definitions
 */

#ifndef BOARD_CONFIG_H
#define BOARD_CONFIG_H

// Note: MainBoard ESP32 does not have camera
// This file is for consistency with the Camera board structure
// Pin definitions for main board peripherals are in the main .ino file

// Reserved GPIO pins on ESP32 DevKit
// GPIO 0  - Boot mode (pulled up)
// GPIO 1  - TX (Serial/USB)
// GPIO 2  - Must be low during boot
// GPIO 3  - RX (Serial/USB)
// GPIO 5  - Must be high during boot
// GPIO 6-11 - Flash memory (do not use)
// GPIO 12 - Must be low during boot
// GPIO 15 - Must be high during boot

// Available GPIO pins for general use:
// GPIO 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39

// Currently used pins (see main sketch):
// GPIO 4  - RS485 RE/DE
// GPIO 16 - RS485 TX (TXD2)
// GPIO 17 - RS485 RX (RXD2)
// GPIO 21 - I2C SDA (PCA9685)
// GPIO 22 - I2C SCL (PCA9685)
// Other pins used by DFPlayer, stepper motor, PIR sensor

#endif // BOARD_CONFIG_H
