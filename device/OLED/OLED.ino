/*
 *  This sketch prints formated data on OLED display.
 */

#include <Wire.h>
#include "SSD1306.h" 


SSD1306  display(0x3c, D3, D5);
// SH1106 display(0x3c, D3, D5);

void setup() {
  Serial.begin(9600);
  display.init();
  display.flipScreenVertically();
  display.setFont(ArialMT_Plain_10);
}

void loop() {
  // clear the display
  display.clear();
  // draw the current demo method
    display.setTextAlignment(TEXT_ALIGN_LEFT);
    display.setFont(ArialMT_Plain_10);
    display.drawString(0, 2, "Connected (Dlink_Router)");
    display.setFont(ArialMT_Plain_16);
    display.drawString(0, 18, "Connecting...");
    display.setFont(ArialMT_Plain_10);
    display.drawString(0, 35, "Dlink_Router");
    //  progressBar();
  // write the buffer to the display
  display.display();
delay(10000);
}


